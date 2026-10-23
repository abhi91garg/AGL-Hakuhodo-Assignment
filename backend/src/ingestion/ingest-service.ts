import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config.js";
import { DatabaseService } from "../storage/database.js";
import type { MakeWithVehicleTypes } from "../types.js";
import { parseMakesXml, parseVehicleTypesXml } from "./xml-parser.js";
import { fetchNhtsaXml } from "./nhtsa-client.js";

type Logger = (event: Record<string, string | number | boolean | null>) => void;

type IngestionDependencies = {
  fetchXml?: typeof fetchNhtsaXml;
  log?: Logger;
  runId?: string;
};

export async function runIngestion(
  config: AppConfig,
  database: DatabaseService,
  dependencies: IngestionDependencies = {}
) {
  const fetchXml = dependencies.fetchXml ?? fetchNhtsaXml;
  const log = dependencies.log ?? ((event) => console.log(JSON.stringify(event)));
  const runId = dependencies.runId ?? randomUUID();
  const startedAt = Date.now();
  log({ event: "ingestion_started", runId });

  const makes = parseMakesXml(await fetchXml(config.makesUrl, config));
  const uniqueMakes = new Map<number, string>();
  for (const make of makes) {
    const existingName = uniqueMakes.get(make.makeId);
    if (existingName !== undefined && existingName !== make.makeName) {
      throw new Error(`GetAllMakes returned conflicting names for make ${make.makeId}.`);
    }
    uniqueMakes.set(make.makeId, make.makeName);
  }
  if (uniqueMakes.size === 0) {
    throw new Error("GetAllMakes returned no makes; existing data was preserved.");
  }

  const makeEntries = Array.from(uniqueMakes, ([makeId, makeName]) => ({ makeId, makeName }));
  const results = new Array<MakeWithVehicleTypes>(makeEntries.length);
  const failures: Array<{ makeId: number; error: string }> = [];
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const make = makeEntries[index];
      if (!make) return;

      try {
        const url = `${config.typesUrl}/${make.makeId}?format=xml`;
        const xml = await fetchXml(url, config);
        results[index] = {
          ...make,
          vehicleTypes: parseVehicleTypesXml(xml),
        };
        completed += 1;
        log({
          event: "make_ingested",
          runId,
          makeId: make.makeId,
          completed,
          total: makeEntries.length,
        });
      } catch (error) {
        completed += 1;
        failures.push({
          makeId: make.makeId,
          error: error instanceof Error ? error.message : String(error),
        });
        log({
          event: "make_ingestion_failed",
          runId,
          makeId: make.makeId,
          completed,
          total: makeEntries.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(config.maxConcurrency, makeEntries.length) },
      () => worker()
    )
  );

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(({ makeId, error }) => new Error(`Make ${makeId}: ${error}`)),
      `Ingestion incomplete; ${failures.length} of ${makeEntries.length} make requests failed. Existing data was preserved.`
    );
  }

  const status = database.replaceSnapshot(results, runId);
  log({
    event: "ingestion_completed",
    runId,
    makeCount: status.makeCount,
    vehicleTypeCount: status.vehicleTypeCount,
    durationMs: Date.now() - startedAt,
  });
  return status;
}