import type { Person } from "./users";

export type Airport = { name: string; country: string; code: string; lat: number; lon: number };
export const PLACES = {
  bangladesh: { name: "Dhaka", country: "Bangladesh", code: "DAC", lat: 23.8103, lon: 90.4125 },
  japan: { name: "Tokyo", country: "Japan", code: "NRT", lat: 35.6762, lon: 139.6503 },
  india: { name: "Delhi", country: "India", code: "DEL", lat: 28.6139, lon: 77.209 },
  malaysia: { name: "Kuala Lumpur", country: "Malaysia", code: "KUL", lat: 3.139, lon: 101.6869 },
  singapore: { name: "Singapore", country: "Singapore", code: "SIN", lat: 1.3521, lon: 103.8198 },
  korea: { name: "Seoul", country: "South Korea", code: "ICN", lat: 37.5665, lon: 126.978 },
  uae: { name: "Dubai", country: "UAE", code: "DXB", lat: 25.2048, lon: 55.2708 },
  uk: { name: "London", country: "United Kingdom", code: "LHR", lat: 51.5072, lon: -0.1276 },
  usa: { name: "New York", country: "USA", code: "JFK", lat: 40.7128, lon: -74.006 },
  canada: { name: "Toronto", country: "Canada", code: "YYZ", lat: 43.6532, lon: -79.3832 },
  australia: { name: "Sydney", country: "Australia", code: "SYD", lat: -33.8688, lon: 151.2093 },
} satisfies Record<string, Airport>;
export type PlaceKey = keyof typeof PLACES;
export const isPlace = (v: unknown): v is PlaceKey => typeof v === "string" && v in PLACES;
export const DEFAULT_PLACES: Record<Person, PlaceKey> = { Adiba: "japan", Arham: "bangladesh" };
export const AIRPORTS = { bangladesh: PLACES.bangladesh, japan: PLACES.japan };
export const displayName = (person: Person) => (person === "Adiba" ? "Ahin" : "Arham");
/** A letter flies from the sender's chosen place to the recipient's chosen place. */
export function routeFor(sender: Person, places: Record<Person, PlaceKey>) {
  const recipient: Person = sender === "Adiba" ? "Arham" : "Adiba";
  return { from: PLACES[places[sender]], to: PLACES[places[recipient]] };
}

export function openingLocation(person: Person, places: Record<Person, PlaceKey>) {
  return PLACES[places[person]];
}

/** A stationary checkpoint with an eased approach from a globe-wide view. */
export function locationCameraPose(progress: number, seconds: number, reducedMotion = false) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = reducedMotion ? 1 : t * t * (3 - 2 * t);
  return {
    altitude: 23 - 17 * eased,
    checkpointHeight: 0.5 + (reducedMotion ? 0 : 0.12 * Math.sin(seconds * 2.4)),
  };
}

/** Close departure/arrival views with a broad, orbiting mid-flight reveal. */
export function flightCameraPose(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const reveal = Math.sin(Math.PI * t) ** 2;
  return {
    altitude: 4.2 + 9 * reveal,
    behind: 2.8 + 2 * reveal,
    sideways: 3 * Math.sin(2 * Math.PI * t) * reveal,
    fieldOfView: 46 + 8 * reveal,
    bank: 0.12 * Math.sin(2 * Math.PI * t),
    reveal,
  };
}

/** Coordinates aligned to a standard equirectangular Earth texture. */
export function globePoint(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return [
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(theta),
  ];
}
