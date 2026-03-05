import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { GatewayModule } from '../gateway/gateway.module';
import { TrucksModule } from '../trucks/trucks.module';

@Module({
  imports: [GatewayModule, TrucksModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
