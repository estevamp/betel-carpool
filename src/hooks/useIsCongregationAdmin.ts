import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsCongregationAdmin = () => {
  const { profile } = useAuth();

  const { data: isCongregationAdmin, isLoading } = useQuery({
    queryKey: ["isCongregationAdmin", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;

      const { data, error } = await supabase
        .from("congregation_administrators")
        .select("id")
        .eq("profile_id", profile.id)
        .limit(1);

      if (error) {
        console.error("Error checking congregation admin status:", error);
        return false;
      }

      return data.length > 0;
    },
    enabled: !!profile?.id,
  });

  return { isCongregationAdmin, isLoading };
};
