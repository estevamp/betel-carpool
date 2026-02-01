import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CongregationAdministrator {
  id: string;
  profile_id: string;
  congregation_id: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string | null;
  };
  congregation?: {
    id: string;
    name: string;
  };
}

export const useCongregationAdmins = (congregationId?: string) => {
  const queryClient = useQueryClient();

  // Buscar administradores
  const { data: admins, isLoading } = useQuery({
    queryKey: ['congregation-admins', congregationId],
    queryFn: async () => {
      let query = supabase
        .from('congregation_administrators')
        .select(`
          *,
          profile:profiles(id, full_name, email),
          congregation:congregations(id, name)
        `);
      
      if (congregationId) {
        query = query.eq('congregation_id', congregationId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as CongregationAdministrator[];
    },
    enabled: !!congregationId || congregationId === undefined,
  });

  // Adicionar administrador
  const addAdmin = useMutation({
    mutationFn: async ({ profileId, congregationId }: { profileId: string; congregationId: string }) => {
      // Primeiro, adicionar a role de admin se não existir
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar o user_id do profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.user_id) throw new Error('Perfil não tem usuário associado');

      // Adicionar role de admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'admin' })
        .select();

      // Ignorar erro se já existir
      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Adicionar como administrador da congregação
      const { data, error } = await supabase
        .from('congregation_administrators')
        .insert({ profile_id: profileId, congregation_id: congregationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      toast.success('Administrador adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar administrador: ' + error.message);
    },
  });

  // Remover administrador
  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('congregation_administrators')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      toast.success('Administrador removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover administrador: ' + error.message);
    },
  });

  return {
    admins,
    isLoading,
    addAdmin,
    removeAdmin,
  };
};
