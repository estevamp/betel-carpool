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
      if (!window.OneSignal) {
        console.warn('OneSignal not loaded yet');
        return false;
      }

      const permission = await window.OneSignal.Notifications.requestPermission();
      return permission;
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
      if (!window.OneSignal) return false;
      
      const permission = await window.OneSignal.Notifications.permission;
      return permission;
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
      if (!window.OneSignal) return null;
      
      const userId = await window.OneSignal.User.PushSubscription.id;
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
      if (!window.OneSignal) return;
      
      await window.OneSignal.login(userId);
      console.log('OneSignal: External user ID set:', userId);
    } catch (error) {
      console.error('Error setting external user ID:', error);
    }
  }

  /**
   * Add tags to the user for segmentation
   */
  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      if (!window.OneSignal) return;
      
      await window.OneSignal.User.addTags(tags);
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
        `${supabase.supabaseUrl}/functions/v1/send-push-notification`,
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
        `${supabase.supabaseUrl}/functions/v1/send-push-notification`,
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
