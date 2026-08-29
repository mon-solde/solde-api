import { UserRepositoryPort } from './user.repository.port';
import { UserMapper } from '../user.mapper';
import { UserEntity } from '../domain/user.entity';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';

export type UserModel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string | null;
  role: 'ACCOUNT' | 'CONTACT';
};

@Injectable()
export class UserRepository
  extends PrismaRepositoryBase<UserEntity, UserModel>
  implements UserRepositoryPort
{
  protected modelName = 'user';

  constructor(
    prisma: PrismaService,
    mapper: UserMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(UserRepository.name));
  }

  // Only firstName/lastName are ever updated post-creation — role and id
  // are fixed for the lifetime of a User.
  async save(entity: UserEntity): Promise<void> {
    const props = entity.getProps();
    await this.client.user.update({
      where: { id: entity.id },
      data: { firstName: props.firstName, lastName: props.lastName ?? null },
    });
  }
}
