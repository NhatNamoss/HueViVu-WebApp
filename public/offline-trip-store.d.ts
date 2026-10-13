export type CachedTripPayload<T> = { version: number; ownerId: string; data: T; savedAt: number };
export function cacheTrip(tripId: string, data: unknown): boolean;
export function readCachedTrip<T = unknown>(tripId: string): CachedTripPayload<T> | null;
export function listCachedTrips<T = unknown>(): CachedTripPayload<T>[];
export function removeCachedTrip(tripId: string): void;
export function clearCachedTrips(): void;
