import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";
import { fetchNhtsaXml } from "../src/ingestion/nhtsa-client.js";

const config = loadConfig({});

describe("NHTSA HTTP client", () => {
  it("retries a 429 using Retry-After and then returns XML", async () => {
    let calls = 0;
    const delays: number[] = [];
    const xml = await fetchNhtsaXml("https://example.test", config, {
      fetchImpl: async () => {
        calls += 1;
        return calls === 1
          ? new Response("", { status: 429, headers: { "retry-after": "2" } })
          : new Response("<Response />", { status: 200 });
      },
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
      log: () => undefined,
    });

    assert.equal(xml, "<Response />");
    assert.equal(calls, 2);
    assert.deepEqual(delays, [2000]);
  });

  it("retries a 503 then returns XML", async () => {
    let calls = 0;
    const xml = await fetchNhtsaXml("https://example.test", config, {
      fetchImpl: async () => {
        calls += 1;
        return calls === 1
          ? new Response("", { status: 503 })
          : new Response("<Response />", { status: 200 });
      },
      sleep: async () => undefined,
      log: () => undefined,
    });

    assert.equal(xml, "<Response />");
    assert.equal(calls, 2);
  });

  it("does not retry a permanent client error", async () => {
    let calls = 0;
    await assert.rejects(
      fetchNhtsaXml("https://example.test", config, {
        fetchImpl: async () => {
          calls += 1;
          return new Response("bad request", { status: 400 });
        },
        sleep: async () => undefined,
        log: () => undefined,
      }),
      /HTTP 400/
    );
    assert.equal(calls, 1);
  });

  it("stops instead of retrying earlier than an excessive Retry-After", async () => {
    let calls = 0;
    await assert.rejects(
      fetchNhtsaXml("https://example.test", config, {
        fetchImpl: async () => {
          calls += 1;
          return new Response("", { status: 429, headers: { "retry-after": "60" } });
        },
        sleep: async () => undefined,
        log: () => undefined,
      }),
      /Retry-After exceeds/
    );
    assert.equal(calls, 1);
  });
});