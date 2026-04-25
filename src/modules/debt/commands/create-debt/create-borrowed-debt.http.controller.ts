import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { CreateDebtCommand } from './create-debt.command';
import { CreateBorrowedDebtRequestDto } from './create-borrowed-debt.request.dto';

@Controller(routesV1.version)
export class CreateBorrowedDebtHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.debt.borrowed)
  @ApiOperation({
    summary: 'Declare a borrowed debt (authenticated user is the borrower)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBorrowedDebtRequestDto,
  ): Promise<IdResponse> {
    const command = new CreateDebtCommand({
      lenderId: body.lenderId,
      borrowerId: user.id,
      amount: body.amount,
      date: new Date(body.date),
      description: body.description,
    });

    const result: Result<AggregateID, never> = await this.commandBus.execute(
      command,
    );
    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        throw error;
      },
    });
  }
}
