// OneSignal Service for Web Push Notifications
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export interface OneSignalNotificationOptions {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

class OneSignalService {
  private isInitialized = false;
  
  private async withOneSignal<T>(callback: (oneSignal: any) => Promise<T>): Promise<T | null> {
    try {
      if ((window as any).OneSignal) {
        return await callback((window as any).OneSignal);
      }

      if (window.OneSignalDeferred) {
        return await new Promise<T>((resolve, reject) => {
          window.OneSignalDeferred!.push(async (OneSignal: any) => {
            try {
              const result = await callback(OneSignal);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error waiting for OneSignal:', error);
    }

    return null;
  }

  /**
   * Initialize OneSignal and get user permission
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          // Check if user is subscribed
          const isPushSupported = await OneSignal.Notifications.isPushSupported();
          
          if (isPushSupported) {
            console.log('OneSignal: Push notifications are supported');
            this.isInitialized = true;
          }
        });
      }
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  }

  /**
   * Request permission to send push notifications
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await this.withOneSignal(async (OneSignal) => {
        return await OneSignal.Notifications.requestPermission();
      });
      return !!permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed to push notifications
   */
  async isSubscribed(): Promise<boolean> {
    try {
      const permission = await this.withOneSignal(async (OneSignal) => {
        return await OneSignal.Notifications.permission;
      });
      return !!permission;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get the OneSignal Player ID (User ID)
   */
  async getPlayerId(): Promise<string | null> {
    try {
      const userId = await this.withOneSignal(async (OneSignal) => {
        return await OneSignal.User.PushSubscription.id;
      });
      return userId;
    } catch (error) {
      console.error('Error getting player ID:', error);
      return null;
    }
  }

  /**
   * Set external user ID (e.g., your app's user ID)
   */
  async setExternalUserId(userId: string): Promise<void> {
    try {
      await this.withOneSignal(async (OneSignal) => {
        // Check if already logged in with this ID to avoid redundant calls
        const currentExternalId = await OneSignal.User.externalId;
        if (currentExternalId === userId) {
          console.log('OneSignal: Already logged in with external ID:', userId);
          return true;
        }
        
        console.log('OneSignal: Logging in with external ID:', userId);
        await OneSignal.login(userId);
        return true;
      });
    } catch (error) {
      console.error('Error setting external user ID:', error);
    }
  }

  /**
   * Add tags to the user for segmentation
   */
  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      await this.withOneSignal(async (OneSignal) => {
        await OneSignal.User.addTags(tags);
        return true;
      });
      console.log('OneSignal: Tags added:', tags);
    } catch (error) {
      console.error('Error adding tags:', error);
    }
  }

  /**
   * Send a notification (requires backend API call to OneSignal REST API)
   * This is a helper to prepare notification data
   */
  prepareNotificationData(options: OneSignalNotificationOptions) {
    return {
      app_id: 'cb24512d-c95a-4533-a08b-259a5e289e0e',
      headings: { en: options.title },
      contents: { en: options.message },
      url: options.url,
      data: options.data,
    };
  }

  /**
   * Send notification to specific user via Supabase Edge Function
   */
  async sendNotificationToUser(
    userId: string,
    options: OneSignalNotificationOptions
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId,
            title: options.title,
            message: options.message,
            url: options.url,
            data: options.data,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification');
      }

      console.log('Notification sent successfully:', result);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users by external IDs via Supabase Edge Function
   */
  async sendNotificationToUsers(
    userIds: string[],
    options: OneSignalNotificationOptions
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userIds,
            title: options.title,
            message: options.message,
            url: options.url,
            data: options.data,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification');
      }

      console.log('Notifications sent successfully:', result);
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification when a passenger is added to a car
   */
  async notifyPassengerAdded(
    driverUserId: string,
    passengerName: string,
    carDestination?: string
  ): Promise<void> {
    const message = carDestination
      ? `${passengerName} foi adicionado ao seu carro com destino a ${carDestination}`
      : `${passengerName} foi adicionado ao seu carro`;

    await this.sendNotificationToUser(driverUserId, {
      title: 'Novo Passageiro Adicionado',
      message,
      url: '/desocupacao',
      data: {
        type: 'passenger_added',
        passengerName,
        destination: carDestination,
      },
    });
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalService();
