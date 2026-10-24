import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { loadConfig } from "../src/config.js";
import { runIngestion } from "../src/ingestion/ingest-service.js";
import { DatabaseService, migrateDatabase } from "../src/storage/database.js";

function createDatabaseService() {
  const sqlite = new Database(":memory:");
  migrateDatabase(sqlite);
  return new DatabaseService(sqlite);
}

const makesXml = readFileSync(
  fileURLToPath(new URL("./fixtures/get-all-makes.sample.xml", import.meta.url)),
  "utf8"
);
const typesXml = readFileSync(
  fileURLToPath(new URL("./fixtures/vehicle-types-440.sample.xml", import.meta.url)),
  "utf8"
);

describe("NHTSA ingestion", () => {
  it("fetches each unique make with bounded concurrency and stores the combined snapshot", async () => {
    const database = createDatabaseService();
    const config = loadConfig({ NHTSA_MAX_CONCURRENCY: "2" });
    const calls: number[] = [];
    const logs: Array<Record<string, string | number | boolean | null>> = [];
    let activeRequests = 0;
    let maximumActiveRequests = 0;

    try {
      const status = await runIngestion(config, database, {
        runId: "run-success",
        log: (event) => logs.push(event),
        fetchXml: async (url) => {
          if (url === config.makesUrl) return makesXml;
          const makeId = Number(url.split("/").at(-1)?.split("?")[0]);
          calls.push(makeId);
          activeRequests += 1;
          maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
          await new Promise((resolve) => setTimeout(resolve, 2));
          activeRequests -= 1;
          return typesXml;
        },
      });

      assert.equal(status.makeCount, 3);
      assert.equal(status.vehicleTypeCount, 6);
      assert.equal(maximumActiveRequests, 2);
      assert.deepEqual(calls.sort((a, b) => a - b), [4877, 11257, 12858]);
      assert.equal(database.listMakes().length, 3);
      assert.equal(logs.at(-1)?.event, "ingestion_completed");
    } finally {
      database.close();
    }
  });

  it("preserves the prior snapshot and freshness after a partial request failure", async () => {
    const database = createDatabaseService();
    const config = loadConfig({ NHTSA_MAX_CONCURRENCY: "2" });
    database.replaceSnapshot(
      [{ makeId: 440, makeName: "Existing Make", vehicleTypes: [] }],
      "run-existing"
    );
    const previousStatus = database.getIngestionStatus();

    try {
      await assert.rejects(
        runIngestion(config, database, {
          fetchXml: async (url) => {
            if (url === config.makesUrl) return makesXml;
            if (url.includes("/4877?")) throw new Error("HTTP 503");
            return typesXml;
          },
          log: () => undefined,
        }),
        /Ingestion incomplete/
      );
      assert.deepEqual(database.listMakes(), [
        { makeId: 440, makeName: "Existing Make", vehicleTypes: [] },
      ]);
      assert.deepEqual(database.getIngestionStatus(), previousStatus);
    } finally {
      database.close();
    }
  });

  it("preserves existing data if the all-makes response is unexpectedly empty", async () => {
    const database = createDatabaseService();
    const config = loadConfig({});
    database.replaceSnapshot(
      [{ makeId: 440, makeName: "Existing Make", vehicleTypes: [] }],
      "run-existing"
    );
    const previousStatus = database.getIngestionStatus();

    try {
      await assert.rejects(
        runIngestion(config, database, {
          fetchXml: async () => "<Response><Count>0</Count><Results /></Response>",
          log: () => undefined,
        }),
        /returned no makes/
      );
      assert.deepEqual(database.getIngestionStatus(), previousStatus);
      assert.equal(database.listMakes()[0]?.makeId, 440);
    } finally {
      database.close();
    }
  });
});
