import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { Make, VehicleType } from "../types.js";

type XmlRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) =>
    name === "AllVehicleMakes" || name === "VehicleTypesForMakeIds",
});

function parseResponse(xml: string): XmlRecord {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Malformed NHTSA XML: ${validation.err.msg}`);
  }

  const document = parser.parse(xml) as XmlRecord;
  const response = document.Response;
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("NHTSA XML must contain a Response element.");
  }
  return response as XmlRecord;
}

function requiredText(record: XmlRecord, field: string) {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`NHTSA XML record is missing ${field}.`);
  }
  return value.trim();
}

function requiredId(record: XmlRecord, field: string) {
  const value = requiredText(record, field);
  if (!/^\d+$/.test(value)) {
    throw new Error(`NHTSA XML field ${field} must be a non-negative integer.`);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new Error(`NHTSA XML field ${field} is outside the safe integer range.`);
  }
  return id;
}

function recordsFrom(response: XmlRecord, field: string) {
  const results = response.Results;
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    return [];
  }
  const value = (results as XmlRecord)[field];
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as XmlRecord[];
  if (value && typeof value === "object") return [value as XmlRecord];
  throw new Error(`NHTSA XML Results.${field} must contain records.`);
}

function validateCount(response: XmlRecord, records: unknown[]) {
  const countText = requiredText(response, "Count");
  if (!/^\d+$/.test(countText)) {
    throw new Error("NHTSA XML Count must be a non-negative integer.");
  }
  const count = Number(countText);
  if (!Number.isSafeInteger(count) || count !== records.length) {
    throw new Error(
      `NHTSA XML Count (${countText}) does not match its ${records.length} records.`
    );
  }
}

export function parseMakesXml(xml: string): Make[] {
  const response = parseResponse(xml);
  const records = recordsFrom(response, "AllVehicleMakes");
  validateCount(response, records);
  return records.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("NHTSA XML make record must be an object.");
    }
    const make = record as XmlRecord;
    return {
      makeId: requiredId(make, "Make_ID"),
      makeName: requiredText(make, "Make_Name"),
    };
  });
}

export function parseVehicleTypesXml(xml: string): VehicleType[] {
  const response = parseResponse(xml);
  const records = recordsFrom(response, "VehicleTypesForMakeIds");
  validateCount(response, records);
  return records.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("NHTSA XML vehicle-type record must be an object.");
    }
    const vehicleType = record as XmlRecord;
    return {
      typeId: requiredId(vehicleType, "VehicleTypeId"),
      typeName: requiredText(vehicleType, "VehicleTypeName"),
    };
  });
}