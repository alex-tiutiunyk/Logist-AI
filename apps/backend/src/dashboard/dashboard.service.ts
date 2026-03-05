import { Injectable } from '@nestjs/common';
import { TripStatus, TruckStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.EN_ROUTE,
  TripStatus.ARRIVED_ORIGIN,
  TripStatus.LOADING,
  TripStatus.DEPARTED_ORIGIN,
  TripStatus.ARRIVED_DEST,
  TripStatus.UNLOADING,
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeTrips, idleTrucks, lateRiskAlerts, completedToday, terminalArrivals] =
      await Promise.all([
        // Active trips count
        this.prisma.trip.count({ where: { status: { in: ACTIVE_TRIP_STATUSES } } }),

        // Idle trucks count
        this.prisma.truck.count({ where: { status: TruckStatus.IDLE } }),

        // Unacknowledged late-risk alerts
        this.prisma.alert.count({
          where: { type: 'LATE_RISK', acknowledgedAt: null },
        }),

        // Margin today (completed trips)
        this.prisma.trip.aggregate({
          where: {
            status: TripStatus.COMPLETED,
            updatedAt: { gte: todayStart },
          },
          _sum: { marginComputed: true },
        }),

        // Avg dwell time: terminal arrival events from today
        this.prisma.terminalEvent.findMany({
          where: {
            type: 'ARRIVED',
            at: { gte: todayStart },
          },
          include: {
            trip: { select: { status: true } },
          },
        }),
      ]);

    // Compute avg dwell: for completed arrivals today, find the DEPARTED event
    // Simple approximation: avg time between ARRIVED and next DEPARTED/LOADING_FINISHED
    let avgDwellMinutes = 0;
    if (terminalArrivals.length > 0) {
      const dwells: number[] = [];
      for (const arrival of terminalArrivals) {
        const departed = await this.prisma.terminalEvent.findFirst({
          where: {
            tripId: arrival.tripId,
            terminalId: arrival.terminalId,
            type: { in: ['DEPARTED', 'LOADING_FINISHED', 'UNLOADING_FINISHED'] },
            at: { gt: arrival.at },
          },
          orderBy: { at: 'asc' },
        });
        if (departed) {
          dwells.push((departed.at.getTime() - arrival.at.getTime()) / 60_000);
        }
      }
      if (dwells.length > 0) {
        avgDwellMinutes = Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length);
      }
    }

    return {
      activeTrips,
      idleTrucks,
      lateRisk: lateRiskAlerts,
      avgDwellMinutes,
      marginToday: Math.round(completedToday._sum.marginComputed ?? 0),
    };
  }

  /**
   * Returns enriched truck data for the dashboard live table.
   * Includes current active trip, ETA drift, risk badges.
   */
  async getTruckTable(filters?: {
    status?: TruckStatus;
    terminalId?: string;
    risk?: string;
    search?: string;
  }) {
    const trucks = await this.prisma.truck.findMany({
      where: {
        ...(filters?.status && { status: filters?.status }),
        ...(filters?.terminalId && { lastTerminalId: filters?.terminalId }),
      },
      include: {
        lastTerminal: { select: { id: true, name: true } },
        trips: {
          where: { status: { in: ACTIVE_TRIP_STATUSES } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            driver: { select: { id: true, name: true } },
            originTerminal: { select: { id: true, name: true } },
            destinationTerminal: { select: { id: true, name: true } },
          },
        },
        alerts: {
          where: { acknowledgedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, severity: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const now = new Date();

    const rows = trucks.map((truck) => {
      const activeTrip = truck.trips[0] ?? null;
      const latestAlert = truck.alerts[0] ?? null;

      // Compute risk badge
      let risk: 'LATE' | 'DWELL' | 'NONE' = 'NONE';
      if (latestAlert?.type === 'LATE_RISK') risk = 'LATE';
      else if (latestAlert?.type === 'DWELL_RISK') risk = 'DWELL';

      // ETA display
      let eta: string | null = null;
      let etaDriftMinutes = 0;
      if (activeTrip?.plannedEtaAt) {
        eta = activeTrip.plannedEtaAt.toISOString();
        if (activeTrip.actualEtaAt) {
          etaDriftMinutes = Math.round(
            (activeTrip.actualEtaAt.getTime() - activeTrip.plannedEtaAt.getTime()) / 60_000,
          );
        } else if (
          activeTrip.status === TripStatus.EN_ROUTE ||
          activeTrip.status === TripStatus.DEPARTED_ORIGIN
        ) {
          // If ETA is past → compute drift from now
          const drift = now.getTime() - activeTrip.plannedEtaAt.getTime();
          if (drift > 0) etaDriftMinutes = Math.round(drift / 60_000);
        }
      }

      return {
        truckId: truck.id,
        code: truck.code,
        status: truck.status,
        lastTerminal: truck.lastTerminal,
        activeTrip: activeTrip
          ? {
              id: activeTrip.id,
              code: (activeTrip as typeof activeTrip & { code?: string }).code,
              status: activeTrip.status,
              plannedEtaAt: activeTrip.plannedEtaAt,
              actualEtaAt: activeTrip.actualEtaAt,
              etaDriftMinutes,
              originTerminal: activeTrip.originTerminal,
              destinationTerminal: activeTrip.destinationTerminal,
              driver: activeTrip.driver,
            }
          : null,
        risk,
        eta,
      };
    });

    // Apply risk and search filters (post-query, simpler than complex Prisma OR)
    return rows.filter((row) => {
      if (filters?.risk && filters.risk !== 'ALL' && row.risk !== filters.risk) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const match =
          row.code.toLowerCase().includes(q) ||
          (row.activeTrip?.driver?.name ?? '').toLowerCase().includes(q) ||
          (row.activeTrip?.code ?? '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }
}
