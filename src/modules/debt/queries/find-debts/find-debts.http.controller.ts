import { Controller, Get, HttpStatus, Logger, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { DebtMapper } from '../../debt.mapper';
import { DebtPaginatedResponseDto } from '../../dtos/debt.paginated.response.dto';
import { FindDebtsQuery, FindDebtsResult } from './find-debts.query-handler';
import { FindDebtsRequestDto } from './find-debts.request.dto';

@Controller(routesV1.version)
export class FindDebtsHttpController {
  private readonly logger = new Logger(FindDebtsHttpController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: DebtMapper,
  ) {}

  @Get(routesV1.debt.root)
  @ApiOperation({ summary: 'Find all debts for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, type: DebtPaginatedResponseDto })
  async findDebts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindDebtsRequestDto,
  ): Promise<DebtPaginatedResponseDto> {
    this.logger.log(`GET /v1/debts — userId: ${user.id}`);

    const result: Result<FindDebtsResult, never> = await this.queryBus.execute(
      new FindDebtsQuery({
        userId: user.id,
        contactId: queryParams.contactId,
        role: queryParams.role,
        status: queryParams.status,
        vehicleId: queryParams.vehicleId,
        limit: queryParams.limit,
        page: queryParams.page,
        orderBy: queryParams.sortBy
          ? { field: queryParams.sortBy, param: queryParams.sortOrder }
          : undefined,
      }),
    );

    const { data, count, limit, page, totals } = result.unwrap();
    this.logger.log(
      `GET /v1/debts — ${data.length}/${count} dette(s) returned`,
    );

    return new DebtPaginatedResponseDto({
      data: data.map((debt) => this.mapper.toResponse(debt)),
      count,
      limit,
      page,
      totals,
    });
  }
}
