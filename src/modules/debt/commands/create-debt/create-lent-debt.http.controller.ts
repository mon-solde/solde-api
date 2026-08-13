import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { ContactNotFoundError } from '@modules/contact/domain/contact.errors';
import { InsufficientSavingsError } from '../../domain/debt.errors';
import { CreateDebtCommand } from './create-debt.command';
import { CreateLentDebtRequestDto } from './create-lent-debt.request.dto';

@Controller(routesV1.version)
export class CreateLentDebtHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.debt.lent)
  @ApiOperation({
    summary: 'Declare a lent debt (authenticated user is the lender)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLentDebtRequestDto,
  ): Promise<IdResponse> {
    const command = new CreateDebtCommand({
      lenderId: user.id,
      borrowerId: body.borrowerId,
      amount: body.amount,
      date: new Date(body.date),
      role: 'LENT',
      description: body.description,
      bankAmount: body.bankAmount,
      cashAmount: body.cashAmount,
    });

    const result: Result<
      AggregateID,
      InsufficientSavingsError | ContactNotFoundError
    > = await this.commandBus.execute(command);
    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof InsufficientSavingsError)
          throw new UnprocessableEntityException(error.message);
        if (error instanceof ContactNotFoundError)
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
