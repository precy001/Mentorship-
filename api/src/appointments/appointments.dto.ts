import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateAppointmentDto {
  @IsString() @MinLength(1) topicId!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class AppointmentStatusDto {
  @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) status!: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}
