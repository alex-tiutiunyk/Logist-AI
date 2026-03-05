import { Module } from '@nestjs/common';
import { TrucksController } from './trucks.controller';
import { TrucksService } from './trucks.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [TrucksController],
  providers: [TrucksService],
  exports: [TrucksService],
})
export class TrucksModule {}
