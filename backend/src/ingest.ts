import "reflect-metadata";
import { loadConfig } from "./config.js";
import { runIngestion } from "./ingestion/ingest-service.js";
import { DatabaseService, openSqlite } from "./storage/database.js";

async function ingest() {
  const config = loadConfig();
  const database = new DatabaseService(openSqlite(config.databasePath));
  try {
    await runIngestion(config, database);
  } finally {
    database.close();
  }
}

ingest().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "ingestion_failed",
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exitCode = 1;
});