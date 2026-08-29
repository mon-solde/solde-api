import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { RecurringChargeResponseDto } from '../../dtos/recurring-charge.response.dto';
import {
  FindRecurringChargesQuery,
  RecurringChargeListItem,
} from './find-recurring-charges.query-handler';
import { FindRecurringChargesRequestDto } from './find-recurring-charges.request.dto';

@Controller(routesV1.version)
export class FindRecurringChargesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.recurringCharge.root)
  @ApiOperation({
    summary: 'Find all recurring charges for the authenticated user',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindRecurringChargesRequestDto,
  ): Promise<Paginated<RecurringChargeResponseDto>> {
    const result: Result<
      Paginated<RecurringChargeListItem>,
      never
    > = await this.queryBus.execute(
      new FindRecurringChargesQuery({
        userId: user.id,
        status: queryParams.status,
        type: queryParams.type,
        search: queryParams.search,
        limit: queryParams.limit,
        page: queryParams.page,
        orderBy: { field: queryParams.sortBy, param: queryParams.sortOrder },
      }),
    );

    const page = result.unwrap();
    return new Paginated({
      data: page.data.map(
        (c): RecurringChargeResponseDto => ({
          id: c.id,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          name: c.name,
          amount: c.amount,
          type: c.type,
          dueDay: c.dueDay ?? undefined,
          isActive: c.isActive,
          inactiveAt: c.inactiveAt ?? undefined,
        }),
      ),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
