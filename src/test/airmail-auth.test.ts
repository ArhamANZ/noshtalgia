import { describe, expect, it } from "vitest";
import { checkPassword } from "@/lib/airmail-auth.server";

describe("passwords", () => {
  it("Ahin's password is sextion", () => {
    expect(checkPassword("Adiba", "sextion")).toBe(true);
    expect(checkPassword("Adiba", "chowdhury")).toBe(false);
  });
  it("Arham's password is chowdhury", () => {
    expect(checkPassword("Arham", "chowdhury")).toBe(true);
    expect(checkPassword("Arham", "sextion")).toBe(false);
  });
});
