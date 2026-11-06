import { describe, it, expect } from "vitest";
import { resolvePerson } from "@/lib/users";

describe("resolvePerson", () => {
  it("accepts every Adiba name, any case", () => {
    for (const n of ["Adiba Ahin Chowdhury", "AHIN", "ahin", "Chowdhury", "adiba"]) {
      expect(resolvePerson(n)).toBe("Adiba");
    }
  });
  it("accepts Arham case-insensitively", () => {
    expect(resolvePerson("ARHAM")).toBe("Arham");
  });
  it("rejects anyone else", () => {
    expect(resolvePerson("John")).toBeNull();
  });
});
