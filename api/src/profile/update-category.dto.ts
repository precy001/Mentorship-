import { IsString, MinLength } from 'class-validator';
export class UpdateCategoryDto {
  @IsString() @MinLength(1) categoryId!: string;
  @IsString() @MinLength(1) subcategoryId!: string;
}
