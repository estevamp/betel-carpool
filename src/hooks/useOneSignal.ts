import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';

/**
 * Hook to initialize OneSignal and set user identification
 */
export function useOneSignal() {
  const { user, profile } = useAuth();

  useEffect(() => {
    const initializeOneSignal = async () => {
      try {
        // Initialize OneSignal
        await oneSignalService.initialize();

        // If user is logged in, set their external user ID
        if (user?.id) {
          await oneSignalService.setExternalUserId(user.id);
          
          // Add tags for user segmentation
          if (profile) {
            await oneSignalService.addTags({
              congregation_id: profile.congregation_id || 'unknown',
              user_role: 'betelita',
              full_name: profile.full_name || 'Unknown',
            });
          }
        }
      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    };

    // Only initialize if user is logged in
    if (user) {
      initializeOneSignal();
    }
  }, [user, profile]);

  return {
    requestPermission: oneSignalService.requestPermission.bind(oneSignalService),
    isSubscribed: oneSignalService.isSubscribed.bind(oneSignalService),
  };
}
