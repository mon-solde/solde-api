import { Logger, Module, Provider } from '@nestjs/common';
import { UserRepository } from './database/user.repository';
import { CreateUserService } from './commands/create-user/create-user.service';
import { UpdateUserNameService } from './commands/update-user-name/update-user-name.service';
import { DeleteUserService } from './commands/delete-user/delete-user.service';
import { UserMapper } from './user.mapper';
import { CqrsModule } from '@nestjs/cqrs';
import { USER_REPOSITORY } from './user.di-tokens';

// The user module has no route of its own: its commands are dispatched
// internally by contact/account.
const commandHandlers: Provider[] = [
  CreateUserService,
  UpdateUserNameService,
  DeleteUserService,
];

const eventHandlers: Provider[] = [];

const mappers: Provider[] = [UserMapper];

const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserRepository },
];

@Module({
  imports: [CqrsModule],
  providers: [
    Logger,
    ...repositories,
    ...eventHandlers,
    ...commandHandlers,
    ...mappers,
  ],
})
export class UserModule {}
