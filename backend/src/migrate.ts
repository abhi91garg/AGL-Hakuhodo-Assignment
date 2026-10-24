import "reflect-metadata";
import { loadConfig } from "./config.js";
import { migrateDatabase, openSqlite } from "./storage/database.js";

const database = openSqlite(loadConfig().databasePath);
try {
  migrateDatabase(database);
  console.log(JSON.stringify({ event: "database_migrated" }));
} finally {
  database.close();
}
