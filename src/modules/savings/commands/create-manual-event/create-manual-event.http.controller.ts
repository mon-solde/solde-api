import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { CreateManualSavingsEventCommand } from './create-manual-event.service';
import { CreateManualSavingsEventRequestDto } from './create-manual-event.request.dto';

@Controller(routesV1.version)
export class CreateManualSavingsEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.savings.root)
  @ApiOperation({ summary: 'Create a manual savings event' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateManualSavingsEventRequestDto,
  ): Promise<IdResponse> {
    const result: Result<AggregateID, never> = await this.commandBus.execute(
      new CreateManualSavingsEventCommand({
        userId: user.id,
        kind: body.kind,
        source: body.source,
        amount: body.amount,
        label: body.label,
        date: new Date(body.date),
      }),
    );
    return new IdResponse(result.unwrap());
  }
}
