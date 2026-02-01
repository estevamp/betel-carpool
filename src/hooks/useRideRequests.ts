import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface RideRequest {
  id: string;
  profile_id: string;
  requested_date: string;
  notes: string | null;
  is_fulfilled: boolean | null;
  created_at: string;
  profile_name: string;
  congregation_id: string | null;
}

export interface CreateRideRequestData {
  requested_date: string;
  notes?: string;
  congregation_id?: string; // Adicionar para super-admin
}

export function useRideRequests() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const rideRequestsQuery = useQuery({
    queryKey: ["ride_requests", selectedCongregationId],
    queryFn: async (): Promise<RideRequest[]> => {
      let query = supabase
        .from("ride_requests")
        .select("*, profile:profiles(id, full_name)")
        .eq("is_fulfilled", false)
        .order("requested_date", { ascending: true });

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      }

      // Fetch ride requests that are not fulfilled
      const { data: requests, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      return (requests ?? []).map((request) => ({
        ...request,
        profile_name: request.profile?.full_name ?? "Desconhecido",
      }));
    },
  });

  const createRideRequestMutation = useMutation({
    mutationFn: async (data: CreateRideRequestData) => {
      if (!profile?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("ride_requests").insert({
        profile_id: profile.id,
        requested_date: data.requested_date,
        notes: data.notes || null,
        congregation_id: isSuperAdmin && selectedCongregationId ? selectedCongregationId : profile.congregation_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ride_requests"] });
      toast.success("Solicitação de carona registrada!");
    },
    onError: (error: Error) => {
      console.error("Error creating ride request:", error);
      toast.error("Erro ao solicitar carona: " + error.message);
    },
  });

  const deleteRideRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("ride_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ride_requests"] });
      toast.success("Solicitação removida!");
    },
    onError: (error: Error) => {
      console.error("Error deleting ride request:", error);
      toast.error("Erro ao remover solicitação: " + error.message);
    },
  });

  const markAsFulfilledMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("ride_requests")
        .update({ is_fulfilled: true })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ride_requests"] });
      toast.success("Solicitação marcada como atendida!");
    },
    onError: (error: Error) => {
      console.error("Error marking request as fulfilled:", error);
      toast.error("Erro ao atualizar solicitação: " + error.message);
    },
  });

  return {
    rideRequests: rideRequestsQuery.data ?? [],
    isLoading: rideRequestsQuery.isLoading,
    error: rideRequestsQuery.error,
    createRideRequest: createRideRequestMutation.mutate,
    isCreating: createRideRequestMutation.isPending,
    deleteRideRequest: deleteRideRequestMutation.mutate,
    isDeleting: deleteRideRequestMutation.isPending,
    markAsFulfilled: markAsFulfilledMutation.mutate,
    isMarkingFulfilled: markAsFulfilledMutation.isPending,
  };
}
