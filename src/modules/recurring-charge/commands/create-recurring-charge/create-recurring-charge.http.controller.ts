import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { CreateRecurringChargeCommand } from './create-recurring-charge.command';
import { CreateRecurringChargeRequestDto } from './create-recurring-charge.request.dto';

@Controller(routesV1.version)
export class CreateRecurringChargeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.recurringCharge.root)
  @ApiOperation({ summary: 'Create a recurring charge' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRecurringChargeRequestDto,
  ): Promise<IdResponse> {
    const command = new CreateRecurringChargeCommand({
      userId: user.id,
      name: body.name,
      amount: body.amount,
      type: body.type,
      dueDay: body.dueDay,
    });

    const result: Result<AggregateID, never> = await this.commandBus.execute(
      command,
    );
    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        throw error;
      },
    });
  }
}
