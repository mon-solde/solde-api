import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  // IsAlphanumeric,
  IsEmail,
  IsEnum,
  IsPhoneNumber,
  IsString,
  // Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRoles } from '@modules/user/domain/user.types';

registerEnumType(UserRoles, { name: 'UserRoles' });

@ArgsType()
@InputType()
export class CreateUserGqlRequestDto {
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  @Field()
  readonly email: string;

  @IsPhoneNumber()
  @Field()
  readonly phone: string;

  @MaxLength(50)
  @MinLength(2)
  @IsString()
  @Field()
  readonly firstName: string;

  @MaxLength(50)
  @MinLength(2)
  @IsString()
  @Field()
  readonly lastName: string;

  @IsEnum(UserRoles)
  @Field(() => UserRoles)
  readonly role: UserRoles;

  // @MaxLength(50) @MinLength(4) @IsString() @Matches(/^[a-zA-Z ]*$/)
  // @Field() readonly country: string;

  // @MaxLength(10) @MinLength(4) @IsAlphanumeric()
  // @Field() readonly postalCode: string;

  // @MaxLength(50) @MinLength(5) @Matches(/^[a-zA-Z ]*$/)
  // @Field() readonly street: string;
}
