import "reflect-metadata";
import { loadConfig } from "./config.js";
import { DatabaseService, openSqlite } from "./storage/database.js";

const database = new DatabaseService(openSqlite(loadConfig().databasePath));
database.close();
console.log(JSON.stringify({ event: "database_migrated" }));