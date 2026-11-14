import { IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UserRoleDto {
  @IsString() @IsIn(['MEMBER', 'COUNSELLOR', 'ADMIN', 'SUPER_ADMIN']) role!: 'MEMBER' | 'COUNSELLOR' | 'ADMIN' | 'SUPER_ADMIN';
}
export class TopicDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class TopicAssignmentDto {
  @IsArray() @IsString({ each: true }) topicIds!: string[];
}
export class AccountLookupDto {
  @IsEmail() email!: string;
}

export class CounsellorInvitationDto {
  @IsEmail() email!: string;
  @IsArray() @IsString({ each: true }) topicIds!: string[];
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
export class ResourceDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsString() @MinLength(2) @MaxLength(100) category!: string;
  @IsOptional() @IsString() @MaxLength(40) readTime?: string;
  @IsString() @MinLength(2) @MaxLength(2000) description!: string;
}
export class ScholarshipDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsString() @MinLength(2) @MaxLength(180) provider!: string;
  @IsString() @MinLength(2) @MaxLength(100) level!: string;
  @IsString() @MinLength(2) @MaxLength(2000) eligibility!: string;
  @IsString() @MinLength(2) @MaxLength(2000) description!: string;
  @IsString() deadline!: string;
}
