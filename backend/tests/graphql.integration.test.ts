import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import Database from "better-sqlite3";
import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/storage/database.js";

describe("GraphQL API", () => {
  let app: INestApplication;
  let database: DatabaseService;

  before(async () => {
    database = new DatabaseService(new Database(":memory:"));
    database.replaceSnapshot(
      [
        {
          makeId: 440,
          makeName: "Example Make",
          vehicleTypes: [{ typeId: 2, typeName: "Passenger Car" }],
        },
      ],
      "integration-run"
    );

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it("returns persisted makes and vehicle types in the documented shape", async () => {
    const response = await request(app.getHttpServer())
      .post("/graphql")
      .send({
        query: "{ makes { makeId makeName vehicleTypes { typeId typeName } } }",
      });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.makes, [
      {
        makeId: 440,
        makeName: "Example Make",
        vehicleTypes: [{ typeId: 2, typeName: "Passenger Car" }],
      },
    ]);
  });

  it("exposes last successful ingestion separately from the required makes shape", async () => {
    const response = await request(app.getHttpServer())
      .post("/graphql")
      .send({ query: "{ ingestionStatus { lastSuccessfulIngestionAt makeCount vehicleTypeCount runId } }" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.ingestionStatus.makeCount, 1);
    assert.equal(response.body.data.ingestionStatus.vehicleTypeCount, 1);
    assert.equal(response.body.data.ingestionStatus.runId, "integration-run");
  });
});