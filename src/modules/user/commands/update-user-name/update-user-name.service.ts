import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserNotFoundError } from '@modules/user/domain/user.errors';
import { USER_REPOSITORY } from '../../user.di-tokens';

// Internal-only: dispatched by whichever module owns a User subtype
// (contact, later account) to rename the shared CTI base row.
export class UpdateUserNameCommand {
  readonly id: string;
  readonly firstName: string;
  readonly lastName?: string;

  constructor(props: UpdateUserNameCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(UpdateUserNameCommand)
export class UpdateUserNameService implements ICommandHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: UpdateUserNameCommand,
  ): Promise<Result<void, UserNotFoundError>> {
    const found = await this.userRepo.findOneById(command.id);
    if (found.isNone()) return Err(new UserNotFoundError());

    const user = found.unwrap();
    user.rename(command.firstName, command.lastName);
    await this.userRepo.transaction(() => this.userRepo.save(user));

    return Ok(undefined);
  }
}
