import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class VehicleTypeObject {
  @Field(() => Int)
  typeId!: number;

  @Field(() => String)
  typeName!: string;
}

@ObjectType()
export class MakeObject {
  @Field(() => Int)
  makeId!: number;

  @Field(() => String)
  makeName!: string;

  @Field(() => [VehicleTypeObject])
  vehicleTypes!: VehicleTypeObject[];
}

@ObjectType()
export class IngestionStatusObject {
  @Field(() => String, { nullable: true })
  lastSuccessfulIngestionAt!: string | null;

  @Field(() => Int)
  makeCount!: number;

  @Field(() => Int)
  vehicleTypeCount!: number;

  @Field(() => String, { nullable: true })
  runId!: string | null;
}