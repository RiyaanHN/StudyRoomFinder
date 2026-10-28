import { describe, expect, it } from "vitest";
import { formatMinutes, getAllStatuses, getRoomStatus, toMinutes } from "./rooms";
import type { Booking, Dataset } from "./types";

const bookings: Booking[] = [
  { roomId: "a", day: 1, start: "09:00", end: "10:00" },
  { roomId: "a", day: 1, start: "10:00", end: "11:30" }, // back-to-back
  { roomId: "a", day: 1, start: "14:00", end: "15:00" },
  { roomId: "b", day: 2, start: "09:00", end: "10:00" },
];

describe("toMinutes / formatMinutes", () => {
  it("parses and formats times", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("9:05")).toBe(545);
    expect(formatMinutes(570)).toBe("09:30");
  });

  it("rejects invalid input", () => {
    expect(() => toMinutes("25:00")).toThrow();
    expect(() => toMinutes("abc")).toThrow();
  });
});

describe("getRoomStatus", () => {
  it("is free before the first booking and reports when it gets taken", () => {
    expect(getRoomStatus("a", bookings, 1, toMinutes("08:00"))).toEqual({
      free: true,
      changesAt: toMinutes("09:00"),
    });
  });

  it("treats start as inclusive and end as exclusive", () => {
    expect(getRoomStatus("a", bookings, 1, toMinutes("09:00")).free).toBe(false);
    expect(getRoomStatus("a", bookings, 1, toMinutes("11:30")).free).toBe(true);
  });

  it("chains back-to-back bookings when computing when a room frees up", () => {
    expect(getRoomStatus("a", bookings, 1, toMinutes("09:30"))).toEqual({
      free: false,
      changesAt: toMinutes("11:30"),
    });
  });

  it("returns null changesAt when nothing else is booked that day", () => {
    expect(getRoomStatus("a", bookings, 1, toMinutes("16:00"))).toEqual({
      free: true,
      changesAt: null,
    });
  });

  it("ignores bookings on other days", () => {
    expect(getRoomStatus("a", bookings, 3, toMinutes("09:30")).free).toBe(true);
  });
});

describe("getAllStatuses", () => {
  const data: Dataset = {
    rooms: [
      { id: "a", building: "X", name: "A", capacity: 4, lat: 0, lng: 0 },
      { id: "b", building: "X", name: "B", capacity: 10, lat: 0, lng: 0 },
    ],
    bookings,
  };

  it("filters by capacity", () => {
    const result = getAllStatuses(data, 1, toMinutes("12:00"), 8);
    expect(result.map((s) => s.room.id)).toEqual(["b"]);
  });

  it("lists free rooms first, longest availability on top", () => {
    const result = getAllStatuses(data, 1, toMinutes("09:30"));
    expect(result.map((s) => s.room.id)).toEqual(["b", "a"]);
  });
});
