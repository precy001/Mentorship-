import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/transformers';
export class CreateDiscussionDto {
  @IsString() @MinLength(1) topicId!: string;
  @Trim() @IsString() @MinLength(4) @MaxLength(180) title!: string;
  @Trim() @IsString() @MinLength(1) @MaxLength(5000) message!: string;
}
export class SendMessageDto {
  @Trim() @IsString() @MinLength(1, { message: 'Write a message before sending.' }) @MaxLength(5000) body!: string;
}
export class DiscussionStatusDto {
  @IsIn(['IN_PROGRESS', 'WAITING_FOR_MEMBER', 'COMPLETED', 'CANCELLED']) status!: 'IN_PROGRESS' | 'WAITING_FOR_MEMBER' | 'COMPLETED' | 'CANCELLED';
}
/** Counsellors choose only manual states; Available/Busy otherwise follow their workload and Suspended is an admin action. */
export class CounsellorAvailabilityBodyDto {
  @IsIn(['AVAILABLE', 'OFFLINE', 'ON_LEAVE']) availability!: 'AVAILABLE' | 'OFFLINE' | 'ON_LEAVE';
}
