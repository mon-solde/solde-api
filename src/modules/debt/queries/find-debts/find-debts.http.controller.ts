import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { DebtResponseDto } from '../../dtos/debt.response.dto';
import { DebtPaginatedResponseDto } from '../../dtos/debt.paginated.response.dto';
import { FindDebtsQuery, FindDebtsResult } from './find-debts.query-handler';
import { FindDebtsRequestDto } from './find-debts.request.dto';

@Controller(routesV1.version)
export class FindDebtsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.debt.root)
  @ApiOperation({ summary: 'Find all debts for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, type: DebtPaginatedResponseDto })
  async findDebts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindDebtsRequestDto,
  ): Promise<DebtPaginatedResponseDto> {
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

    return new DebtPaginatedResponseDto({
      data: data.map(
        (debt): DebtResponseDto => ({
          id: debt.id,
          createdAt: debt.createdAt.toISOString(),
          updatedAt: debt.updatedAt.toISOString(),
          lenderId: debt.lenderId,
          borrowerId: debt.borrowerId,
          lenderName: debt.lenderName ?? '',
          borrowerName: debt.borrowerName ?? '',
          amount: debt.amount,
          date: debt.date,
          type: debt.type,
          description: debt.description,
          vehicleId: debt.vehicleId,
          vehicleName: debt.vehicleName,
          totalRepaid: debt.totalRepaid,
          remaining: debt.remaining,
          isRepaid: debt.isRepaid,
          isManuallySettled: debt.isManuallySettled,
          isForgiven: debt.isForgiven,
          repayments: debt.repayments,
        }),
      ),
      count,
      limit,
      page,
      totals,
    });
  }
}
