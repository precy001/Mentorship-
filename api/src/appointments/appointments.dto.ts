import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/transformers';
export class CreateAppointmentDto {
  @IsString() @MinLength(1) topicId!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @Trim() @IsString() @MaxLength(2000) notes?: string;
}
export class AppointmentStatusDto {
  @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) status!: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}
export class RescheduleAppointmentDto {
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}
