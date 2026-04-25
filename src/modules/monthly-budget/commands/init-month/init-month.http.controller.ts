import {
  Body,
  Controller,
  ConflictException,
  HttpStatus,
  Post,
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
import { MonthlyBudgetAlreadyExistsError } from '../../domain/monthly-budget.errors';
import { InitMonthCommand } from './init-month.command';
import { InitMonthRequestDto } from './init-month.request.dto';

@Controller(routesV1.version)
export class InitMonthHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.monthlyBudget.root)
  @ApiOperation({
    summary: 'Initialize a monthly budget (snapshots active recurring charges)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  async init(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InitMonthRequestDto,
  ): Promise<IdResponse> {
    const result: Result<AggregateID, MonthlyBudgetAlreadyExistsError> =
      await this.commandBus.execute(
        new InitMonthCommand({
          userId: user.id,
          year: body.year,
          month: body.month,
          receivedSalary: body.receivedSalary,
        }),
      );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof MonthlyBudgetAlreadyExistsError)
          throw new ConflictException(error.message);
        throw error;
      },
    });
  }
}
