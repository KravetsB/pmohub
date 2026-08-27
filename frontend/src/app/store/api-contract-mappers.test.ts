import { describe, expect, it } from "vitest";
import { uuidOrUndefined } from "./api-contract-mappers";

describe("API mapping boundary", () => {
  it("keeps canonical UUIDs and rejects temporary UI identifiers", () => {
    expect(uuidOrUndefined("00000000-0000-4000-8000-000000000001")).toBe("00000000-0000-4000-8000-000000000001");
    expect(uuidOrUndefined("SCOPE-local-id")).toBeUndefined();
  });
});
