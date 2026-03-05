import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TripStatus, TruckStatus, TerminalEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { TrucksService } from '../trucks/trucks.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { SuggestTruckDto } from './dto/suggest-truck.dto';

// Statuses considered "active" (truck is busy)
const ACTIVE_STATUSES: TripStatus[] = [
  TripStatus.EN_ROUTE,
  TripStatus.ARRIVED_ORIGIN,
  TripStatus.LOADING,
  TripStatus.DEPARTED_ORIGIN,
  TripStatus.ARRIVED_DEST,
  TripStatus.UNLOADING,
];

// Valid next statuses for each current status
const STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNED: [TripStatus.EN_ROUTE, TripStatus.CANCELED],
  EN_ROUTE: [TripStatus.ARRIVED_ORIGIN, TripStatus.ARRIVED_DEST, TripStatus.CANCELED],
  ARRIVED_ORIGIN: [TripStatus.LOADING, TripStatus.CANCELED],
  LOADING: [TripStatus.DEPARTED_ORIGIN, TripStatus.CANCELED],
  DEPARTED_ORIGIN: [TripStatus.ARRIVED_DEST, TripStatus.CANCELED],
  ARRIVED_DEST: [TripStatus.UNLOADING, TripStatus.CANCELED],
  UNLOADING: [TripStatus.COMPLETED, TripStatus.CANCELED],
  COMPLETED: [],
  CANCELED: [],
};

