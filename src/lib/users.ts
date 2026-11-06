export type Person = "Adiba" | "Arham";

const ADIBA_NAMES = ["adiba ahin chowdhury", "ahin", "chowdhury", "adiba"];

/** Map a typed name to one of the two people (case-insensitive), or null. */
export function resolvePerson(input: string): Person | null {
  const n = input.trim().replace(/\s+/g, " ").toLowerCase();
  if (ADIBA_NAMES.includes(n)) return "Adiba";
  if (n === "arham") return "Arham";
  return null;
}

export const other = (p: Person): Person => (p === "Adiba" ? "Arham" : "Adiba");
