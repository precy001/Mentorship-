import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateRatingDto {
  @IsOptional() @IsString() discussionId?: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @MaxLength(2000) feedback?: string;
}
export class ModerateRatingDto {
  @IsIn(['APPROVED', 'REJECTED']) status!: 'APPROVED' | 'REJECTED';
}
