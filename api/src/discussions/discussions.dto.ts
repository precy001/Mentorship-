import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/transformers';
export class CreateDiscussionDto {
  @IsString() @MinLength(1) topicId!: string;
  @Trim() @IsString() @MinLength(4) @MaxLength(180) title!: string;
  @Trim() @IsString() @MinLength(1) @MaxLength(5000) message!: string;
}
export class SendMessageDto {
  @Trim() @IsString() @MinLength(1, { message: 'Write a message before sending.' }) @MaxLength(5000) body!: string;
  /** Id the app makes for this message so a retried send is not saved twice. Optional for older app versions. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{8,64}$/, { message: 'clientId must be 8 to 64 letters, digits, "-" or "_".' }) clientId?: string;
}
export class DiscussionStatusDto {
  @IsIn(['IN_PROGRESS', 'WAITING_FOR_MEMBER', 'COMPLETED', 'CANCELLED']) status!: 'IN_PROGRESS' | 'WAITING_FOR_MEMBER' | 'COMPLETED' | 'CANCELLED';
}
/** Counsellors choose only manual states; Available/Busy otherwise follow their workload and Suspended is an admin action. */
export class CounsellorAvailabilityBodyDto {
  @IsIn(['AVAILABLE', 'OFFLINE', 'ON_LEAVE']) availability!: 'AVAILABLE' | 'OFFLINE' | 'ON_LEAVE';
}
