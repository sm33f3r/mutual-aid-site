import type { Listing, ListingState } from "../schemas/listing";

/**
 * `today` is an already-computed YYYY-MM-DD string (use todayInZone for the listing's city).
 * Removed and Hidden always win; otherwise a listing is Expired once today is after expiry_date.
 */
export function effectiveState(
  listing: Pick<Listing, "expiry_date" | "state">,
  today: string,
): ListingState {
  if (listing.state === "Removed" || listing.state === "Hidden") return listing.state;
  return today > listing.expiry_date ? "Expired" : listing.state;
}
