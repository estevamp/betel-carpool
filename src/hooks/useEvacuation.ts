import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EvacuationPassenger {
  id: string;
  passenger_id: string;
  passenger_name: string;
}

import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface EvacuationCar {
  id: string;
  driver_id: string;
  driver_name: string;
  destination: string | null;
  notes: string | null;
  passengers: EvacuationPassenger[];
  max_seats: number;
  congregation_id: string | null;
}

export interface CreateEvacuationCarData {
  destination?: string;
  notes?: string;
  congregation_id?: string; // Adicionar para super-admin
}

export function useEvacuation() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const evacuationQuery = useQuery({
    queryKey: ["evacuation", selectedCongregationId],
    queryFn: async (): Promise<EvacuationCar[]> => {
      let query = supabase
        .from("evacuation_cars")
        .select("*, driver:profiles(id, full_name)")
        .order("created_at", { ascending: true });

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      }

      // Fetch all evacuation cars
      const { data: cars, error: carsError } = await query;

      if (carsError) throw carsError;

      // Fetch all passengers
      const { data: passengers, error: passengersError } = await supabase
        .from("evacuation_passengers")
        .select("*");

      if (passengersError) throw passengersError;

      // Fetch profiles for names (only if not already fetched by driver:profiles)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;

      const profileNameMap = new Map(
        profiles?.map((p) => [p.id, p.full_name]) ?? []
      );

      // Group passengers by car
      const passengersByCar = new Map<string, EvacuationPassenger[]>();
      (passengers ?? []).forEach((p) => {
        const carPassengers = passengersByCar.get(p.evacuation_car_id) ?? [];
        carPassengers.push({
          id: p.id,
          passenger_id: p.passenger_id,
          passenger_name: profileNameMap.get(p.passenger_id) ?? "Desconhecido",
        });
        passengersByCar.set(p.evacuation_car_id, carPassengers);
      });

      return (cars ?? []).map((car) => ({
        id: car.id,
        driver_id: car.driver_id,
        driver_name: car.driver?.full_name ?? "Desconhecido",
        destination: car.destination,
        notes: car.notes,
        passengers: passengersByCar.get(car.id) ?? [],
        max_seats: 4, // Default capacity
        congregation_id: car.congregation_id,
      }));
    },
  });

  const createCarMutation = useMutation({
    mutationFn: async (data: CreateEvacuationCarData) => {
      if (!profile?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("evacuation_cars").insert({
        driver_id: profile.id,
        destination: data.destination || null,
        notes: data.notes || null,
        congregation_id: isSuperAdmin && selectedCongregationId ? selectedCongregationId : profile.congregation_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evacuation"] });
      toast.success("Carro adicionado ao plano de evacuação!");
    },
    onError: (error: Error) => {
      console.error("Error creating evacuation car:", error);
      toast.error("Erro ao adicionar carro: " + error.message);
    },
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (carId: string) => {
      const { error } = await supabase
        .from("evacuation_cars")
        .delete()
        .eq("id", carId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evacuation"] });
      toast.success("Carro removido do plano!");
    },
    onError: (error: Error) => {
      console.error("Error deleting evacuation car:", error);
      toast.error("Erro ao remover carro: " + error.message);
    },
  });

  const addPassengerMutation = useMutation({
    mutationFn: async ({
      carId,
      passengerId,
    }: {
      carId: string;
      passengerId: string;
    }) => {
      const { error } = await supabase.from("evacuation_passengers").insert({
        evacuation_car_id: carId,
        passenger_id: passengerId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evacuation"] });
      toast.success("Passageiro adicionado!");
    },
    onError: (error: Error) => {
      console.error("Error adding passenger:", error);
      toast.error("Erro ao adicionar passageiro: " + error.message);
    },
  });

  const removePassengerMutation = useMutation({
    mutationFn: async (passengerId: string) => {
      const { error } = await supabase
        .from("evacuation_passengers")
        .delete()
        .eq("id", passengerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evacuation"] });
      toast.success("Passageiro removido!");
    },
    onError: (error: Error) => {
      console.error("Error removing passenger:", error);
      toast.error("Erro ao remover passageiro: " + error.message);
    },
  });

  // Get all passenger IDs already allocated
  const allocatedPassengerIds = new Set(
    evacuationQuery.data?.flatMap((car) =>
      car.passengers.map((p) => p.passenger_id)
    ) ?? []
  );

  // Also include drivers as allocated
  const allocatedDriverIds = new Set(
    evacuationQuery.data?.map((car) => car.driver_id) ?? []
  );

  return {
    evacuationCars: evacuationQuery.data ?? [],
    isLoading: evacuationQuery.isLoading,
    error: evacuationQuery.error,
    createCar: createCarMutation.mutate,
    isCreatingCar: createCarMutation.isPending,
    deleteCar: deleteCarMutation.mutate,
    isDeletingCar: deleteCarMutation.isPending,
    addPassenger: addPassengerMutation.mutate,
    isAddingPassenger: addPassengerMutation.isPending,
    removePassenger: removePassengerMutation.mutate,
    isRemovingPassenger: removePassengerMutation.isPending,
    allocatedPassengerIds,
    allocatedDriverIds,
    isAdmin,
  };
}
