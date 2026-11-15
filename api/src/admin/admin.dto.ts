import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsDateString, Matches, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, Trim } from '../common/transformers';
import { READ_TIME_PATTERN, RESOURCE_CATEGORIES, SCHOLARSHIP_LEVELS } from '../content/content.constants';

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

/** Used for both create (POST) and full update (PUT). `imageUrl` omitted = unchanged on update; null = remove. */
export class ResourceDto {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(180, { message: 'Title must be 180 characters or fewer.' }) title!: string;
  @Trim() @IsString() @IsIn([...RESOURCE_CATEGORIES], { message: `Category must be one of: ${RESOURCE_CATEGORIES.join(', ')}.` }) category!: string;
  @Trim() @IsOptional() @IsString() @Matches(READ_TIME_PATTERN, { message: 'Reading time must be between 1 and 180 minutes.' }) readTime?: string;
  @Trim() @IsString() @MinLength(2, { message: 'Description must be at least 2 characters.' }) @MaxLength(2000, { message: 'Description must be 2000 characters or fewer.' }) description!: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
}

export class ScholarshipDto {
  @Trim() @IsString() @MinLength(2, { message: 'Title must be at least 2 characters.' }) @MaxLength(180, { message: 'Title must be 180 characters or fewer.' }) title!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Provider must be at least 2 characters.' }) @MaxLength(180, { message: 'Provider must be 180 characters or fewer.' }) provider!: string;
  @Trim() @IsString() @IsIn([...SCHOLARSHIP_LEVELS], { message: `Level must be one of: ${SCHOLARSHIP_LEVELS.join(', ')}.` }) level!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Eligibility must be at least 2 characters.' }) @MaxLength(2000, { message: 'Eligibility must be 2000 characters or fewer.' }) eligibility!: string;
  @Trim() @IsString() @MinLength(2, { message: 'Description must be at least 2 characters.' }) @MaxLength(2000, { message: 'Description must be 2000 characters or fewer.' }) description!: string;
  @IsDateString({}, { message: 'Choose a valid scholarship deadline.' }) deadline!: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
}