let tripCounter = 61; // Seed goes up to 60

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
    private trucksService: TrucksService,
  ) {}

  async findAll(filters?: {
    status?: TripStatus;
    terminalId?: string;
    search?: string;
  }) {
    return this.prisma.trip.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.terminalId && {
          OR: [
            { originTerminalId: filters.terminalId },
            { destinationTerminalId: filters.terminalId },
          ],
        }),
        ...(filters?.search && {
          OR: [
            { code: { contains: filters.search, mode: 'insensitive' } },
            { truck: { code: { contains: filters.search, mode: 'insensitive' } } },
            { driver: { name: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        truck: { select: { id: true, code: true, status: true } },
        driver: { select: { id: true, name: true } },
        originTerminal: { select: { id: true, name: true, type: true } },
        destinationTerminal: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        truck: true,
        driver: true,
        originTerminal: true,
        destinationTerminal: true,
        terminalEvents: { orderBy: { at: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async create(dto: CreateTripDto) {
    const code = `TR-${String(tripCounter++).padStart(4, '0')}`;
    const margin = dto.rateIncome - dto.fuelCostEst - (dto.otherCostEst ?? 0);

    const trip = await this.prisma.trip.create({
      data: {
        code,
        originTerminalId: dto.originTerminalId,
        destinationTerminalId: dto.destinationTerminalId,
        truckId: dto.truckId ?? null,
        driverId: dto.driverId ?? null,
        status: TripStatus.PLANNED,
        plannedStartAt: new Date(dto.plannedStartAt),
        plannedEtaAt: new Date(dto.plannedEtaAt),
        distanceKm: dto.distanceKm ?? null,
        cargoWeightKg: dto.cargoWeightKg ?? null,
        rateIncome: dto.rateIncome,
        fuelCostEst: dto.fuelCostEst,
        otherCostEst: dto.otherCostEst ?? 0,
        marginComputed: margin,
      },
      include: {
        truck: { select: { id: true, code: true } },
        driver: { select: { id: true, name: true } },
        originTerminal: { select: { id: true, name: true } },
        destinationTerminal: { select: { id: true, name: true } },
      },
    });

    this.gateway.emitTripUpdated(trip.id);
    return trip;
  }

  async updateStatus(id: string, newStatus: TripStatus) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { truck: true },
    });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);

    const allowed = STATUS_TRANSITIONS[trip.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${trip.status} to ${newStatus}`,
      );
    }

    // Determine truck status and terminal context
    let newTruckStatus: TruckStatus | null = null;
    let terminalId: string | null = null;
    let eventType: TerminalEventType | null = null;

    switch (newStatus) {
      case TripStatus.EN_ROUTE:
        newTruckStatus = TruckStatus.EN_ROUTE;
        break;
      case TripStatus.ARRIVED_ORIGIN:
        newTruckStatus = TruckStatus.IDLE; // waiting at terminal
        terminalId = trip.originTerminalId;
        eventType = TerminalEventType.ARRIVED;
        break;
      case TripStatus.LOADING:
        newTruckStatus = TruckStatus.LOADING;
        terminalId = trip.originTerminalId;
        eventType = TerminalEventType.LOADING_STARTED;
        break;
      case TripStatus.DEPARTED_ORIGIN:
        newTruckStatus = TruckStatus.EN_ROUTE;
        terminalId = trip.originTerminalId;
        eventType = TerminalEventType.DEPARTED;
        break;
      case TripStatus.ARRIVED_DEST:
        newTruckStatus = TruckStatus.IDLE;
        terminalId = trip.destinationTerminalId;
        eventType = TerminalEventType.ARRIVED;
        break;
      case TripStatus.UNLOADING:
        newTruckStatus = TruckStatus.UNLOADING;
        terminalId = trip.destinationTerminalId;
        eventType = TerminalEventType.UNLOADING_STARTED;
        break;
      case TripStatus.COMPLETED:
        newTruckStatus = TruckStatus.IDLE;
        terminalId = trip.destinationTerminalId;
        eventType = TerminalEventType.UNLOADING_FINISHED;
        break;
      case TripStatus.CANCELED:
        newTruckStatus = TruckStatus.IDLE;
        break;
    }

    const margin = trip.rateIncome - trip.fuelCostEst - trip.otherCostEst;

    // Update trip
    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === TripStatus.EN_ROUTE && { actualStartAt: new Date() }),
        ...(newStatus === TripStatus.COMPLETED && { marginComputed: margin }),
      },
      include: {
        truck: { select: { id: true, code: true } },
        driver: { select: { id: true, name: true } },
        originTerminal: { select: { id: true, name: true } },
        destinationTerminal: { select: { id: true, name: true } },
      },
    });

    // Create terminal event if applicable
    if (eventType && terminalId && trip.truckId) {
      await this.prisma.terminalEvent.create({
        data: {
          tripId: id,
          terminalId,
          truckId: trip.truckId,
          type: eventType,
        },
      });
    }

    // Update truck status
    if (trip.truckId && newTruckStatus) {
      await this.trucksService.updateStatus(
        trip.truckId,
        newTruckStatus,
        terminalId ?? undefined,
      );
    }

    this.gateway.emitTripUpdated(id);
    return updated;
  }

  /**
   * Suggest top-3 trucks for a given trip.
   * Scoring:
   *   +3 = IDLE
   *   +2 = lastTerminalId matches originTerminalId
   *   −99 = MAINTENANCE (excluded)
   */
  async suggestTruck(dto: SuggestTruckDto) {
    const trucks = await this.prisma.truck.findMany({
      where: { status: { not: TruckStatus.MAINTENANCE } },
      include: {
        lastTerminal: { select: { id: true, name: true } },
        trips: {
          where: { status: { in: ACTIVE_STATUSES } },
          select: { id: true },
        },
      },
    });

    const scored = trucks
      .filter((t) => t.trips.length === 0) // no active trip
      .map((truck) => {
        let score = 0;
        const reasons: string[] = [];

        if (truck.status === TruckStatus.IDLE) {
          score += 3;
          reasons.push('Truck is idle and available');
        }
        if (truck.lastTerminalId === dto.originTerminalId) {
          score += 2;
          reasons.push(`Already at origin terminal (${truck.lastTerminal?.name ?? truck.lastTerminalId})`);
        }

        return { truck, score, reason: reasons.join('; ') || 'Available truck' };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ truck, score: _score, reason }) => ({
      truckId: truck.id,
      code: truck.code,
      status: truck.status,
      lastTerminal: truck.lastTerminal,
      reason,
    }));
  }
}
