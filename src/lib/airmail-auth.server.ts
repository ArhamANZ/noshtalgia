import type { Person } from "./users";

const PASSWORDS: Record<Person, string> = { Adiba: "sextion", Arham: "chowdhury" };
const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );

async function sign(payload: string) {
  const secret = process.env["AIRMAIL_SESSION_SECRET"];
  if (!secret) throw new Error("Server is missing its session secret");
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
export function checkPassword(person: Person, password: string) {
  return PASSWORDS[person] === password;
}
export async function issueToken(person: Person) {
  const payload = `${person}.${Date.now() + 30 * 24 * 3600 * 1000}`;
  return `${payload}.${await sign(payload)}`;
}
export async function verifyToken(token: string): Promise<Person> {
  const [person, exp, sig] = String(token).split(".");
  if ((person !== "Adiba" && person !== "Arham") || !exp || !sig)
    throw new Error("Please sign in again");
  if (Number(exp) < Date.now() || (await sign(`${person}.${exp}`)) !== sig)
    throw new Error("Please sign in again");
  return person;
}
