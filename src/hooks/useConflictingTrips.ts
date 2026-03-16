import { useQuery } from "@tanstack/react-query";
import { differenceInMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "./useTrips";

function isConflictingTrip(a: Trip, b: Trip) {
  const aDeparture = new Date(a.departure_at);
  const bDeparture = new Date(b.departure_at);

  const within60 = (d1: Date, d2: Date) => Math.abs(differenceInMinutes(d1, d2)) < 60;

  if (within60(aDeparture, bDeparture)) return true;

  const aReturn = a.return_at ? new Date(a.return_at) : null;
  const bReturn = b.return_at ? new Date(b.return_at) : null;

  if (aReturn && within60(aReturn, bDeparture)) return true;
  if (bReturn && within60(aDeparture, bReturn)) return true;
  if (aReturn && bReturn && within60(aReturn, bReturn)) return true;

  return false;
}

export function useConflictingTrips(targetTrip: Trip | null, passengerId: string | undefined) {
  const conflictQuery = useQuery({
    queryKey: ["conflict-check", targetTrip?.id, passengerId],
    enabled: !!targetTrip && !!passengerId,
    queryFn: async (): Promise<Trip[]> => {
      if (!targetTrip?.id || !passengerId) return [];

      const { data, error } = await supabase
        .from("trip_passengers")
        .select("trip_id, trips(id, departure_at, return_at)")
        .eq("passenger_id", passengerId);

      if (error) throw error;

      const passengerTrips = (data ?? [])
        .map((row) => (row as unknown as { trips: { id: string; departure_at: string; return_at: string | null } | null }).trips)
        .filter((t): t is { id: string; departure_at: string; return_at: string | null } => !!t)
        .map((t) => ({ ...t } as unknown as Trip));

      return passengerTrips.filter((t) => t.id !== targetTrip.id && isConflictingTrip(targetTrip, t));
    },
  });

  return {
    conflictingTrips: conflictQuery.data ?? [],
    isChecking: conflictQuery.isFetching,
  };
}

