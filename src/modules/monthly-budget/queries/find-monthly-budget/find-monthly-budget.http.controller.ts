import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { MonthlyBudgetDetailResponseDto } from '../../dtos/monthly-budget.response.dto';
import { MonthlyBudgetNotFoundError } from '../../domain/monthly-budget.errors';
import {
  BudgetDetailModel,
  FindMonthlyBudgetQuery,
} from './find-monthly-budget.query-handler';

@Controller(routesV1.version)
export class FindMonthlyBudgetHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.monthlyBudget.byYearMonth)
  @ApiOperation({ summary: 'Find a monthly budget by year and month' })
  @ApiResponse({ status: HttpStatus.OK, type: MonthlyBudgetDetailResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  async find(
    @CurrentUser() user: AuthenticatedUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ): Promise<MonthlyBudgetDetailResponseDto> {
    const result: Result<BudgetDetailModel, MonthlyBudgetNotFoundError> =
      await this.queryBus.execute(
        new FindMonthlyBudgetQuery({ userId: user.id, year, month }),
      );

    return match(result, {
      Ok: (budget): MonthlyBudgetDetailResponseDto => ({
        id: budget.id,
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
        userId: budget.userId,
        year: budget.year,
        month: budget.month,
        receivedSalary: budget.receivedSalary,
        recurringCharges: budget.recurringCharges.map((c) => ({
          id: c.id,
          recurringChargeId: c.recurringChargeId ?? undefined,
          label: c.label,
          amount: c.amount,
          type: c.type,
          dueDay: c.dueDay ?? undefined,
        })),
        savingsWithdrawals: budget.savingsWithdrawals.map((w) => ({
          id: w.id,
          amount: w.amount,
          source: w.source,
          date: w.date,
        })),
      }),
      Err: (error) => {
        if (error instanceof MonthlyBudgetNotFoundError)
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
