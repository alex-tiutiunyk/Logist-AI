import { Injectable, NotFoundException } from '@nestjs/common';
import { TruckStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class TrucksService {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
  ) {}

  findAll(filters?: { status?: TruckStatus; terminalId?: string }) {
    return this.prisma.truck.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.terminalId && { lastTerminalId: filters.terminalId }),
      },
      include: {
        lastTerminal: { select: { id: true, name: true, type: true } },
        trips: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELED', 'PLANNED'],
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            originTerminal: { select: { id: true, name: true } },
            destinationTerminal: { select: { id: true, name: true } },
            driver: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const truck = await this.prisma.truck.findUnique({
      where: { id },
      include: {
        lastTerminal: true,
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            originTerminal: { select: { id: true, name: true } },
            destinationTerminal: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!truck) throw new NotFoundException(`Truck ${id} not found`);
    return truck;
  }

  async updateStatus(id: string, status: TruckStatus, terminalId?: string) {
    const truck = await this.prisma.truck.update({
      where: { id },
      data: {
        status,
        ...(terminalId !== undefined && { lastTerminalId: terminalId }),
      },
      include: { lastTerminal: { select: { id: true, name: true } } },
    });

    // Broadcast realtime update
    this.gateway.emitTruckUpdated(truck.id);
    return truck;
  }
}
