import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQuery {
  @IsOptional() @Transform(({ value }: { value: unknown }) => (value === undefined ? undefined : Number(value))) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsDateString() before?: string;
  @IsOptional() @IsIn(['true', 'false']) unread?: string;
}
