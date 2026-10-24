import type { AppConfig } from "../config.js";

type Logger = (event: Record<string, string | number | boolean | null>) => void;
type FetchFunction = typeof fetch;

type RequestDependencies = {
  fetchImpl?: FetchFunction;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  log?: Logger;
  now?: () => number;
};

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryAfterMilliseconds(value: string | null, now: number) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) && date > now ? date - now : null;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchNhtsaXml(
  url: string,
  config: AppConfig,
  dependencies: RequestDependencies = {}
) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep = dependencies.sleep ?? defaultSleep;
  const random = dependencies.random ?? Math.random;
  const log = dependencies.log ?? ((event) => console.log(JSON.stringify(event)));
  const now = dependencies.now ?? Date.now;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        signal: AbortSignal.timeout(config.requestTimeoutMs),
        headers: { accept: "application/xml, text/xml" },
      });
    } catch (error) {
      if (attempt >= config.maxRetries) throw error;
      const delay = Math.min(
        config.retryMaxDelayMs,
        config.retryBaseDelayMs * 2 ** attempt
      );
      const jitteredDelay = Math.min(
        config.retryMaxDelayMs,
        Math.round(delay * (0.8 + random() * 0.4))
      );
      log({ event: "nhtsa_retry", attempt: attempt + 1, delayMs: jitteredDelay, reason: "network" });
      await sleep(jitteredDelay);
      continue;
    }

    if (response.ok) return response.text();

    if (!isRetryableStatus(response.status)) {
      throw new Error(`NHTSA request failed with HTTP ${response.status}.`);
    }

    if (attempt >= config.maxRetries) {
      await response.body?.cancel();
      throw new Error(`NHTSA request failed with HTTP ${response.status} after retries.`);
    }

    const retryAfter =
      response.status === 429
        ? retryAfterMilliseconds(response.headers.get("retry-after"), now())
        : null;
    if (retryAfter !== null && retryAfter > config.retryMaxDelayMs) {
      await response.body?.cancel();
      throw new Error("NHTSA Retry-After exceeds the configured retry delay limit.");
    }

    const delay = Math.min(
      config.retryMaxDelayMs,
      retryAfter ?? config.retryBaseDelayMs * 2 ** attempt
    );
    const jitteredDelay = retryAfter === null
      ? Math.min(config.retryMaxDelayMs, Math.round(delay * (0.8 + random() * 0.4)))
      : delay;
    log({
      event: "nhtsa_retry",
      attempt: attempt + 1,
      delayMs: jitteredDelay,
      status: response.status,
    });
    await response.body?.cancel();
    await sleep(jitteredDelay);
  }

  throw new Error("NHTSA request failed unexpectedly.");
}