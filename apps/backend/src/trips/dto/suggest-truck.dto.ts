import { IsDateString, IsString } from 'class-validator';

export class SuggestTruckDto {
  @IsString()
  originTerminalId!: string;

  @IsDateString()
  plannedStartAt!: string;
}
