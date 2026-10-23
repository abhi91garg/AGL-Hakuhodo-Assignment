import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { DatabaseService } from "../src/storage/database.js";

describe("SQLite snapshot persistence", () => {
  it("returns the make/type shape and freshness from a single joined read", () => {
    const database = new DatabaseService(new Database(":memory:"));
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
    const database = new DatabaseService(new Database(":memory:"));
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
});