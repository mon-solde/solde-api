import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { MonthlyBudgetEntity } from '../../domain/monthly-budget.entity';
import { MonthlyBudgetMapper } from '../../monthly-budget.mapper';
import { MonthlyBudgetResponseDto } from '../../dtos/monthly-budget.response.dto';
import { FindMonthlyBudgetsQuery } from './find-monthly-budgets.query-handler';

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
  @ApiResponse({ status: HttpStatus.OK, type: [MonthlyBudgetResponseDto] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MonthlyBudgetResponseDto[]> {
    const result: Result<MonthlyBudgetEntity[], never> =
      await this.queryBus.execute(
        new FindMonthlyBudgetsQuery({ userId: user.id }),
      );
    return result.unwrap().map((b) => this.mapper.toResponse(b));
  }
}
