import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { MonthlyBudgetResponseDto } from '../../dtos/monthly-budget.response.dto';
import {
  FindMonthlyBudgetsQuery,
  MonthlyBudgetListItem,
} from './find-monthly-budgets.query-handler';
import { FindMonthlyBudgetsRequestDto } from './find-monthly-budgets.request.dto';

@Controller(routesV1.version)
export class FindMonthlyBudgetsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.monthlyBudget.root)
  @ApiOperation({
    summary: 'Find all monthly budgets for the authenticated user',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindMonthlyBudgetsRequestDto,
  ): Promise<Paginated<MonthlyBudgetResponseDto>> {
    const result: Result<
      Paginated<MonthlyBudgetListItem>,
      never
    > = await this.queryBus.execute(
      new FindMonthlyBudgetsQuery({
        userId: user.id,
        limit: queryParams.limit,
        page: queryParams.page,
        orderBy: { field: queryParams.sortBy, param: queryParams.sortOrder },
      }),
    );

    const page = result.unwrap();
    return new Paginated({
      data: page.data.map(
        (b): MonthlyBudgetResponseDto => ({
          id: b.id,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
          userId: b.userId,
          year: b.year,
          month: b.month,
          receivedSalary: b.receivedSalary,
          recurringCharges: b.recurringCharges.map((c) => ({
            id: c.id,
            recurringChargeId: c.recurringChargeId ?? undefined,
            label: c.label,
            amount: c.amount,
            type: c.type,
            dueDay: c.dueDay ?? undefined,
          })),
        }),
      ),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
