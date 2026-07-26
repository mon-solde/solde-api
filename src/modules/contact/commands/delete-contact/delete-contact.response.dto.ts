import { ApiProperty } from '@nestjs/swagger';

export class DeleteContactResponseDto {
  constructor(hardDeleted: boolean) {
    this.hardDeleted = hardDeleted;
  }

  @ApiProperty({
    description:
      'True if the contact was fully erased, false if it was only hidden because it still has history (debts, expense payments, ...)',
  })
  readonly hardDeleted: boolean;
}
