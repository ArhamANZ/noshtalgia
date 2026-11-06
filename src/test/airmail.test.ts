import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLACES,
  PLACES,
  flightCameraPose,
  globePoint,
  locationCameraPose,
  openingLocation,
  routeFor,
} from "@/lib/airmail";

describe("air mail delivery", () => {
  it.each(["Arham", "Adiba"] as const)("opens at %s's own chosen location", (person) => {
    const places = { Arham: "uk", Adiba: "korea" } as const;
    expect(openingLocation(person, places)).toBe(person === "Arham" ? PLACES.uk : PLACES.korea);
  });
  it("zooms toward a stationary location with a bobbing checkpoint", () => {
    expect(locationCameraPose(0, 0).altitude).toBe(23);
    expect(locationCameraPose(1, 0).altitude).toBe(6);
    expect(locationCameraPose(1, Math.PI / 4.8).checkpointHeight).toBeCloseTo(0.62);
    expect(locationCameraPose(1, (3 * Math.PI) / 4.8).checkpointHeight).toBeCloseTo(0.38);
  });
  it("keeps the checkpoint still and skips zoom for reduced motion", () => {
    expect(locationCameraPose(0, 2, true)).toEqual({ altitude: 6, checkpointHeight: 0.5 });
  });
  it.each(["Arham", "Adiba"] as const)("zooms out then back in on %s's journey", (sender) => {
    const route = routeFor(sender, DEFAULT_PLACES);
    expect(route.from.country).not.toBe(route.to.country);
    const departure = flightCameraPose(0);
    const cruise = flightCameraPose(0.5);
    const arrival = flightCameraPose(1);
    expect(cruise.altitude).toBeGreaterThan(departure.altitude * 2);
    expect(cruise.fieldOfView).toBeGreaterThan(departure.fieldOfView);
    expect(arrival.altitude).toBeCloseTo(departure.altitude);
    expect(arrival.fieldOfView).toBeCloseTo(departure.fieldOfView);
    expect(flightCameraPose(0.25).sideways).toBeGreaterThan(0);
    expect(flightCameraPose(0.75).sideways).toBeLessThan(0);
  });
  it("flies Arham's letters from Bangladesh to Japan", () => {
    const route = routeFor("Arham", DEFAULT_PLACES);
    expect(route.from.country).toBe("Bangladesh");
    expect(route.to.country).toBe("Japan");
  });
  it("flies Ahin's letters from Japan to Bangladesh", () => {
    const route = routeFor("Adiba", DEFAULT_PLACES);
    expect(route.from.country).toBe("Japan");
    expect(route.to.country).toBe("Bangladesh");
  });
  it("flies from each person's chosen location", () => {
    const route = routeFor("Arham", { Arham: "uk", Adiba: "korea" });
    expect(route.from).toBe(PLACES.uk);
    expect(route.to).toBe(PLACES.korea);
  });
  it("places Dhaka and Tokyo on the northern and eastern hemisphere", () => {
    const dhaka = globePoint(23.8103, 90.4125, 10);
    const tokyo = globePoint(35.6762, 139.6503, 10);
    expect(dhaka[1]).toBeGreaterThan(0);
    expect(dhaka[2]).toBeLessThan(0);
    expect(tokyo[1]).toBeGreaterThan(dhaka[1]);
    expect(Math.hypot(...tokyo)).toBeCloseTo(10);
  });
});
