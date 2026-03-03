import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface Absence {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  profile_name: string;
  congregation_id: string | null;
}

export interface CreateAbsenceData {
  start_date: string;
  end_date: string;
  notes?: string;
  congregation_id?: string; // Adicionar para super-admin
  profile_id?: string; // Adicionar para admin/super-admin criar em nome de outros
}

export function useAbsences() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const absencesQuery = useQuery({
    queryKey: ["absences", selectedCongregationId],
    queryFn: async (): Promise<Absence[]> => {
      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("absences")
        .select("*, profile:profiles(id, full_name)")
        .gt("end_date", today)
        .order("start_date", { ascending: true });

      if (isSuperAdmin) {
        if (selectedCongregationId) {
          query = query.eq("congregation_id", selectedCongregationId);
        }
      } else if (profile?.congregation_id) {
        query = query.eq("congregation_id", profile.congregation_id);
      }

      // Fetch absences
      const { data: absences, error: absencesError } = await query;

      if (absencesError) throw absencesError;

      return (absences ?? []).map((absence) => ({
        ...absence,
        profile_name: absence.profile?.full_name ?? "Desconhecido",
      }));
    },
  });

  const createAbsenceMutation = useMutation({
    mutationFn: async (data: CreateAbsenceData) => {
      if (!profile?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("absences").insert({
        profile_id: data.profile_id || profile.id,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes || null,
        congregation_id: isSuperAdmin && selectedCongregationId ? selectedCongregationId : profile.congregation_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Ausência registrada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error creating absence:", error);
      toast.error("Erro ao registrar ausência: " + error.message);
    },
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: async (absenceId: string) => {
      const { error } = await supabase
        .from("absences")
        .delete()
        .eq("id", absenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Ausência removida com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error deleting absence:", error);
      toast.error("Erro ao remover ausência: " + error.message);
    },
  });

  return {
    absences: absencesQuery.data ?? [],
    isLoading: absencesQuery.isLoading,
    error: absencesQuery.error,
    createAbsence: createAbsenceMutation.mutate,
    isCreating: createAbsenceMutation.isPending,
    deleteAbsence: deleteAbsenceMutation.mutate,
    isDeleting: deleteAbsenceMutation.isPending,
  };
}
