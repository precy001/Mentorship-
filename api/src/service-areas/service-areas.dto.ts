import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/transformers';

const name = (label: string, max: number) => ({ min: { message: `${label} must be at least 2 characters.` }, max: { message: `${label} must be ${max} characters or fewer.` } });

export class ServiceAreaDto {
  @Trim() @IsString() @MinLength(2, name('State', 100).min) @MaxLength(100, name('State', 100).max) state!: string;
  @Trim() @IsString() @MinLength(2, name('LGA', 100).min) @MaxLength(100, name('LGA', 100).max) lga!: string;
  @Trim() @IsString() @MinLength(2, name('LCDA', 120).min) @MaxLength(120, name('LCDA', 120).max) lcda!: string;
}

export class LgaActiveDto {
  @Trim() @IsString() @MinLength(2) @MaxLength(100) state!: string;
  @Trim() @IsString() @MinLength(2) @MaxLength(100) lga!: string;
  @IsBoolean({ message: 'isActive must be true or false.' }) isActive!: boolean;
}

export class RenameLgaDto {
  @Trim() @IsString() @MinLength(2) @MaxLength(100) state!: string;
  @Trim() @IsString() @MinLength(2) @MaxLength(100) lga!: string;
  @Trim() @IsString() @MinLength(2, name('New LGA name', 100).min) @MaxLength(100, name('New LGA name', 100).max) newLga!: string;
}

export class ServiceAreaActiveDto {
  @IsBoolean({ message: 'isActive must be true or false.' }) isActive!: boolean;
}
