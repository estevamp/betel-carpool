import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Congregation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const useCongregations = () => {
  const queryClient = useQueryClient();

  // Buscar todas as congregações
  const { data: congregations, isLoading } = useQuery({
    queryKey: ['congregations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('congregations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Congregation[];
    },
  });

  // Criar congregação
  const createCongregation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('congregations')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar congregação: ' + error.message);
    },
  });

  // Atualizar congregação
  const updateCongregation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('congregations')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar congregação: ' + error.message);
    },
  });

  // Deletar congregação
  const deleteCongregation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('congregations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação deletada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao deletar congregação: ' + error.message);
    },
  });

  return {
    congregations,
    isLoading,
    createCongregation,
    updateCongregation,
    deleteCongregation,
  };
};
