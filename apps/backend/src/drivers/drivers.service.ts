import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.driver.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.driver.findUniqueOrThrow({ where: { id } });
  }
}
