import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { oneSignalService } from "@/services/oneSignalService";

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

import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

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
  congregation_id: string | null;
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
  congregation_id?: string; // Adicionar para super-admin
}

export interface UpdateTripData extends CreateTripData {
  tripId: string;
}

export function useTrips() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const tripsQuery = useQuery({
    queryKey: ["trips", selectedCongregationId],
    queryFn: async (): Promise<Trip[]> => {
      let query = supabase
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

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      } else if (!isSuperAdmin && profile?.congregation_id) {
        query = query.eq("congregation_id", profile.congregation_id);
      }

      const { data: trips, error } = await query;

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
        congregation_id: isSuperAdmin && selectedCongregationId ? selectedCongregationId : profile.congregation_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar viagem: " + error.message);
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async (data: UpdateTripData) => {
      const { error } = await supabase
        .from("trips")
        .update({
          departure_at: data.departure_at,
          return_at: data.return_at || null,
          max_passengers: data.max_passengers,
          is_urgent: data.is_urgent,
          is_betel_car: data.is_betel_car,
          notes: data.notes || null,
          congregation_id: isSuperAdmin && selectedCongregationId ? selectedCongregationId : undefined, // Apenas super-admin pode mudar
        })
        .eq("id", data.tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar viagem: " + error.message);
    },
  });

  const reserveSeatMutation = useMutation({
    mutationFn: async ({ tripId, tripType, passengerId }: { tripId: string; tripType: TripType; passengerId?: string }) => {
      if (!profile) throw new Error("Usuário não autenticado");
      const targetPassengerId = passengerId || profile.id;

      const { error } = await supabase.from("trip_passengers").insert({
        trip_id: tripId,
        passenger_id: targetPassengerId,
        trip_type: tripType,
      });

      if (error) throw error;

      // Notify the driver when someone else adds a passenger to their trip.
      try {
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("id, driver_id, departure_at, driver:profiles!trips_driver_id_fkey(user_id)")
          .eq("id", tripId)
          .single();

        if (tripError) throw tripError;
        if (!tripData) return;

        // Skip notification when the driver performed the change.
        if (profile.id === tripData.driver_id) return;

        const { data: passengerProfile, error: passengerError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", targetPassengerId)
          .single();

        if (passengerError) throw passengerError;

        const driverUserId = (tripData.driver as { user_id?: string } | null)?.user_id;
        const passengerName = passengerProfile?.full_name || "Um passageiro";

        if (driverUserId) {
          await oneSignalService.sendNotificationToUser(driverUserId, {
            title: "Novo Passageiro na Viagem",
            message: `${passengerName} foi adicionado à sua viagem.`,
            url: "/viagens",
            data: {
              type: "trip_passenger_added",
              tripId: tripData.id,
              passengerName,
            },
          });
        }
      } catch (notificationError) {
        console.error("Error sending trip passenger notification to driver:", notificationError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Passageiro adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar passageiro: " + error.message);
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
    onError: (error: Error) => {
      toast.error("Erro ao cancelar reserva: " + error.message);
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      let passengerUserIds: string[] = [];

      try {
        const { data: passengersData, error: passengersError } = await supabase
          .from("trip_passengers")
          .select("passenger_id")
          .eq("trip_id", tripId);

        if (passengersError) throw passengersError;

        const passengerProfileIds = Array.from(
          new Set(
            (passengersData || [])
              .map((row) => row.passenger_id)
              .filter((id): id is string => !!id)
          )
        );

        if (passengerProfileIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id")
            .in("id", passengerProfileIds);

          if (profilesError) throw profilesError;

          passengerUserIds = Array.from(
            new Set(
              (profilesData || [])
                .map((row) => row.user_id)
                .filter((userId): userId is string => !!userId)
            )
          );
        }
      } catch (fetchPassengersError) {
        console.error("Error loading passengers for trip cancel notification:", fetchPassengersError);
      }

      const { error } = await supabase
        .from("trips")
        .update({ is_active: false })
        .eq("id", tripId);

      if (error) throw error;

      // Notify all passengers that the trip was canceled.
      if (passengerUserIds.length > 0) {
        try {
          await oneSignalService.sendNotificationToUsers(passengerUserIds, {
            title: "Viagem Cancelada",
            message: "A viagem em que você estava inscrito foi cancelada.",
            url: "/viagens",
            data: {
              type: "trip_canceled",
              tripId,
            },
          });
        } catch (notificationError) {
          console.error("Error sending trip canceled notifications to passengers:", notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem cancelada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao cancelar viagem: " + error.message);
    },
  });

  const removePassengerMutation = useMutation({
    mutationFn: async ({ tripId, passengerId }: { tripId: string; passengerId: string }) => {
      const { error } = await supabase
        .from("trip_passengers")
        .delete()
        .eq("trip_id", tripId)
        .eq("passenger_id", passengerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Passageiro removido!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover passageiro: " + error.message);
    },
  });

  return {
    trips: tripsQuery.data ?? [],
    isLoading: tripsQuery.isLoading,
    error: tripsQuery.error,
    createTrip: createTripMutation.mutate,
    isCreating: createTripMutation.isPending,
    updateTrip: updateTripMutation.mutate,
    isUpdating: updateTripMutation.isPending,
    reserveSeat: reserveSeatMutation.mutate,
    isReserving: reserveSeatMutation.isPending,
    cancelReservation: cancelReservationMutation.mutate,
    isCanceling: cancelReservationMutation.isPending,
    deleteTrip: deleteTripMutation.mutate,
    isDeleting: deleteTripMutation.isPending,
    removePassenger: removePassengerMutation.mutate,
    isRemovingPassenger: removePassengerMutation.isPending,
  };
}
