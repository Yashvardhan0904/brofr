import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Address {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;

  @Field()
  line1: string;

  @Field(() => String, { nullable: true })
  line2?: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  pincode: string;

  @Field()
  country: string;

  @Field()
  isDefault: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
