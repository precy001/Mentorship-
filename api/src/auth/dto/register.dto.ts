import { IsDateString, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NIN_MESSAGE, NIN_PATTERN, NormalizeNin } from '../../common/nin';

export class RegisterDto {
  @IsEmail() @MaxLength(320) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsString() @MinLength(2) @MaxLength(160) displayName!: string;
  @IsString() @MinLength(1) categoryId!: string;
  @IsString() @MinLength(1) subcategoryId!: string;
  @IsOptional() @IsString() @MaxLength(32) @Matches(/^\+?[\d\s\-()]{10,24}$/, { message: 'Enter a valid phone number, for example +2348012345678.' }) phoneNumber?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsString({ message: 'Choose your state.' }) @MinLength(1, { message: 'Choose your state.' }) @MaxLength(100) stateOfResidence!: string;
  @IsString({ message: 'Choose your LGA.' }) @MinLength(1, { message: 'Choose your LGA.' }) @MaxLength(100) lga!: string;
  @IsString({ message: 'Choose your LCDA.' }) @MinLength(1, { message: 'Choose your LCDA.' }) @MaxLength(120) lcda!: string;
  @IsOptional() @IsString() @MaxLength(180) school?: string;
  /** Required. Stored with the profile; not verified against NIMC. */
  @NormalizeNin() @IsString({ message: NIN_MESSAGE }) @Matches(NIN_PATTERN, { message: NIN_MESSAGE }) nin!: string;
}
