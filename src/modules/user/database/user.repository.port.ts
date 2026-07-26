import { PaginatedQueryParams, RepositoryPort } from '@libs/ddd';
import { UserEntity } from '../domain/user.entity';

export interface FindUsersParams extends PaginatedQueryParams {
  readonly country?: string;
  readonly postalCode?: string;
  readonly street?: string;
  readonly name?: string;
}

export interface UserRepositoryPort extends RepositoryPort<UserEntity> {}
