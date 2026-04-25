import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { WalletRepositoryPort } from './wallet.repository.port';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletMapper } from '../wallet.mapper';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';

export type WalletModel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  balance: number;
  userId: string;
};

@Injectable()
export class WalletRepository
  extends PrismaRepositoryBase<WalletEntity, WalletModel>
  implements WalletRepositoryPort
{
  protected modelName = 'wallet';

  constructor(
    prisma: PrismaService,
    mapper: WalletMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(WalletRepository.name));
  }
}
