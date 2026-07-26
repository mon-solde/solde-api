import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
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
  ) {}

  async execute(
    command: UpdateContactCommand,
  ): Promise<
    Result<boolean, ContactNotFoundError | ContactAccessDeniedError>
  > {
    const found = await this.contactRepo.findOneById(command.contactId);
    if (found.isNone()) return Err(new ContactNotFoundError());

    const contact = found.unwrap();
    if (!contact.isOwnedBy(command.requesterId))
      return Err(new ContactAccessDeniedError());

    contact.rename(command.firstName, command.lastName);
    await this.contactRepo.save(contact);
    return Ok(true);
  }
}
