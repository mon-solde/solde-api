import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  FindSavingsHistoryQuery,
  SavingsHistoryResult,
} from './find-savings-events.query-handler';
import { FindSavingsEventsRequestDto } from './find-savings-events.request.dto';

@Controller(routesV1.version)
export class FindSavingsHistoryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.savings.root)
  @ApiOperation({
    summary: 'Get savings history and balances for the current user',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async find(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindSavingsEventsRequestDto,
  ): Promise<SavingsHistoryResult> {
    const result: Result<SavingsHistoryResult, never> =
      await this.queryBus.execute(
        new FindSavingsHistoryQuery({
          userId: user.id,
          kind: queryParams.kind,
          source: queryParams.source,
          search: queryParams.search,
          limit: queryParams.limit,
          page: queryParams.page,
          orderBy: { field: queryParams.sortBy, param: queryParams.sortOrder },
        }),
      );
    return result.unwrap();
  }
}
