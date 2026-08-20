import { Controller, Get, HttpStatus, Logger, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { MonthlyBudgetEntity } from '../../domain/monthly-budget.entity';
import { MonthlyBudgetMapper } from '../../monthly-budget.mapper';
import { MonthlyBudgetResponseDto } from '../../dtos/monthly-budget.response.dto';
import { FindMonthlyBudgetsQuery } from './find-monthly-budgets.query-handler';
import { FindMonthlyBudgetsRequestDto } from './find-monthly-budgets.request.dto';

@Controller(routesV1.version)
export class FindMonthlyBudgetsHttpController {
  private readonly logger = new Logger(FindMonthlyBudgetsHttpController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: MonthlyBudgetMapper,
  ) {}

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
      Paginated<MonthlyBudgetEntity>,
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
      data: page.data.map((b) => this.mapper.toResponse(b)),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
