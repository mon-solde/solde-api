import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { ContactEntity } from './domain/contact.entity';
import { ContactModel } from './database/contact.repository';
import { ContactResponseDto } from './dtos/contact.response.dto';

@Injectable()
export class ContactMapper
  implements Mapper<ContactEntity, ContactModel, ContactResponseDto>
{
  toPersistence(entity: ContactEntity): ContactModel {
    const copy = entity.getProps();
    return {
      userId: copy.id,
      ownerId: copy.ownerId,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      user: {
        firstName: copy.firstName,
        lastName: copy.lastName ?? null,
      },
    };
  }

  toDomain(record: ContactModel): ContactEntity {
    return new ContactEntity({
      id: record.userId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        ownerId: record.ownerId,
        firstName: record.user.firstName,
        lastName: record.user.lastName ?? undefined,
      },
    });
  }

  toResponse(entity: ContactEntity): ContactResponseDto {
    const props = entity.getProps();
    const dto = new ContactResponseDto(entity);
    dto.ownerId = props.ownerId;
    dto.firstName = props.firstName;
    dto.lastName = props.lastName;
    return dto;
  }
}
