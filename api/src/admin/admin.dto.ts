import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, IsDateString, IsUrl, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { NormalizeEmail, Trim } from '../common/transformers';
import { MAX_AUDIENCE_GROUPS, READ_TIME_PATTERN, RESOURCE_CATEGORIES, SCHOLARSHIP_LEVELS } from '../content/content.constants';

export class UserRoleDto {
  @IsString() @IsIn(['MEMBER', 'COUNSELLOR', 'ADMIN', 'SUPER_ADMIN']) role!: 'MEMBER' | 'COUNSELLOR' | 'ADMIN' | 'SUPER_ADMIN';
}
export class TopicDto {
  @Trim() @IsString() @MinLength(2, { message: 'Topic name must be at least 2 characters.' }) @MaxLength(120, { message: 'Topic name must be 120 characters or fewer.' }) name!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(500, { message: 'Topic description must be 500 characters or fewer.' }) description?: string;
}
export class TopicAssignmentDto {
  @IsArray() @IsString({ each: true }) topicIds!: string[];
}
export class AccountLookupDto {
  @NormalizeEmail() @IsEmail({}, { message: 'Enter a valid email address.' }) email!: string;
}

export class CounsellorInvitationDto {
  @NormalizeEmail() @IsEmail({}, { message: 'Enter a valid email address.' }) email!: string;
  @IsArray({ message: 'Select at least one counselling topic.' }) @IsString({ each: true }) topicIds!: string[];
}
export class AccountStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']) status!: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}
export class TopicActiveDto {
  @IsIn([true, false]) isActive!: boolean;
}
export class AcceptCounsellorInvitationDto {
  @IsString() @MinLength(20) token!: string;
}
export class CounsellorAvailabilityDto {
  @IsIn(['AVAILABLE', 'OFFLINE', 'ON_LEAVE']) availability!: 'AVAILABLE' | 'OFFLINE' | 'ON_LEAVE';
}

/**
 * "Who is this for?" Membership category and subcategory slugs; both empty = everyone.
 * Omitted on create = the default for that content type; omitted on update = unchanged.
 */
class AudienceFields {
  @IsOptional() @IsArray({ message: 'Audience categories must be a list.' }) @ArrayMaxSize(MAX_AUDIENCE_GROUPS) @IsString({ each: true }) @MaxLength(100, { each: true }) audienceCategories?: string[];
  @IsOptional() @IsArray({ message: 'Audience subcategories must be a list.' }) @ArrayMaxSize(MAX_AUDIENCE_GROUPS) @IsString({ each: true }) @MaxLength(100, { each: true }) audienceSubcategories?: string[];
}

/** Optional official link. Omitted = unchanged on update; null or "" = remove. Only http(s) links are accepted. */
const APPLY_URL_MESSAGE = 'Enter a full web address starting with https://, or leave the link empty.';

/** Used for both create (POST) and full update (PUT). `imageUrl` omitted = unchanged on update; null = remove. */
export class ResourceDto extends AudienceFields {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(180, { message: 'Title must be 180 characters or fewer.' }) title!: string;
  @Trim() @IsString() @IsIn([...RESOURCE_CATEGORIES], { message: `Category must be one of: ${RESOURCE_CATEGORIES.join(', ')}.` }) category!: string;
  @Trim() @IsOptional() @IsString() @Matches(READ_TIME_PATTERN, { message: 'Reading time must be between 1 and 180 minutes.' }) readTime?: string;
  @Trim() @IsString() @MinLength(2, { message: 'Description must be at least 2 characters.' }) @MaxLength(2000, { message: 'Description must be 2000 characters or fewer.' }) description!: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
}

export class ScholarshipDto extends AudienceFields {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(180, { message: 'Title must be 180 characters or fewer.' }) title!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Provider must be at least 2 characters.' }) @MaxLength(180, { message: 'Provider must be 180 characters or fewer.' }) provider!: string;
  @Trim() @IsString() @IsIn([...SCHOLARSHIP_LEVELS], { message: `Level must be one of: ${SCHOLARSHIP_LEVELS.join(', ')}.` }) level!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Eligibility must be at least 2 characters.' }) @MaxLength(2000, { message: 'Eligibility must be 2000 characters or fewer.' }) eligibility!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Description must be at least 2 characters.' }) @MaxLength(2000, { message: 'Description must be 2000 characters or fewer.' }) description!: string;
  @IsDateString({}, { message: 'Choose a valid scholarship deadline.' }) deadline!: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
  @Trim() @IsOptional() @ValidateIf((_o, value) => value !== null && value !== '') @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: APPLY_URL_MESSAGE }) @MaxLength(2048) applyUrl?: string | null;
}

/** Grants for working members. The deadline is optional: leave it out (or null) for grants open all year. */
export class GrantDto extends AudienceFields {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(180, { message: 'Title must be 180 characters or fewer.' }) title!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Provider must be at least 2 characters.' }) @MaxLength(180, { message: 'Provider must be 180 characters or fewer.' }) provider!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(120, { message: 'Amount must be 120 characters or fewer.' }) amount?: string | null;
  @IsOptional() @ValidateIf((_o, value) => value !== null) @IsDateString({}, { message: 'Choose a valid grant deadline.' }) deadline?: string | null;
  @Trim() @IsString() @MinLength(2, { message: 'Eligibility must be at least 2 characters.' }) @MaxLength(2000, { message: 'Eligibility must be 2000 characters or fewer.' }) eligibility!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Description must be at least 2 characters.' }) @MaxLength(2000, { message: 'Description must be 2000 characters or fewer.' }) description!: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
  @Trim() @IsOptional() @ValidateIf((_o, value) => value !== null && value !== '') @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: APPLY_URL_MESSAGE }) @MaxLength(2048) applyUrl?: string | null;
}
