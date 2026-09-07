import apiClient from './client';

export interface SaveFcmTokenPayload {
  fcmToken: string;
  deviceType?: 'WEB' | 'ANDROID' | 'IOS';
}

export interface PolicyDto {
  id?: number;
  type: string;
  content: string;
  updatedAt?: string;
}

export interface AppVersionDto {
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
}

export const systemApi = {
  /**
   * 16. Save Firebase FCM Token
   * POST /api/save-token (with fallback to /api/fcm/tokens)
   * Auth Level: Bearer Token
   */
  saveFcmToken: async (fcmToken: string, deviceType: 'WEB' | 'ANDROID' | 'IOS' = 'WEB'): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post<any>('/api/save-token', {
        fcmToken,
        deviceType,
      });
      return { success: response.data?.success !== false };
    } catch {
      // Fallback endpoint
      try {
        const altResponse = await apiClient.post<any>('/api/fcm/tokens', {
          fcmToken,
          deviceType,
        });
        return { success: altResponse.data?.success !== false };
      } catch (err) {
        console.warn('FCM token registration failed:', err);
        return { success: false };
      }
    }
  },

  /**
   * 17. Get App Policies
   * GET /api/policies/{type}
   * Auth Level: Public
   */
  getPolicy: async (type: string): Promise<PolicyDto> => {
    const response = await apiClient.get<any>(`/api/policies/${type}`);
    const data = response.data?.data || response.data;
    return {
      id: data?.id,
      type: data?.type || type,
      content: data?.content || (typeof data === 'string' ? data : ''),
      updatedAt: data?.updatedAt,
    };
  },

  /**
   * 18. Check App Version
   * GET /api/app/version?platform=...
   * Auth Level: Public
   */
  getAppVersion: async (platform: 'web' | 'android' | 'ios' = 'web'): Promise<AppVersionDto> => {
    const response = await apiClient.get<any>('/api/app/version', {
      params: { platform },
    });
    const data = response.data?.data || response.data;
    return {
      minVersion: data?.minVersion || '1.0.0',
      latestVersion: data?.latestVersion || '1.0.0',
      forceUpdate: Boolean(data?.forceUpdate),
    };
  },
};

export default systemApi;
