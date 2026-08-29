import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { ConflictException } from '@libs/exceptions';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserEntity } from '@modules/user/domain/user.entity';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { USER_REPOSITORY } from '../../user.di-tokens';
import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserService implements ICommandHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<AggregateID, UserAlreadyExistsError>> {
    const user = UserEntity.create({
      id: command.id,
      firstName: command.firstName,
      lastName: command.lastName,
      role: command.role,
    });

    try {
      await this.userRepo.transaction(() => this.userRepo.insert(user));
      return Ok(user.id);
    } catch (error: any) {
      if (error instanceof ConflictException) {
        return Err(new UserAlreadyExistsError(error));
      }
      throw error;
    }
  }
}
