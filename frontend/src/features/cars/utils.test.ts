import { validateCarForm } from "./utils";

describe("validateCarForm", () => {
  it("requires make, model, and a valid year", () => {
    expect(validateCarForm({ make: " ", model: "", year: "202x" })).toEqual({
      make: "Make is required.",
      model: "Model is required.",
      year: "Enter a valid year.",
    });
  });

  it("accepts trimmed make and model values with an integer year", () => {
    expect(
      validateCarForm({ make: " Audi ", model: " Q5 ", year: "2024" })
    ).toEqual({});
  });
});