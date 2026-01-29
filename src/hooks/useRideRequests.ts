import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface RideRequest {
  id: string;
  profile_id: string;
  requested_date: string;
  notes: string | null;
  is_fulfilled: boolean | null;
  created_at: string;
  profile_name: string;
}

export interface CreateRideRequestData {
  requested_date: string;
  notes?: string;
}

export function useRideRequests() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const rideRequestsQuery = useQuery({
    queryKey: ["ride_requests"],
    queryFn: async (): Promise<RideRequest[]> => {
      // Fetch ride requests that are not fulfilled
      const { data: requests, error: requestsError } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("is_fulfilled", false)
        .order("requested_date", { ascending: true });

      if (requestsError) throw requestsError;

      // Fetch profiles for names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;

      const profileNameMap = new Map(
        profiles?.map((p) => [p.id, p.full_name]) ?? []
      );

      return (requests ?? []).map((request) => ({
        ...request,
        profile_name: profileNameMap.get(request.profile_id) ?? "Desconhecido",
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
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ride_requests"] });
      toast.success("Solicitação de carona registrada!");
    },
    onError: (error) => {
      console.error("Error creating ride request:", error);
      toast.error("Erro ao solicitar carona");
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
    onError: (error) => {
      console.error("Error deleting ride request:", error);
      toast.error("Erro ao remover solicitação");
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
    onError: (error) => {
      console.error("Error marking request as fulfilled:", error);
      toast.error("Erro ao atualizar solicitação");
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
