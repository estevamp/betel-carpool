import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCongregations } from '@/hooks/useCongregations';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CongregationContextType {
  selectedCongregationId: string | null;
  setSelectedCongregationId: (id: string | null) => void;
}

const CongregationContext = createContext<CongregationContextType | undefined>(undefined);

export const CongregationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);
  const { isSuperAdmin } = useIsSuperAdmin();
  const { profile, isAdmin } = useAuth();
  const { congregations, isLoading } = useCongregations();

  // Auto-select congregation based on user role
  useEffect(() => {
    if (isLoading || !profile || !congregations || congregations.length === 0) return;

    // For super-admin: if no congregation is selected, try to set a default
    if (isSuperAdmin && !selectedCongregationId) {
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
            setSelectedCongregationId(congregations[0].id);
          }
        } catch (error) {
          console.error('Error loading default congregation:', error);
          setSelectedCongregationId(congregations[0].id);
        }
      };
      loadDefaultCongregation();
    }
    // For regular admin/user: use their profile's congregation_id if it exists and is different from selected
    else if (!isSuperAdmin && profile.congregation_id && selectedCongregationId !== profile.congregation_id) {
      setSelectedCongregationId(profile.congregation_id);
    }
  }, [isSuperAdmin, isLoading, profile, congregations, selectedCongregationId, setSelectedCongregationId]);

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
