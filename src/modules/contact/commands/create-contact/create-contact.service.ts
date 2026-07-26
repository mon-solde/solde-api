import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
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
  ) {}

  async execute(
    command: CreateContactCommand,
  ): Promise<Result<AggregateID, ContactDuplicateNameError>> {
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

    await this.contactRepo.transaction(
      async () => await this.contactRepo.insert(contact),
    );

    return Ok(contact.id);
  }

  private async findSameNamedContact(command: CreateContactCommand) {
    const incomingName = normalizeFullName(command.firstName, command.lastName);
    const existingContacts = await this.contactRepo.findAllByOwnerIdIncludingHidden(
      command.ownerId,
    );
    return existingContacts.find(
      (contact) =>
        normalizeFullName(contact.firstName, contact.lastName ?? undefined) ===
        incomingName,
    );
  }
}
