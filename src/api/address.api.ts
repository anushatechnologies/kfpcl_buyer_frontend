import apiClient from './client';

export interface AddressDto {
  id: number;
  addressType?: string;
  houseNo?: string;
  flatNumber?: string;
  streetDetails?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  contactName?: string;
  contactPhone?: string;
}

export interface AddressPayload {
  addressType?: string;
  houseNo?: string;
  flatNumber?: string;
  streetDetails?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  contactName?: string;
  contactPhone?: string;
}

const normalizeAddressDto = (item: any): AddressDto => ({
  id: Number(item?.id || Date.now()),
  addressType: item?.addressType || 'Warehouse',
  houseNo: item?.houseNo || item?.flatNumber || '',
  flatNumber: item?.flatNumber || item?.houseNo || '',
  streetDetails: item?.streetDetails || item?.addressLine1 || '',
  addressLine1: item?.addressLine1 || item?.streetDetails || '',
  addressLine2: item?.addressLine2 || '',
  landmark: item?.landmark || '',
  city: item?.city || '',
  state: item?.state || '',
  pincode: item?.pincode || item?.postalCode || '',
  postalCode: item?.postalCode || item?.pincode || '',
  latitude: typeof item?.latitude === 'number' ? item.latitude : 0,
  longitude: typeof item?.longitude === 'number' ? item.longitude : 0,
  isDefault: Boolean(item?.isDefault),
  contactName: item?.contactName || '',
  contactPhone: item?.contactPhone || '',
});

export const addressApi = {
  /**
   * 12. Get Addresses
   * GET /api/addresses
   * Auth Level: Bearer Token
   */
  getAddresses: async (): Promise<AddressDto[]> => {
    const response = await apiClient.get<any>('/api/addresses');
    const data = response.data?.data || response.data;
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
    return list.map(normalizeAddressDto);
  },

  /**
   * 13. Create Address
   * POST /api/addresses
   * Auth Level: Bearer Token
   */
  createAddress: async (payload: AddressPayload): Promise<AddressDto> => {
    const body = {
      addressType: payload.addressType || 'Warehouse',
      houseNo: payload.houseNo || payload.flatNumber || '',
      streetDetails: payload.streetDetails || payload.addressLine1 || '',
      landmark: payload.landmark || '',
      city: payload.city,
      state: payload.state || '',
      pincode: payload.pincode || payload.postalCode || '',
      isDefault: Boolean(payload.isDefault),
      ...(payload.latitude ? { latitude: payload.latitude } : {}),
      ...(payload.longitude ? { longitude: payload.longitude } : {}),
      ...(payload.contactName ? { contactName: payload.contactName } : {}),
      ...(payload.contactPhone ? { contactPhone: payload.contactPhone } : {}),
    };

    const response = await apiClient.post<any>('/api/addresses', body);
    const data = response.data?.data || response.data;
    return normalizeAddressDto({ ...body, ...data });
  },

  /**
   * 14. Update Address
   * PUT /api/addresses/{id}
   * Auth Level: Bearer Token
   */
  updateAddress: async (id: number | string, payload: AddressPayload): Promise<AddressDto> => {
    const body = {
      addressType: payload.addressType || 'Warehouse',
      houseNo: payload.houseNo || payload.flatNumber || '',
      streetDetails: payload.streetDetails || payload.addressLine1 || '',
      landmark: payload.landmark || '',
      city: payload.city,
      state: payload.state || '',
      pincode: payload.pincode || payload.postalCode || '',
      isDefault: Boolean(payload.isDefault),
      ...(payload.latitude ? { latitude: payload.latitude } : {}),
      ...(payload.longitude ? { longitude: payload.longitude } : {}),
      ...(payload.contactName ? { contactName: payload.contactName } : {}),
      ...(payload.contactPhone ? { contactPhone: payload.contactPhone } : {}),
    };

    const response = await apiClient.put<any>(`/api/addresses/${id}`, body);
    const data = response.data?.data || response.data;
    return normalizeAddressDto({ ...body, ...data, id: Number(id) });
  },

  /**
   * 15. Delete Address
   * DELETE /api/addresses/{id}
   * Auth Level: Bearer Token
   */
  deleteAddress: async (id: number | string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<any>(`/api/addresses/${id}`);
    const data = response.data?.data || response.data;
    return {
      success: data?.success !== false,
      message: data?.message || 'Address deleted successfully',
    };
  },
};

export default addressApi;
