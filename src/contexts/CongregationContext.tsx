import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCongregations } from '@/hooks/useCongregations';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { supabase } from '@/integrations/supabase/client';

interface CongregationContextType {
  selectedCongregationId: string | null;
  setSelectedCongregationId: (id: string | null) => void;
}

const CongregationContext = createContext<CongregationContextType | undefined>(undefined);

export const CongregationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);
  const { isSuperAdmin } = useIsSuperAdmin();
  const { congregations, isLoading } = useCongregations();

  // Auto-select default congregation for super-admin if none is selected
  useEffect(() => {
    if (isSuperAdmin && !isLoading && congregations && congregations.length > 0 && !selectedCongregationId) {
      // Try to load the default congregation from settings
      const loadDefaultCongregation = async () => {
        try {
          const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'default_congregation_id')
            .maybeSingle();

          if (data?.value && congregations.some((c) => c.id === data.value)) {
            setSelectedCongregationId(data.value);
          } else {
            // Fall back to first congregation if no default is set
            setSelectedCongregationId(congregations[0].id);
          }
        } catch (error) {
          console.error('Error loading default congregation:', error);
          // Fall back to first congregation on error
          setSelectedCongregationId(congregations[0].id);
        }
      };

      loadDefaultCongregation();
    }
  }, [isSuperAdmin, isLoading, congregations, selectedCongregationId]);

  return (
    <CongregationContext.Provider value={{ selectedCongregationId, setSelectedCongregationId }}>
      {children}
    </CongregationContext.Provider>
  );
};

export const useSelectedCongregation = () => {
  const context = useContext(CongregationContext);
  if (!context) {
    throw new Error('useSelectedCongregation must be used within CongregationProvider');
  }
  return context;
};
