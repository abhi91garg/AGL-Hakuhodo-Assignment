import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { OnModuleDestroy } from "@nestjs/common";
import Database from "better-sqlite3";
import type { IngestionStatus, MakeWithVehicleTypes, VehicleType } from "../types.js";

type SnapshotMake = {
  makeId: number;
  makeName: string;
  vehicleTypes: VehicleType[];
};

type MakeRow = {
  makeId: number;
  makeName: string;
  typeId: number | null;
  typeName: string | null;
};

export function openSqlite(path: string) {
  if (path !== ":memory:") {
    const resolvedPath = resolve(path);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    return new Database(resolvedPath);
  }
  return new Database(path);
}

export function migrateDatabase(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS makes (
      make_id INTEGER PRIMARY KEY,
      make_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_types (
      make_id INTEGER NOT NULL REFERENCES makes(make_id) ON DELETE CASCADE,
      type_id INTEGER NOT NULL,
      type_name TEXT NOT NULL,
      PRIMARY KEY (make_id, type_id)
    );

    CREATE INDEX IF NOT EXISTS vehicle_types_type_id_idx
      ON vehicle_types(type_id);

    CREATE TABLE IF NOT EXISTS ingestion_status (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      last_successful_ingestion_at TEXT NOT NULL,
      make_count INTEGER NOT NULL,
      vehicle_type_count INTEGER NOT NULL,
      run_id TEXT NOT NULL
    );
  `);
}

export class DatabaseService implements OnModuleDestroy {
  constructor(private readonly database: Database.Database) {
    this.database.pragma("foreign_keys = ON");
    this.database.pragma("journal_mode = WAL");
  }

  replaceSnapshot(makes: SnapshotMake[], runId: string): IngestionStatus {
    const timestamp = new Date().toISOString();
    const vehicleTypeCount = makes.reduce(
      (total, make) => total + make.vehicleTypes.length,
      0
    );
    const replace = this.database.transaction(() => {
      this.database.exec("DELETE FROM vehicle_types; DELETE FROM makes;");
      const insertMake = this.database.prepare(
        "INSERT INTO makes (make_id, make_name) VALUES (?, ?)"
      );
      const insertVehicleType = this.database.prepare(
        "INSERT INTO vehicle_types (make_id, type_id, type_name) VALUES (?, ?, ?)"
      );

      for (const make of makes) {
        insertMake.run(make.makeId, make.makeName);
        for (const vehicleType of make.vehicleTypes) {
          insertVehicleType.run(make.makeId, vehicleType.typeId, vehicleType.typeName);
        }
      }

      this.database
        .prepare(
          `INSERT INTO ingestion_status (
            singleton_id, last_successful_ingestion_at, make_count, vehicle_type_count, run_id
          ) VALUES (1, ?, ?, ?, ?)
          ON CONFLICT(singleton_id) DO UPDATE SET
            last_successful_ingestion_at = excluded.last_successful_ingestion_at,
            make_count = excluded.make_count,
            vehicle_type_count = excluded.vehicle_type_count,
            run_id = excluded.run_id`
        )
        .run(timestamp, makes.length, vehicleTypeCount, runId);
    });
    replace();

    return {
      lastSuccessfulIngestionAt: timestamp,
      makeCount: makes.length,
      vehicleTypeCount,
      runId,
    };
  }

  listMakes(): MakeWithVehicleTypes[] {
    const rows = this.database
      .prepare(
        `SELECT
          makes.make_id AS makeId,
          makes.make_name AS makeName,
          vehicle_types.type_id AS typeId,
          vehicle_types.type_name AS typeName
        FROM makes
        LEFT JOIN vehicle_types ON vehicle_types.make_id = makes.make_id
        ORDER BY makes.make_name COLLATE NOCASE, vehicle_types.type_name COLLATE NOCASE`
      )
      .all() as MakeRow[];

    const makes = new Map<number, MakeWithVehicleTypes>();
    for (const row of rows) {
      let make = makes.get(row.makeId);
      if (!make) {
        make = { makeId: row.makeId, makeName: row.makeName, vehicleTypes: [] };
        makes.set(row.makeId, make);
      }
      if (row.typeId !== null && row.typeName !== null) {
        make.vehicleTypes.push({ typeId: row.typeId, typeName: row.typeName });
      }
    }
    return Array.from(makes.values());
  }

  getIngestionStatus(): IngestionStatus {
    const row = this.database
      .prepare(
        `SELECT
          last_successful_ingestion_at AS lastSuccessfulIngestionAt,
          make_count AS makeCount,
          vehicle_type_count AS vehicleTypeCount,
          run_id AS runId
        FROM ingestion_status WHERE singleton_id = 1`
      )
      .get() as IngestionStatus | undefined;

    return (
      row ?? {
        lastSuccessfulIngestionAt: null,
        makeCount: 0,
        vehicleTypeCount: 0,
        runId: null,
      }
    );
  }

  close() {
    this.database.close();
  }

  onModuleDestroy() {
    console.log(JSON.stringify({ event: "server_shutting_down" }));
    this.close();
  }
}
