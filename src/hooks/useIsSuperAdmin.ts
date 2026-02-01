import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIsSuperAdmin = () => {
  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ['is-super-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();
      
      if (error) return false;
      return !!data;
    },
  });

  return { isSuperAdmin: isSuperAdmin ?? false, isLoading };
};
