import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { NotFoundException } from '@libs/exceptions';
import { PostgresErrorCode } from '@libs/db/prisma-error.codes';
import { DeleteUserCommand } from '@modules/user/commands/delete-user/delete-user.service';
import { UserAccessDeniedError } from '@modules/user/domain/user.errors';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import {
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';

export class DeleteContactCommand {
  readonly contactId: string;
  readonly requesterId: string;

  constructor(props: DeleteContactCommand) {
    Object.assign(this, props);
  }
}

export type DeleteContactResult = { hardDeleted: boolean };

@CommandHandler(DeleteContactCommand)
export class DeleteContactService implements ICommandHandler {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: DeleteContactCommand,
  ): Promise<
    Result<DeleteContactResult, ContactNotFoundError | ContactAccessDeniedError>
  > {
    const found = await this.contactRepo.findOneById(command.contactId);
    if (found.isNone()) return Err(new ContactNotFoundError());

    const contact = found.unwrap();
    if (!contact.isOwnedBy(command.requesterId))
      return Err(new ContactAccessDeniedError());

    contact.delete();

    type DeleteOutcome = 'hardDeleted' | 'softDeleted' | 'userNotFound';

    const outcome: DeleteOutcome = await this.contactRepo.transaction(
      async (): Promise<DeleteOutcome> => {
        try {
          // requesterId === userId here is legitimate, not a bypass — access
          // was already verified above via contact.isOwnedBy(). Its Result
          // must be checked — a dispatched Command that fails returns Err,
          // it doesn't throw, so ignoring it would report a successful
          // delete that never actually happened.
          const userDeleteResult: Result<
            boolean,
            NotFoundException | UserAccessDeniedError
          > = await this.commandBus.execute(
            new DeleteUserCommand({
              userId: contact.id,
              requesterId: contact.id,
            }),
          );
          if (userDeleteResult.isErr()) {
            const error = userDeleteResult.unwrapErr();
            // Only NotFoundException is reachable here —
            // UserAccessDeniedError can't be, since requesterId === userId
            // always in this call. Translated so the controller doesn't
            // need to know about another module's error type — but only
            // for the case we recognize; anything else (like that
            // supposedly-unreachable one, if it ever fires) surfaces as-is
            // instead of being silently mislabeled.
            if (error instanceof NotFoundException) return 'userNotFound';
            throw error;
          }
          await this.contactRepo.publishDeletedEvent(contact);
          return 'hardDeleted';
        } catch (error: any) {
          if (error.cause?.code !== PostgresErrorCode.RestrictViolation) {
            throw error;
          }
          // Contact has real history (debts, expense payments, ...) — hide
          // it instead of destroying it.
          await this.contactRepo.delete(contact);
          return 'softDeleted';
        }
      },
    );

    // Only reachable if the User row was already gone despite the Contact
    // existing — an invariant violation, not a normal business outcome.
    if (outcome === 'userNotFound') return Err(new ContactNotFoundError());

    return Ok({ hardDeleted: outcome === 'hardDeleted' });
  }
}
