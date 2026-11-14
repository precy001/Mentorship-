import { IsIn, IsObject, IsString, MaxLength } from 'class-validator';
export class CreateActivityDto {
  @IsString() @IsIn(['CAREER_ASSESSMENT', 'WELLBEING_CHECKIN', 'PERSONAL_GOAL']) type!: 'CAREER_ASSESSMENT' | 'WELLBEING_CHECKIN' | 'PERSONAL_GOAL';
  @IsObject() payload!: Record<string, unknown>;
}
