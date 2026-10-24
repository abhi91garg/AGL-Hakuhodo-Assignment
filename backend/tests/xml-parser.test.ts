import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMakesXml, parseVehicleTypesXml } from "../src/ingestion/xml-parser.js";

const makesFixture = readFileSync(
  fileURLToPath(new URL("./fixtures/get-all-makes.sample.xml", import.meta.url)),
  "utf8"
);
const vehicleTypesFixture = readFileSync(
  fileURLToPath(new URL("./fixtures/vehicle-types-440.sample.xml", import.meta.url)),
  "utf8"
);

describe("NHTSA XML parsing", () => {
  it("maps the verified all-makes XML fixture", () => {
    assert.deepEqual(parseMakesXml(makesFixture), [
      { makeId: 12858, makeName: "#1 ALPINE CUSTOMS" },
      { makeId: 4877, makeName: "1/OFF KUSTOMS, LLC" },
      { makeId: 11257, makeName: "102 IRONWORKS, INC." },
    ]);
  });

  it("maps the verified make-440 vehicle-type XML fixture", () => {
    assert.deepEqual(parseVehicleTypesXml(vehicleTypesFixture), [
      { typeId: 2, typeName: "Passenger Car" },
      { typeId: 7, typeName: "Multipurpose Passenger Vehicle (MPV)" },
    ]);
  });

  it("accepts a single result element and a valid empty result", () => {
    const singleMake = makesFixture.replace(
      /<AllVehicleMakes>.*?<\/AllVehicleMakes>\s*<AllVehicleMakes>.*?<\/AllVehicleMakes>\s*<AllVehicleMakes>.*?<\/AllVehicleMakes>/s,
      "<AllVehicleMakes><Make_ID>440</Make_ID><Make_Name>TEST MAKE</Make_Name></AllVehicleMakes>"
    ).replace("<Count>3</Count>", "<Count>1</Count>");
    const empty = "<Response><Count>0</Count><Results></Results></Response>";

    assert.deepEqual(parseMakesXml(singleMake), [
      { makeId: 440, makeName: "TEST MAKE" },
    ]);
    assert.deepEqual(parseMakesXml(empty), []);
    assert.deepEqual(
      parseVehicleTypesXml("<Response><Count>0</Count><Results></Results></Response>"),
      []
    );
  });

  it("rejects malformed XML, missing fields, and inconsistent counts", () => {
    assert.throws(() => parseMakesXml("<Response>"), /Malformed NHTSA XML/);
    assert.throws(
      () =>
        parseMakesXml(
          "<Response><Count>1</Count><Results><AllVehicleMakes><Make_ID>1</Make_ID></AllVehicleMakes></Results></Response>"
        ),
      /missing Make_Name/
    );
    assert.throws(
      () => parseVehicleTypesXml("<Response><Count>1</Count><Results></Results></Response>"),
      /does not match its 0 records/
    );
  });
});