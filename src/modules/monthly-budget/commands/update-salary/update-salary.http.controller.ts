import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';
import { UpdateSalaryCommand } from './update-salary.service';
import { UpdateSalaryRequestDto } from './update-salary.request.dto';

@Controller(routesV1.version)
export class UpdateSalaryHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(routesV1.monthlyBudget.salary)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update the received salary of a monthly budget' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') budgetId: string,
    @Body() body: UpdateSalaryRequestDto,
  ): Promise<void> {
    const result: Result<
      boolean,
      MonthlyBudgetNotFoundError | MonthlyBudgetAccessDeniedError
    > = await this.commandBus.execute(
      new UpdateSalaryCommand({
        budgetId,
        requesterId: user.id,
        receivedSalary: body.receivedSalary,
      }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof MonthlyBudgetNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof MonthlyBudgetAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
