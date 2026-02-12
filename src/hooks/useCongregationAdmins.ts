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
      try {
        // Usar a Edge Function que tem a lógica correta e permissões adequadas
        const { data, error } = await supabase.functions.invoke('assign-congregation-admin', {
          body: {
            profile_id: profileId,
            congregation_id: congregationId,
          },
        });

        console.log('Edge Function response:', { data, error });

        if (error) {
          console.error('Edge Function error:', error);
          // Tentar extrair mensagem do contexto do erro
          if (error.context) {
            console.error('Error context:', error.context);
          }
          throw error;
        }
        
        if (data?.error) {
          console.error('Edge Function returned error in data:', data);
          throw new Error(data.error);
        }
        
        return data;
      } catch (err: any) {
        console.error('Caught error in mutationFn:', err);
        // Re-throw para que o onError capture
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      toast.success('Administrador adicionado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Full error object:', error);
      
      // Tentar extrair a mensagem de erro mais específica
      let errorMessage = 'Erro desconhecido ao adicionar administrador';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
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
