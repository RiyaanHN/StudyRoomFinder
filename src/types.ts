export interface Room {
  id: string;
  building: string;
  name: string;
  capacity: number;
  lat: number;
  lng: number;
}

/** day: 0 = Sunday ... 6 = Saturday (same as Date#getDay). Times are "HH:MM", 24h. */
export interface Booking {
  roomId: string;
  day: number;
  start: string;
  end: string;
  title?: string;
}

export interface Dataset {
  rooms: Room[];
  bookings: Booking[];
}

export interface RoomStatus {
  room: Room;
  free: boolean;
  /** Minutes since midnight when the room is next taken (free rooms) or freed (busy rooms). null = rest of day. */
  changesAt: number | null;
}
