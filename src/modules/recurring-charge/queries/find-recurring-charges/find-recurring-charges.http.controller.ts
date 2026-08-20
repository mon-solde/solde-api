import { Controller, Get, HttpStatus, Logger, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { RecurringChargeEntity } from '../../domain/recurring-charge.entity';
import { RecurringChargeMapper } from '../../recurring-charge.mapper';
import { RecurringChargeResponseDto } from '../../dtos/recurring-charge.response.dto';
import { FindRecurringChargesQuery } from './find-recurring-charges.query-handler';
import { FindRecurringChargesRequestDto } from './find-recurring-charges.request.dto';

@Controller(routesV1.version)
export class FindRecurringChargesHttpController {
  private readonly logger = new Logger(FindRecurringChargesHttpController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: RecurringChargeMapper,
  ) {}

  @Get(routesV1.recurringCharge.root)
  @ApiOperation({
    summary: 'Find all recurring charges for the authenticated user',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindRecurringChargesRequestDto,
  ): Promise<Paginated<RecurringChargeResponseDto>> {
    this.logger.log(`GET /v1/recurring-charges — userId: ${user.id}`);

    const result: Result<
      Paginated<RecurringChargeEntity>,
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
      data: page.data.map((c) => this.mapper.toResponse(c)),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
