import apiClient from './client';

export interface CustomerProfileDto {
  id: number | string;
  phoneNumber: string;
  fullName: string;
  email: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  walletBalance?: number;
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
}

export const profileApi = {
  /**
   * 9. Get Customer Profile
   * GET /api/customer/profile
   * Auth Level: Bearer Token
   */
  getProfile: async (): Promise<CustomerProfileDto> => {
    const response = await apiClient.get<any>('/api/customer/profile');
    const data = response.data?.data || response.data;
    return {
      id: data?.id,
      phoneNumber: data?.phoneNumber || data?.phone || '',
      fullName: data?.fullName || data?.name || '',
      email: data?.email || '',
      companyName: data?.companyName || data?.company?.name || '',
      businessType: data?.businessType || data?.industry || '',
      state: data?.state || '',
      city: data?.city || '',
      isVerified: Boolean(data?.isVerified ?? true),
      isActive: data?.isActive !== false,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      walletBalance: data?.walletBalance != null ? Number(data.walletBalance) : 0,
    };
  },

  /**
   * 10. Update Customer Profile
   * PUT /api/customer/profile
   * Auth Level: Bearer Token
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<CustomerProfileDto> => {
    const response = await apiClient.put<any>('/api/customer/profile', payload);
    const data = response.data?.data || response.data;
    return {
      id: data?.id,
      phoneNumber: data?.phoneNumber || data?.phone || '',
      fullName: data?.fullName || data?.name || '',
      email: data?.email || '',
      companyName: data?.companyName || data?.company?.name || '',
      businessType: data?.businessType || data?.industry || '',
      state: data?.state || '',
      city: data?.city || '',
      isVerified: Boolean(data?.isVerified ?? true),
      isActive: data?.isActive !== false,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      walletBalance: data?.walletBalance != null ? Number(data.walletBalance) : 0,
    };
  },

  /**
   * 11. Soft-Delete Customer Profile
   * DELETE /api/customer/profile
   * Auth Level: Bearer Token
   */
  deleteProfile: async (refreshToken?: string): Promise<{ success: boolean; message: string }> => {
    const params = refreshToken ? { refreshToken } : undefined;
    const response = await apiClient.delete<any>('/api/customer/profile', { params });
    const data = response.data?.data || response.data;
    return {
      success: data?.success !== false,
      message: data?.message || 'Buyer profile account deactivated successfully',
    };
  },
};

export default profileApi;
