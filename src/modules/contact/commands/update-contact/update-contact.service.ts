import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { UpdateUserNameCommand } from '@modules/user/commands/update-user-name/update-user-name.service';
import { UserNotFoundError } from '@modules/user/domain/user.errors';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import {
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';

export class UpdateContactCommand {
  readonly contactId: string;
  readonly requesterId: string;
  readonly firstName: string;
  readonly lastName?: string;

  constructor(props: UpdateContactCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(UpdateContactCommand)
export class UpdateContactService implements ICommandHandler {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: UpdateContactCommand,
  ): Promise<Result<boolean, ContactNotFoundError | ContactAccessDeniedError>> {
    const found = await this.contactRepo.findOneById(command.contactId);
    if (found.isNone()) return Err(new ContactNotFoundError());

    const contact = found.unwrap();
    if (!contact.isOwnedBy(command.requesterId))
      return Err(new ContactAccessDeniedError());

    // firstName/lastName live on the shared User row — renaming a Contact
    // goes through the user module's own Command, never a direct write. Its
    // Result must be checked — a dispatched Command that fails returns Err,
    // it doesn't throw.
    const renameResult: Result<void, UserNotFoundError> =
      await this.contactRepo.transaction(() =>
        this.commandBus.execute(
          new UpdateUserNameCommand({
            id: contact.id,
            firstName: command.firstName,
            lastName: command.lastName,
          }),
        ),
      );

    if (renameResult.isErr()) {
      const error = renameResult.unwrapErr();
      // Only reachable if the User row was already gone despite the Contact
      // existing — an invariant violation. Translated to ContactNotFoundError
      // so the controller doesn't need to know about another module's error
      // type — but only for the specific case we recognize; anything else
      // surfaces as-is instead of being silently mislabeled.
      if (error instanceof UserNotFoundError) return Err(new ContactNotFoundError());
      throw error;
    }
    return Ok(true);
  }
}
