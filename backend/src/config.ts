import "dotenv/config";

function integerSetting(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const config = {
    port: integerSetting("PORT", environment.PORT, 4000, 1, 65535),
    databasePath: environment.DATABASE_PATH ?? "./data/nhtsa.sqlite",
    maxConcurrency: integerSetting(
      "NHTSA_MAX_CONCURRENCY",
      environment.NHTSA_MAX_CONCURRENCY,
      5,
      1,
      8
    ),
    requestTimeoutMs: integerSetting(
      "NHTSA_REQUEST_TIMEOUT_MS",
      environment.NHTSA_REQUEST_TIMEOUT_MS,
      10000,
      1000,
      60000
    ),
    maxRetries: integerSetting(
      "NHTSA_MAX_RETRIES",
      environment.NHTSA_MAX_RETRIES,
      2,
      0,
      5
    ),
    retryBaseDelayMs: integerSetting(
      "NHTSA_RETRY_BASE_DELAY_MS",
      environment.NHTSA_RETRY_BASE_DELAY_MS,
      500,
      0,
      5000
    ),
    retryMaxDelayMs: integerSetting(
      "NHTSA_RETRY_MAX_DELAY_MS",
      environment.NHTSA_RETRY_MAX_DELAY_MS,
      5000,
      0,
      10000
    ),
    makesUrl: "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=XML",
    typesUrl: "https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId",
  };

  if (config.retryBaseDelayMs > config.retryMaxDelayMs) {
    throw new Error("NHTSA_RETRY_BASE_DELAY_MS cannot exceed NHTSA_RETRY_MAX_DELAY_MS.");
  }
  if (!config.databasePath.trim()) {
    throw new Error("DATABASE_PATH must not be empty.");
  }

  return config;
}

export type AppConfig = ReturnType<typeof loadConfig>;