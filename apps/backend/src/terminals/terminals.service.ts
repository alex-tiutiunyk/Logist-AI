import { Injectable, NotFoundException } from '@nestjs/common';
import { TerminalEventType, TripStatus, TruckStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class TerminalsService {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
  ) {}

  findAll() {
    return this.prisma.terminal.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.terminal.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Returns all terminals with their current truck queues.
   * Each entry includes trucks in ARRIVED_ORIGIN, LOADING, ARRIVED_DEST, UNLOADING states
   * along with the arrival TerminalEvent so we can compute dwell time on the frontend.
   */
  async getQueue() {
    const terminals = await this.prisma.terminal.findMany({
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      terminals.map(async (terminal) => {
        // Active trips currently at this terminal
        const activeTrips = await this.prisma.trip.findMany({
          where: {
            status: {
              in: [
                TripStatus.ARRIVED_ORIGIN,
                TripStatus.LOADING,
                TripStatus.ARRIVED_DEST,
                TripStatus.UNLOADING,
              ],
            },
            OR: [
              { originTerminalId: terminal.id, status: { in: [TripStatus.ARRIVED_ORIGIN, TripStatus.LOADING] } },
              { destinationTerminalId: terminal.id, status: { in: [TripStatus.ARRIVED_DEST, TripStatus.UNLOADING] } },
            ],
          },
          include: {
            truck: { select: { id: true, code: true, status: true } },
            driver: { select: { id: true, name: true } },
            originTerminal: { select: { id: true, name: true } },
            destinationTerminal: { select: { id: true, name: true } },
            terminalEvents: {
              where: { terminalId: terminal.id },
              orderBy: { at: 'desc' },
              take: 1,
            },
          },
        });

        return { terminal, trips: activeTrips };
      }),
    );

    return result;
  }

  /**
   * Change loading/unloading state for a trip at this terminal.
   * Also creates a TerminalEvent and updates truck status.
   */
  async performAction(
    terminalId: string,
    tripId: string,
    action: 'start_loading' | 'finish_loading' | 'start_unloading' | 'finish_unloading',
  ) {
    const terminal = await this.prisma.terminal.findUnique({ where: { id: terminalId } });
    if (!terminal) throw new NotFoundException('Terminal not found');

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { truck: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    let newTripStatus: TripStatus;
    let newTruckStatus: TruckStatus;
    let eventType: TerminalEventType;

    switch (action) {
      case 'start_loading':
        newTripStatus = TripStatus.LOADING;
        newTruckStatus = TruckStatus.LOADING;
        eventType = TerminalEventType.LOADING_STARTED;
        break;
      case 'finish_loading':
        newTripStatus = TripStatus.DEPARTED_ORIGIN;
        newTruckStatus = TruckStatus.EN_ROUTE;
        eventType = TerminalEventType.LOADING_FINISHED;
        break;
      case 'start_unloading':
        newTripStatus = TripStatus.UNLOADING;
        newTruckStatus = TruckStatus.UNLOADING;
        eventType = TerminalEventType.UNLOADING_STARTED;
        break;
      case 'finish_unloading':
        newTripStatus = TripStatus.COMPLETED;
        newTruckStatus = TruckStatus.IDLE;
        eventType = TerminalEventType.UNLOADING_FINISHED;
        break;
    }

    // Create terminal event
    if (trip.truckId) {
      await this.prisma.terminalEvent.create({
        data: {
          tripId,
          terminalId,
          truckId: trip.truckId,
          type: eventType,
        },
      });
    }

    // Update trip
    const margin = trip.rateIncome - trip.fuelCostEst - trip.otherCostEst;
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: newTripStatus,
        ...(newTripStatus === TripStatus.COMPLETED && { marginComputed: margin }),
      },
    });

    // Update truck status
    if (trip.truckId) {
      const truckUpdate: { status: TruckStatus; lastTerminalId?: string | null } = {
        status: newTruckStatus,
      };
      if (newTruckStatus === TruckStatus.IDLE) {
        truckUpdate.lastTerminalId = terminalId;
      }
      await this.prisma.truck.update({ where: { id: trip.truckId }, data: truckUpdate });
      this.gateway.emitTruckUpdated(trip.truckId);
    }

    this.gateway.emitTripUpdated(tripId);

    return { success: true };
  }
}
