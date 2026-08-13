import { NotFoundException } from '@libs/exceptions';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserAccessDeniedError } from '@modules/user/domain/user.errors';
import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { USER_REPOSITORY } from '../../user.di-tokens';

export class DeleteUserCommand {
  readonly userId: string;
  readonly requesterId: string;

  constructor(props: DeleteUserCommand) {
    this.userId = props.userId;
    this.requesterId = props.requesterId;
  }
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: DeleteUserCommand,
  ): Promise<Result<boolean, NotFoundException | UserAccessDeniedError>> {
    if (command.userId !== command.requesterId)
      return Err(new UserAccessDeniedError());

    const found = await this.userRepo.findOneById(command.userId);
    if (found.isNone()) return Err(new NotFoundException());
    const user = found.unwrap();
    user.delete();
    const result = await this.userRepo.delete(user);
    return Ok(result);
  }
}
