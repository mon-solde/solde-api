import { Controller, Get, HttpStatus, Logger, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { DebtEntity } from '../../domain/debt.entity';
import { DebtMapper } from '../../debt.mapper';
import { DebtResponseDto } from '../../dtos/debt.response.dto';
import { FindDebtsQuery } from './find-debts.query-handler';
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
  @ApiResponse({ status: HttpStatus.OK, type: [DebtResponseDto] })
  async findDebts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindDebtsRequestDto,
  ): Promise<DebtResponseDto[]> {
    this.logger.log(`GET /v1/debts — userId: ${user.id}`);

    const result: Result<DebtEntity[], never> = await this.queryBus.execute(
      new FindDebtsQuery({
        userId: user.id,
        contactId: queryParams.contactId,
        role: queryParams.role,
        status: queryParams.status,
        vehicleId: queryParams.vehicleId,
      }),
    );

    const debts = result.unwrap();
    this.logger.log(`GET /v1/debts — ${debts.length} dette(s) retournée(s)`);

    return debts.map((debt) => this.mapper.toResponse(debt));
  }
}
