import { Logger, Module, Provider } from '@nestjs/common';
import { UserRepository } from './database/user.repository';
import { DeleteUserHttpController } from './commands/delete-user/delete-user.http-controller';
import { FindUsersHttpController } from './queries/find-users/find-users.http.controller';
import { CreateUserService } from './commands/create-user/create-user.service';
import { UpdateUserNameService } from './commands/update-user-name/update-user-name.service';
import { DeleteUserService } from './commands/delete-user/delete-user.service';
import { FindUsersQueryHandler } from './queries/find-users/find-users.query-handler';
import { UserMapper } from './user.mapper';
import { CqrsModule } from '@nestjs/cqrs';
import { USER_REPOSITORY } from './user.di-tokens';
import { FindUsersGraphqlResolver } from './queries/find-users/find-users.graphql-resolver';

const httpControllers = [DeleteUserHttpController, FindUsersHttpController];

const graphqlResolvers: Provider[] = [FindUsersGraphqlResolver];

// CreateUserCommand/UpdateUserNameCommand have no controller of their own —
// dispatched internally by contact/account.
const commandHandlers: Provider[] = [
  CreateUserService,
  UpdateUserNameService,
  DeleteUserService,
];

const eventHandlers: Provider[] = [];

const queryHandlers: Provider[] = [FindUsersQueryHandler];

const mappers: Provider[] = [UserMapper];

const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...graphqlResolvers,
    ...eventHandlers,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class UserModule {}
