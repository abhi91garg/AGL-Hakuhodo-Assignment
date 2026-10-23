import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";

describe("backend configuration", () => {
  it("uses the documented defaults", () => {
    const config = loadConfig({});
    assert.equal(config.port, 4000);
    assert.equal(config.maxConcurrency, 5);
    assert.equal(config.requestTimeoutMs, 10000);
    assert.equal(config.maxRetries, 2);
    assert.equal(config.retryBaseDelayMs, 500);
    assert.equal(config.retryMaxDelayMs, 5000);
  });

  it("rejects out-of-range settings and inconsistent retry delays", () => {
    assert.throws(
      () => loadConfig({ NHTSA_MAX_CONCURRENCY: "9" }),
      /NHTSA_MAX_CONCURRENCY must be an integer/
    );
    assert.throws(
      () =>
        loadConfig({ NHTSA_RETRY_BASE_DELAY_MS: "4000", NHTSA_RETRY_MAX_DELAY_MS: "3000" }),
      /cannot exceed/
    );
  });
});