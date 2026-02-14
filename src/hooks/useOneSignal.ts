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
      const hostname = window.location.hostname;
      const isVercelHost =
        hostname === 'betel-carpool.vercel.app' || hostname.endsWith('.vercel.app');

      if (!isVercelHost) {
        console.log('OneSignal disabled in non-production environment');
        return;
      }
      try {
        // Initialize OneSignal
        await oneSignalService.initialize();

        // If user is logged in, set their external user ID
        if (user?.id) {
          await oneSignalService.setExternalUserId(user.id);
          
          // Add tags for user segmentation
        if (profile) {
          const tags: Record<string, string> = {
            user_role: 'betelita',
            full_name: profile.full_name || 'Unknown',
          };
          if (profile.congregation_id) {
            tags.congregation_id = profile.congregation_id;
          }
          await oneSignalService.addTags(tags);
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

  const requestPermission = async () => {
    const permissionGranted = await oneSignalService.requestPermission();

    if (permissionGranted && user?.id) {
      await oneSignalService.setExternalUserId(user.id);

      if (profile) {
        const tags: Record<string, string> = {
          user_role: 'betelita',
          full_name: profile.full_name || 'Unknown',
        };
        if (profile.congregation_id) {
          tags.congregation_id = profile.congregation_id;
        }
        await oneSignalService.addTags(tags);
      }
    }

    return permissionGranted;
  };

  return {
    requestPermission,
    isSubscribed: oneSignalService.isSubscribed.bind(oneSignalService),
  };
}
