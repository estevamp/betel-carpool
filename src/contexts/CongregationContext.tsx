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

  // Auto-select congregation based on user role and update profile if needed
  useEffect(() => {
    if (isLoading || !profile || !congregations || congregations.length === 0) return;

    // If super-admin and no congregation is selected, try to set a default
    if (isSuperAdmin && !selectedCongregationId) {
      const loadDefaultCongregation = async () => {
        let defaultId: string | null = null;
        try {
          const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'default_congregation_id')
            .maybeSingle();

          if (data?.value && congregations.some((c) => c.id === data.value)) {
            defaultId = data.value;
          } else {
            defaultId = congregations[0].id;
          }
        } catch (error) {
          console.error('Error loading default congregation:', error);
          defaultId = congregations[0].id;
        }

        if (defaultId) {
          setSelectedCongregationId(defaultId);
          // Update super-admin's profile if congregation_id is null
          if (!profile.congregation_id) {
            await supabase
              .from('profiles')
              .update({ congregation_id: defaultId })
              .eq('id', profile.id);
          }
        }
      };
      loadDefaultCongregation();
    }
    // For regular admin/user, ensure selectedCongregationId matches profile's congregation_id
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
