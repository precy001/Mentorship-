import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateDiscussionDto {
  @IsString() @MinLength(1) topicId!: string;
  @IsString() @MinLength(4) @MaxLength(180) title!: string;
  @IsString() @MinLength(1) @MaxLength(5000) message!: string;
}
export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
}
export class DiscussionStatusDto {
  @IsIn(['IN_PROGRESS', 'WAITING_FOR_MEMBER', 'COMPLETED', 'CANCELLED']) status!: 'IN_PROGRESS' | 'WAITING_FOR_MEMBER' | 'COMPLETED' | 'CANCELLED';
}
