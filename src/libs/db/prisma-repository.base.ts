import { RequestContextService } from '@libs/application/context/AppRequestContext';
import { AggregateRoot, PaginatedQueryParams, Paginated } from '@libs/ddd';
import { Mapper } from '@libs/ddd';
import { RepositoryPort } from '@libs/ddd';
import { ConflictException } from '@libs/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaService } from './prisma.service';
import { PrismaErrorCode } from './prisma-error.codes';
import { LoggerPort } from '../ports/logger.port';
import { ObjectLiteral } from '../types';

export abstract class PrismaRepositoryBase<
  Aggregate extends AggregateRoot<any>,
  DbModel extends ObjectLiteral,
> implements RepositoryPort<Aggregate>
{
  protected abstract modelName: string;

  protected constructor(
    private readonly _prisma: PrismaService,
    protected readonly mapper: Mapper<Aggregate, DbModel>,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly logger: LoggerPort,
  ) {}

  /**
   * Get Prisma client.
   * If a global request transaction is started,
   * returns the transaction client instead.
   */
  protected get client(): any {
    return RequestContextService.getTransactionConnection() ?? this._prisma;
  }

  /**
   * Access the Prisma model delegate dynamically (e.g. prisma.user, prisma.wallet)
   */
  protected get model(): any {
    return (this.client as any)[this.modelName];
  }

  async findOneById(id: string): Promise<Option<Aggregate>> {
    const result = await this.model.findUnique({ where: { id } });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAll(): Promise<Aggregate[]> {
    const results = await this.model.findMany();
    return results.map(this.mapper.toDomain);
  }

  async findAllPaginated(
    params: PaginatedQueryParams,
  ): Promise<Paginated<Aggregate>> {
    const [results, count] = await Promise.all([
      this.model.findMany({
        take: params.limit,
        skip: params.offset,
      }),
      this.model.count(),
    ]);

    return new Paginated({
      data: results.map(this.mapper.toDomain),
      count,
      limit: params.limit,
      page: params.page,
    });
  }

  async delete(entity: Aggregate): Promise<boolean> {
    entity.validate();

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] deleting entity ${
        entity.id
      } from ${this.modelName}`,
    );

    await this.model.delete({ where: { id: entity.id } });

    await entity.publishEvents(this.logger, this.eventEmitter);

    return true;
  }

  /**
   * Inserts an entity to a database
   * (also publishes domain events and waits for completion)
   */
  async insert(entity: Aggregate | Aggregate[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    const records = entities.map(this.mapper.toPersistence);

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] inserting ${
        entities.length
      } entities into "${this.modelName}"`,
    );

    try {
      if (records.length === 1) {
        await this.model.create({ data: records[0] });
      } else {
        await this.model.createMany({ data: records });
      }
    } catch (error: any) {
      if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
        this.logger.debug(
          `[${RequestContextService.getRequestId()}] ${error.message}`,
        );
        throw new ConflictException('Record already exists', error);
      }
      throw error;
    }

    await Promise.all(
      entities.map((e) => e.publishEvents(this.logger, this.eventEmitter)),
    );
  }

  /**
   * Start a global transaction to save
   * results of all event handlers in one operation
   */
  public async transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this._prisma.$transaction(
      async (tx) => {
        this.logger.debug(
          `[${RequestContextService.getRequestId()}] transaction started`,
        );
        if (!RequestContextService.getTransactionConnection()) {
          RequestContextService.setTransactionConnection(tx);
        }

        try {
          const result = await handler();
          this.logger.debug(
            `[${RequestContextService.getRequestId()}] transaction committed`,
          );
          return result;
        } catch (e) {
          this.logger.debug(
            `[${RequestContextService.getRequestId()}] transaction aborted`,
          );
          throw e;
        } finally {
          RequestContextService.cleanTransactionConnection();
        }
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }
}
