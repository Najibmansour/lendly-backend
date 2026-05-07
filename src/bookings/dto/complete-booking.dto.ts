import { IsEnum } from 'class-validator';

export enum CompletionParty {
  RENTER = 'renter',
  OWNER = 'owner',
}

export class CompleteBookingDto {
  @IsEnum(CompletionParty)
  party!: CompletionParty;
}
