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
        const response = await supabase.functions.invoke('assign-congregation-admin', {
          body: {
            profile_id: profileId,
            congregation_id: congregationId,
            action: 'assign'
          },
        });

        const { data, error } = response;

        if (error) {
          if (error instanceof Error && 'context' in error) {
            const context = (error as any).context;
            if (context instanceof Response) {
              try {
                const body = await context.clone().json();
                if (body.error) throw new Error(body.error);
              } catch (e) {
                console.error('Could not parse error body as JSON', e);
              }
            }
          }
          throw error;
        }
        
        if (data?.error) {
          throw new Error(data.error);
        }
        
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      queryClient.invalidateQueries({ queryKey: ['betelitas'] });
      toast.success('Administrador adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar administrador');
    },
  });

  // Remover administrador (por ID da tabela congregation_administrators)
  const removeAdmin = useMutation({
    mutationFn: async ({ id, profileId, congregationId }: { id?: string; profileId: string; congregationId: string }) => {
      console.log('[removeAdmin] Starting removal:', { profileId, congregationId });
      
      try {
        const response = await supabase.functions.invoke('assign-congregation-admin', {
          body: {
            profile_id: profileId,
            congregation_id: congregationId,
            action: 'remove'
          },
        });

        const { data, error } = response;

        console.log('[removeAdmin] Response:', { data, error });

        // Handle FunctionsHttpError (non-2xx responses)
        if (error) {
          console.error('[removeAdmin] Edge function error:', error);
          
          // Try to extract error message from the response context
          if (error instanceof Error && 'context' in error) {
            const context = (error as any).context;
            console.log('[removeAdmin] Error context type:', context?.constructor?.name);
            
            if (context instanceof Response) {
              try {
                // Clone the response before reading to avoid consuming it
                const clonedResponse = context.clone();
                const body = await clonedResponse.json();
                console.log('[removeAdmin] Error body:', body);
                
                if (body.error) {
                  throw new Error(body.error);
                }
              } catch (parseError) {
                // Check if parseError is actually our thrown error with the message
                if (parseError instanceof Error && parseError.message !== error.message) {
                  // This is our intentionally thrown error with the proper message
                  throw parseError;
                }
                console.error('[removeAdmin] Failed to parse error body:', parseError);
                // If JSON parsing fails, throw the original error
                throw new Error(error.message || 'Erro ao remover administrador');
              }
            }
          }
          throw new Error(error.message || 'Erro ao remover administrador');
        }
        
        // Handle application-level errors in successful responses
        if (data?.error) {
          console.error('[removeAdmin] Application error in response:', data.error);
          throw new Error(data.error);
        }
        
        console.log('[removeAdmin] Success:', data);
        return data;
      } catch (err) {
        console.error('[removeAdmin] Caught error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      queryClient.invalidateQueries({ queryKey: ['betelitas'] });
      toast.success('Administrador removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover administrador');
    },
  });

  return {
    admins,
    isLoading,
    addAdmin,
    removeAdmin,
  };
};
