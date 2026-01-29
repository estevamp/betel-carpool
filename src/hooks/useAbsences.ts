import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Absence {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  profile_name: string;
}

export interface CreateAbsenceData {
  start_date: string;
  end_date: string;
  notes?: string;
}

export function useAbsences() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const absencesQuery = useQuery({
    queryKey: ["absences"],
    queryFn: async (): Promise<Absence[]> => {
      // Fetch absences
      const { data: absences, error: absencesError } = await supabase
        .from("absences")
        .select("*")
        .order("start_date", { ascending: true });

      if (absencesError) throw absencesError;

      // Fetch profiles for names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;

      const profileNameMap = new Map(
        profiles?.map((p) => [p.id, p.full_name]) ?? []
      );

      return (absences ?? []).map((absence) => ({
        ...absence,
        profile_name: profileNameMap.get(absence.profile_id) ?? "Desconhecido",
      }));
    },
  });

  const createAbsenceMutation = useMutation({
    mutationFn: async (data: CreateAbsenceData) => {
      if (!profile?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("absences").insert({
        profile_id: profile.id,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Ausência registrada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating absence:", error);
      toast.error("Erro ao registrar ausência");
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
    onError: (error) => {
      console.error("Error deleting absence:", error);
      toast.error("Erro ao remover ausência");
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
