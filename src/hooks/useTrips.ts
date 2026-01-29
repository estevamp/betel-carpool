import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TripType = Database["public"]["Enums"]["trip_type"];

export interface TripPassenger {
  id: string;
  passenger_id: string;
  trip_type: TripType | null;
  profile: {
    id: string;
    full_name: string;
  };
}

export interface Trip {
  id: string;
  driver_id: string;
  departure_at: string;
  return_at: string | null;
  max_passengers: number | null;
  is_active: boolean | null;
  is_urgent: boolean | null;
  is_betel_car: boolean | null;
  notes: string | null;
  driver: {
    id: string;
    full_name: string;
  };
  passengers: TripPassenger[];
}

export interface CreateTripData {
  departure_at: string;
  return_at?: string;
  max_passengers: number;
  is_urgent: boolean;
  is_betel_car: boolean;
  notes?: string;
}

export function useTrips() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: async (): Promise<Trip[]> => {
      const { data: trips, error } = await supabase
        .from("trips")
        .select(`
          *,
          driver:profiles!trips_driver_id_fkey(id, full_name),
          passengers:trip_passengers(
            id,
            passenger_id,
            trip_type,
            profile:profiles!trip_passengers_passenger_id_fkey(id, full_name)
          )
        `)
        .eq("is_active", true)
        .order("departure_at", { ascending: true });

      if (error) throw error;
      return trips as unknown as Trip[];
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripData) => {
      if (!profile) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase.from("trips").insert({
        driver_id: profile.id,
        departure_at: data.departure_at,
        return_at: data.return_at || null,
        max_passengers: data.max_passengers,
        is_urgent: data.is_urgent,
        is_betel_car: data.is_betel_car,
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar viagem: " + error.message);
    },
  });

  const reserveSeatMutation = useMutation({
    mutationFn: async ({ tripId, tripType }: { tripId: string; tripType: TripType }) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("trip_passengers").insert({
        trip_id: tripId,
        passenger_id: profile.id,
        trip_type: tripType,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Vaga reservada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao reservar vaga: " + error.message);
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("trip_passengers")
        .delete()
        .eq("trip_id", tripId)
        .eq("passenger_id", profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Reserva cancelada!");
    },
    onError: (error) => {
      toast.error("Erro ao cancelar reserva: " + error.message);
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem cancelada!");
    },
    onError: (error) => {
      toast.error("Erro ao cancelar viagem: " + error.message);
    },
  });

  return {
    trips: tripsQuery.data ?? [],
    isLoading: tripsQuery.isLoading,
    error: tripsQuery.error,
    createTrip: createTripMutation.mutate,
    isCreating: createTripMutation.isPending,
    reserveSeat: reserveSeatMutation.mutate,
    isReserving: reserveSeatMutation.isPending,
    cancelReservation: cancelReservationMutation.mutate,
    isCanceling: cancelReservationMutation.isPending,
    deleteTrip: deleteTripMutation.mutate,
    isDeleting: deleteTripMutation.isPending,
  };
}
