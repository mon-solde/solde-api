import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CONTACT_REPOSITORY } from './contact.di-tokens';
import { ContactRepository } from './database/contact.repository';
import { ContactMapper } from './contact.mapper';
import { CreateContactHttpController } from './commands/create-contact/create-contact.http.controller';
import { CreateContactService } from './commands/create-contact/create-contact.service';
import { UpdateContactHttpController } from './commands/update-contact/update-contact.http.controller';
import { UpdateContactService } from './commands/update-contact/update-contact.service';
import { DeleteContactHttpController } from './commands/delete-contact/delete-contact.http.controller';
import { DeleteContactService } from './commands/delete-contact/delete-contact.service';
import { ReactivateContactHttpController } from './commands/reactivate-contact/reactivate-contact.http.controller';
import { ReactivateContactService } from './commands/reactivate-contact/reactivate-contact.service';
import { FindContactsHttpController } from './queries/find-contacts/find-contacts.http.controller';
import { FindContactsQueryHandler } from './queries/find-contacts/find-contacts.query-handler';

const httpControllers = [
  CreateContactHttpController,
  UpdateContactHttpController,
  DeleteContactHttpController,
  ReactivateContactHttpController,
  FindContactsHttpController,
];

const commandHandlers: Provider[] = [
  CreateContactService,
  UpdateContactService,
  DeleteContactService,
  ReactivateContactService,
];

const queryHandlers: Provider[] = [FindContactsQueryHandler];

const mappers: Provider[] = [ContactMapper];

const repositories: Provider[] = [
  { provide: CONTACT_REPOSITORY, useClass: ContactRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class ContactModule {}
