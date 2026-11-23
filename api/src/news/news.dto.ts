import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Trim } from '../common/transformers';

const LINK_MESSAGE = 'Enter a full web address starting with https://, or leave the link empty.';

/** Create (POST) and full update (PUT). `imageUrl` omitted = unchanged on update; null or "" = remove. */
export class NewsPostDto {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(160, { message: 'Title must be 160 characters or fewer.' }) title!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Write the update before posting it.' }) @MaxLength(5000, { message: 'The update must be 5000 characters or fewer.' }) body!: string;
  @IsOptional() @ValidateIf((_o, value) => value !== null) @IsString() @MaxLength(2048) imageUrl?: string | null;
  @Trim() @IsOptional() @ValidateIf((_o, value) => value !== null && value !== '') @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: LINK_MESSAGE }) @MaxLength(2048) linkUrl?: string | null;
  @IsOptional() @IsBoolean() pinned?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

/** Quick switches from the admin list. */
export class NewsFlagsDto {
  @IsOptional() @IsBoolean() pinned?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class NewsFeedQuery {
  @IsOptional() @Transform(({ value }: { value: unknown }) => (value === undefined ? undefined : Number(value))) @IsInt() @Min(1) @Max(50) limit?: number;
  /** The `nextCursor` from the previous page. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) cursor?: string;
}
