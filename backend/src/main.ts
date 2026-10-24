import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { APP_CONFIG } from "./app.module.js";
import { loadConfig } from "./config.js";
import type { AppConfig } from "./config.js";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { logger: false });
  const enabledLogLevels = {
    error: ["error"],
    warn: ["error", "warn"],
    log: ["error", "warn", "log"],
    debug: ["error", "warn", "log", "debug"],
    verbose: ["error", "warn", "log", "debug", "verbose"],
  } as const;
  app.useLogger(
    new ConsoleLogger({
      json: true,
      colors: false,
      logLevels: [...enabledLogLevels[config.logLevel]],
    })
  );
  app.enableShutdownHooks();
  const validatedConfig = app.get<AppConfig>(APP_CONFIG);
  await app.listen(validatedConfig.port);
  console.log(JSON.stringify({ event: "server_listening", port: config.port }));
}

bootstrap().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "server_start_failed",
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exitCode = 1;
});
