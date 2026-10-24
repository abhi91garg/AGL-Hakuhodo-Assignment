import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { DatabaseService, migrateDatabase } from "../src/storage/database.js";

function createDatabaseService() {
  const sqlite = new Database(":memory:");
  migrateDatabase(sqlite);
  return new DatabaseService(sqlite);
}

describe("SQLite snapshot persistence", () => {
  it("expects the explicit migration to run before database access", () => {
    const sqlite = new Database(":memory:");
    const database = new DatabaseService(sqlite);
    try {
      assert.throws(() => database.listMakes(), /no such table: makes/);
    } finally {
      database.close();
    }
  });

  it("returns the make/type shape and freshness from a single joined read", () => {
    const database = createDatabaseService();
    try {
      const status = database.replaceSnapshot(
        [
          {
            makeId: 440,
            makeName: "Example Make",
            vehicleTypes: [{ typeId: 2, typeName: "Passenger Car" }],
          },
        ],
        "run-1"
      );

      assert.deepEqual(database.listMakes(), [
        {
          makeId: 440,
          makeName: "Example Make",
          vehicleTypes: [{ typeId: 2, typeName: "Passenger Car" }],
        },
      ]);
      assert.deepEqual(database.getIngestionStatus(), status);
      assert.match(status.lastSuccessfulIngestionAt ?? "", /^\d{4}-\d\d-\d\dT/);
    } finally {
      database.close();
    }
  });

  it("rolls back records and freshness when snapshot insertion fails", () => {
    const database = createDatabaseService();
    try {
      database.replaceSnapshot(
        [{ makeId: 440, makeName: "Keep Me", vehicleTypes: [] }],
        "run-before"
      );
      const statusBefore = database.getIngestionStatus();

      assert.throws(() =>
        database.replaceSnapshot(
          [
            {
              makeId: 1,
              makeName: "Duplicate Types",
              vehicleTypes: [
                { typeId: 2, typeName: "Passenger Car" },
                { typeId: 2, typeName: "Duplicate" },
              ],
            },
          ],
          "run-after"
        )
      );

      assert.deepEqual(database.listMakes(), [
        { makeId: 440, makeName: "Keep Me", vehicleTypes: [] },
      ]);
      assert.deepEqual(database.getIngestionStatus(), statusBefore);
    } finally {
      database.close();
    }
  });

  it("replaces a complete snapshot without leaving duplicate makes", () => {
    const database = createDatabaseService();
    try {
      const snapshot = [
        {
          makeId: 440,
          makeName: "Example Make",
          vehicleTypes: [{ typeId: 2, typeName: "Passenger Car" }],
        },
      ];
      database.replaceSnapshot(snapshot, "run-1");
      database.replaceSnapshot(snapshot, "run-2");

      assert.equal(database.listMakes().length, 1);
      assert.equal(database.getIngestionStatus().runId, "run-2");
    } finally {
      database.close();
    }
  });
});
