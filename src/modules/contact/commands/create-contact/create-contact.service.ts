import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { CreateUserCommand } from '@modules/user/commands/create-user/create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import { ContactEntity } from '../../domain/contact.entity';
import { ContactDuplicateNameError } from '../../domain/contact.errors';
import { normalizeFullName } from '../../domain/normalize-full-name';
import { CreateContactCommand } from './create-contact.command';

@CommandHandler(CreateContactCommand)
export class CreateContactService implements ICommandHandler {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: CreateContactCommand,
  ): Promise<
    Result<AggregateID, ContactDuplicateNameError | UserAlreadyExistsError>
  > {
    if (!command.skipDuplicateNameCheck) {
      const duplicate = await this.findSameNamedContact(command);
      if (duplicate) {
        return Err(
          new ContactDuplicateNameError(duplicate.id, duplicate.hidden),
        );
      }
    }

    const contact = ContactEntity.create({
      ownerId: command.ownerId,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    // The shared CTI base User row is created here (via user's own Command,
    // never written directly), atomically with the Contact row, inside the
    // same transaction. Its Result must be checked — a
    // dispatched Command that fails returns Err, it doesn't throw, so
    // ignoring it would silently insert the Contact row regardless.
    const userResult: Result<AggregateID, UserAlreadyExistsError> =
      await this.contactRepo.transaction(async () => {
        const result: Result<AggregateID, UserAlreadyExistsError> =
          await this.commandBus.execute(
            new CreateUserCommand({
              id: contact.id,
              firstName: command.firstName,
              lastName: command.lastName,
              role: 'CONTACT',
            }),
          );
        if (result.isOk()) {
          await this.contactRepo.insert(contact);
        }
        return result;
      });

    if (userResult.isErr()) return userResult;
    return Ok(contact.id);
  }

  private async findSameNamedContact(command: CreateContactCommand) {
    const incomingName = normalizeFullName(command.firstName, command.lastName);
    const existingContacts =
      await this.contactRepo.findAllByOwnerIdIncludingHidden(command.ownerId);
    return existingContacts.find(
      (contact) =>
        normalizeFullName(contact.firstName, contact.lastName ?? undefined) ===
        incomingName,
    );
  }
}
