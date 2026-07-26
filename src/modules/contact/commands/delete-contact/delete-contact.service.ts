import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
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
    const hardDeleted = await this.contactRepo.delete(contact);

    return Ok({ hardDeleted });
  }
}
