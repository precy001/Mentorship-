import { IsDateString, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() @MaxLength(320) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsString() @MinLength(2) @MaxLength(160) displayName!: string;
  @IsString() @MinLength(1) categoryId!: string;
  @IsString() @MinLength(1) subcategoryId!: string;
  @IsOptional() @IsString() @MaxLength(32) phoneNumber?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(100) stateOfResidence?: string;
  @IsOptional() @IsString() @MaxLength(100) lga?: string;
  @IsOptional() @IsString() @MaxLength(120) lcda?: string;
  @IsOptional() @IsString() @MaxLength(180) school?: string;
}
