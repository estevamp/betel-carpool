import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface Profile {
  id: string;
  full_name: string;
  is_driver: boolean | null;
  congregation_id: string | null;
}

export function useProfiles(options?: { congregationId?: string }) {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : options?.congregationId;

  return useQuery({
    queryKey: ["profiles", effectiveCongregationId],
    queryFn: async (): Promise<Profile[]> => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, is_driver, congregation_id")
        .order("full_name", { ascending: true });

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ?? [];
    },
  });
}
