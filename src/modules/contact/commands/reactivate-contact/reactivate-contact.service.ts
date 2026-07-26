import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import {
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';

export class ReactivateContactCommand {
  readonly contactId: string;
  readonly requesterId: string;

  constructor(props: ReactivateContactCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(ReactivateContactCommand)
export class ReactivateContactService implements ICommandHandler {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
  ) {}

  async execute(
    command: ReactivateContactCommand,
  ): Promise<Result<boolean, ContactNotFoundError | ContactAccessDeniedError>> {
    const contact = await this.contactRepo.findOneByIdIncludingHidden(
      command.contactId,
    );
    if (!contact) return Err(new ContactNotFoundError());

    if (contact.ownerId !== command.requesterId)
      return Err(new ContactAccessDeniedError());

    await this.contactRepo.reactivate(command.contactId);
    return Ok(true);
  }
}
