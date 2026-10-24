import { Inject } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import { DatabaseService } from "../storage/database.js";
import { IngestionStatusObject, MakeObject } from "./models.js";

@Resolver(() => MakeObject)
export class MakesResolver {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Query(() => [MakeObject], { name: "makes" })
  listMakes() {
    return this.database.listMakes();
  }

  @Query(() => IngestionStatusObject, { name: "ingestionStatus" })
  getIngestionStatus() {
    return this.database.getIngestionStatus();
  }
}