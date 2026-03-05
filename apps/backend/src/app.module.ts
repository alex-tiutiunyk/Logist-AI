import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TrucksModule } from './trucks/trucks.module';
import { DriversModule } from './drivers/drivers.module';
import { TerminalsModule } from './terminals/terminals.module';
import { TripsModule } from './trips/trips.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GatewayModule } from './gateway/gateway.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    // Load .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // Cron scheduling (for enqueuing alert-check jobs)
    ScheduleModule.forRoot(),

    // BullMQ connected to Redis
    BullModule.forRoot({
      connection: {
        host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
        port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
      },
    }),

    PrismaModule,
    GatewayModule,
    AuthModule,
    UsersModule,
    TrucksModule,
    DriversModule,
    TerminalsModule,
    TripsModule,
    AlertsModule,
    DashboardModule,
    JobsModule,
  ],
})
export class AppModule {}
