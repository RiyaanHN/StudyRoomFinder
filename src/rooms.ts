import type { Booking, Dataset, RoomStatus } from "./types";

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time: "${hhmm}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Invalid time: "${hhmm}"`);
  return h * 60 + min;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function bookingsFor(roomId: string, day: number, bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.roomId === roomId && b.day === day)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** Start is inclusive, end is exclusive: a room booked 10:00-11:00 is free at 11:00. */
export function getRoomStatus(
  roomId: string,
  bookings: Booking[],
  day: number,
  minute: number,
): { free: boolean; changesAt: number | null } {
  const todays = bookingsFor(roomId, day, bookings);

  const current = todays.find((b) => toMinutes(b.start) <= minute && minute < toMinutes(b.end));
  if (current) {
    // Busy: find when the chain of back-to-back bookings ends.
    let freedAt = toMinutes(current.end);
    for (const b of todays) {
      if (toMinutes(b.start) <= freedAt && toMinutes(b.end) > freedAt) {
        freedAt = toMinutes(b.end);
      }
    }
    return { free: false, changesAt: freedAt };
  }

  const next = todays.find((b) => toMinutes(b.start) > minute);
  return { free: true, changesAt: next ? toMinutes(next.start) : null };
}

export function getAllStatuses(
  data: Dataset,
  day: number,
  minute: number,
  minCapacity = 1,
): RoomStatus[] {
  return data.rooms
    .filter((room) => room.capacity >= minCapacity)
    .map((room) => ({ room, ...getRoomStatus(room.id, data.bookings, day, minute) }))
    .sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      // Among free rooms, longest availability first (null = all day = best).
      const aEnd = a.changesAt ?? Infinity;
      const bEnd = b.changesAt ?? Infinity;
      return bEnd - aEnd;
    });
}
