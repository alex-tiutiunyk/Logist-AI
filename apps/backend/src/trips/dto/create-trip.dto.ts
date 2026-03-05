import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  originTerminalId!: string;

  @IsString()
  destinationTerminalId!: string;

  @IsDateString()
  plannedStartAt!: string;

  @IsDateString()
  plannedEtaAt!: string;

  @IsOptional()
  @IsString()
  truckId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cargoWeightKg?: number;

  @IsNumber()
  @Min(0)
  rateIncome!: number;

  @IsNumber()
  @Min(0)
  fuelCostEst!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCostEst?: number;
}
