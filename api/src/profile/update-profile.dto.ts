import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/transformers';
import { NIN_MESSAGE, NIN_PATTERN, NormalizeNin } from '../common/nin';

/** Partial update of the member's own details. Email, role and status can never be changed here. */
export class UpdateProfileDto {
  @IsOptional() @Trim() @IsString() @MinLength(2, { message: 'Enter your full name.' }) @MaxLength(160) displayName?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(32) @Matches(/^(\+?[\d\s\-()]{10,24})?$/, { message: 'Enter a valid phone number, for example +2348012345678.' }) phoneNumber?: string;
  @IsOptional() @IsDateString({}, { message: 'Enter a valid date of birth.' }) dateOfBirth?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(180) school?: string;
  /** Can be changed but never cleared: it is a required detail. */
  @IsOptional() @NormalizeNin() @IsString({ message: NIN_MESSAGE }) @Matches(NIN_PATTERN, { message: NIN_MESSAGE }) nin?: string;
}
