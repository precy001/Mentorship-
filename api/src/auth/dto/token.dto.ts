import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
