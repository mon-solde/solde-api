import { Mapper } from '@libs/ddd';
import { UserModel } from './database/user.repository';
import { UserEntity } from './domain/user.entity';
import { UserResponseDto } from './dtos/user.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMapper
  implements Mapper<UserEntity, UserModel, UserResponseDto>
{
  toPersistence(entity: UserEntity): UserModel {
    const copy = entity.getProps();
    return {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      firstName: copy.firstName,
      lastName: copy.lastName ?? null,
    };
  }

  toDomain(record: UserModel): UserEntity {
    return new UserEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        firstName: record.firstName,
        lastName: record.lastName ?? undefined,
      },
    });
  }

  toResponse(entity: UserEntity): UserResponseDto {
    const props = entity.getProps();
    const response = new UserResponseDto(entity);
    response.firstName = props.firstName;
    response.lastName = props.lastName;
    return response;
  }
}
