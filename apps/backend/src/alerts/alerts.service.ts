import { Injectable } from '@nestjs/common';
import { AlertSeverity, AlertType, TripStatus, TruckStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

const LATE_THRESHOLD_MINUTES = 30;
const IDLE_THRESHOLD_HOURS = 6;

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
  ) {}

  findAll(includeAcknowledged = false) {
    return this.prisma.alert.findMany({
      where: includeAcknowledged ? {} : { acknowledgedAt: null },
      include: {
        truck: { select: { id: true, code: true } },
        trip: { select: { id: true, code: true } },
        terminal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledge(id: string) {
    const alert = await this.prisma.alert.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
      include: {
        truck: { select: { id: true, code: true } },
        trip: { select: { id: true, code: true } },
        terminal: { select: { id: true, name: true } },
      },
    });
    this.gateway.emitAlertUpdated(alert.id);
    return alert;
  }

  /**
   * Main alert evaluation — called by the background job every 5 minutes.
   * Checks for:
   *  1. Late-risk trips (ETA overdue > LATE_THRESHOLD_MINUTES)
   *  2. Dwell-risk trips (time at terminal > terminal SLA)
   *  3. Idle trucks (idle for > IDLE_THRESHOLD_HOURS hours)
   *
   * Avoids duplicate alerts by checking if an unacked alert of the same
   * type + entity already exists.
   */
  async evaluateAlerts() {
    const now = new Date();
    const created: string[] = [];

    // ── 1. Late-risk trips ────────────────────────────────────────────────
    const activeTrips = await this.prisma.trip.findMany({
      where: {
        status: {
          in: [TripStatus.EN_ROUTE, TripStatus.DEPARTED_ORIGIN],
        },
        plannedEtaAt: { lt: new Date(now.getTime() - LATE_THRESHOLD_MINUTES * 60_000) },
      },
    });

    for (const trip of activeTrips) {
      const existing = await this.prisma.alert.findFirst({
        where: { tripId: trip.id, type: AlertType.LATE_RISK, acknowledgedAt: null },
      });
      if (existing) continue;

      const overMinutes = Math.round((now.getTime() - trip.plannedEtaAt.getTime()) / 60_000);
      const alert = await this.prisma.alert.create({
        data: {
          type: AlertType.LATE_RISK,
          severity: AlertSeverity.WARNING,
          tripId: trip.id,
          truckId: trip.truckId ?? null,
          message: `Trip ${trip.code} is ${overMinutes} min past planned ETA.`,
        },
      });
      this.gateway.emitAlertCreated(alert.id, AlertType.LATE_RISK, alert.message);
      created.push(alert.id);
    }

    // ── 2. Dwell-risk: trucks at terminals exceeding SLA ──────────────────
    const terminalArrivals = await this.prisma.terminalEvent.findMany({
      where: {
        type: 'ARRIVED',
        trip: { status: { in: [TripStatus.ARRIVED_ORIGIN, TripStatus.LOADING, TripStatus.ARRIVED_DEST, TripStatus.UNLOADING] } },
      },
      include: {
        terminal: true,
        trip: true,
        truck: { select: { id: true, code: true } },
      },
      orderBy: { at: 'desc' },
    });

    // Deduplicate by tripId (latest arrival event per trip)
    const seenTrips = new Set<string>();
    for (const event of terminalArrivals) {
      if (seenTrips.has(event.tripId)) continue;
      seenTrips.add(event.tripId);

      const dwellMinutes = (now.getTime() - event.at.getTime()) / 60_000;
      if (dwellMinutes <= event.terminal.slaMinutes) continue;

      const existing = await this.prisma.alert.findFirst({
        where: {
          tripId: event.tripId,
          terminalId: event.terminalId,
          type: AlertType.DWELL_RISK,
          acknowledgedAt: null,
        },
      });
      if (existing) continue;

      const alert = await this.prisma.alert.create({
        data: {
          type: AlertType.DWELL_RISK,
          severity: AlertSeverity.CRITICAL,
          tripId: event.tripId,
          truckId: event.truckId ?? null,
          terminalId: event.terminalId,
          message: `Truck ${event.truck?.code ?? '?'} at ${event.terminal.name} exceeded SLA by ${Math.round(dwellMinutes - event.terminal.slaMinutes)} min.`,
        },
      });
      this.gateway.emitAlertCreated(alert.id, AlertType.DWELL_RISK, alert.message);
      created.push(alert.id);
    }

    // ── 3. Idle trucks > threshold ────────────────────────────────────────
    const idleCutoff = new Date(now.getTime() - IDLE_THRESHOLD_HOURS * 3_600_000);
    const idleTrucks = await this.prisma.truck.findMany({
      where: { status: TruckStatus.IDLE, updatedAt: { lt: idleCutoff } },
    });

    for (const truck of idleTrucks) {
      const existing = await this.prisma.alert.findFirst({
        where: { truckId: truck.id, type: AlertType.IDLE_TOO_LONG, acknowledgedAt: null },
      });
      if (existing) continue;

      const idleHours = Math.round((now.getTime() - truck.updatedAt.getTime()) / 3_600_000);
      const alert = await this.prisma.alert.create({
        data: {
          type: AlertType.IDLE_TOO_LONG,
          severity: AlertSeverity.INFO,
          truckId: truck.id,
          message: `Truck ${truck.code} has been idle for ${idleHours}+ hours.`,
        },
      });
      this.gateway.emitAlertCreated(alert.id, AlertType.IDLE_TOO_LONG, alert.message);
      created.push(alert.id);
    }

    return { evaluated: true, created: created.length };
  }
}
