import apiClient from './client';

export interface BannerDto {
  id: number | string;
  title?: string;
  name?: string;
  imageUrl?: string;
  videoUrl?: string | null;
  linkUrl?: string | null;
  targetUrl?: string | null;
  targetApp?: string | null;
  actionType?: string | null;
  actionValue?: string | null;
  sortOrder?: number;
  displayOrder?: number;
  active?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function extractBannerList(data: any): BannerDto[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.banners)) return data.banners;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const bannersApi = {
  /**
   * Fetch banners directly from the Admin Banner API (/api/admin/banners)
   */
  getAdminBanners: async (): Promise<BannerDto[]> => {
    try {
      const response = await apiClient.get<any>('/api/admin/banners');
      return extractBannerList(response.data);
    } catch (error) {
      console.warn('Failed to fetch admin banners from /api/admin/banners', error);
      return [];
    }
  },

  /**
   * Fetch active banners from the Customer Banner API (/api/customer/banners)
   */
  getCustomerBanners: async (): Promise<BannerDto[]> => {
    try {
      const response = await apiClient.get<any>('/api/customer/banners');
      return extractBannerList(response.data);
    } catch (error) {
      console.warn('Failed to fetch customer banners from /api/customer/banners', error);
      return [];
    }
  },

  /**
   * Dynamically fetch banners added by Admin:
   * Prioritizes /api/admin/banners, falls back to /api/customer/banners if empty.
   */
  getBanners: async (): Promise<BannerDto[]> => {
    try {
      // 1. Try Admin Banner API first
      const adminBanners = await bannersApi.getAdminBanners();
      if (adminBanners && adminBanners.length > 0) {
        return adminBanners.filter((b) => b.isActive !== false && b.active !== false);
      }

      // 2. Try Customer Banner API
      const customerBanners = await bannersApi.getCustomerBanners();
      if (customerBanners && customerBanners.length > 0) {
        return customerBanners.filter((b) => b.isActive !== false && b.active !== false);
      }

      return [];
    } catch (error) {
      console.warn('Failed to load banners from APIs', error);
      return [];
    }
  },
};

export default bannersApi;
