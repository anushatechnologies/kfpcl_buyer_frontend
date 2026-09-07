import apiClient from './client';

export interface Inquiry {
  id: string;
  productId: string;
  productName?: string;
  buyerName?: string;
  company?: string;
  location?: string;
  phone?: string;
  email?: string;
  product?: string;
  quantity?: string;
  subject?: string;
  message: string;
  status: string;
  replyMessage?: string;
  createdAt: string;
  date?: string;
}

export const inquiriesApi = {
  /**
   * GET /api/admin/inquiries - Fetch all buyer inquiries/enquiries for the seller
   */
  getInquiries: async (): Promise<Inquiry[]> => {
    try {
      let response: any;
      try {
        response = await apiClient.get<any>('/api/admin/inquiries');
      } catch {
        try {
          response = await apiClient.get<any>('/api/seller/inquiries');
        } catch {
          response = await apiClient.get<any>('/seller/inquiries');
        }
      }
      const data = response.data?.data || response.data || [];
      const items: any[] = Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : [];
      return items.map((item: any) => ({
        id: String(item.id ?? item.inquiryId ?? ''),
        productId: String(item.productId ?? ''),
        productName: item.productName || item.product?.name || '',
        buyerName: item.buyerName || item.buyer?.name || item.customerName || '',
        company: item.company || item.buyerCompany || '',
        location: item.location || item.buyerLocation || '',
        phone: item.phone || item.buyerPhone || '',
        email: item.email || item.buyerEmail || '',
        product: item.productName || item.product?.name || '',
        quantity: item.quantity ? String(item.quantity) : '',
        subject: item.subject || item.title || `Enquiry for ${item.productName || 'Product'}`,
        message: item.message || item.description || '',
        status: item.status || 'Unread',
        replyMessage: item.replyMessage || '',
        createdAt: item.createdAt || item.date || new Date().toISOString(),
        date: item.createdAt || item.date || '',
      }));
    } catch (err) {
      console.warn('Failed to load seller inquiries', err);
      return [];
    }
  },

  // Contact Seller / Send Inquiry
  sendInquiry: async (productId: string, message: string, supplierId?: string): Promise<any> => {
    try {
      const response = await apiClient.post<any>('/api/buyer/contact-seller', {
        productId: Number(productId) || 1,
        supplierId: supplierId || 'sup_101',
        contactType: 'CALL',
        buyerId: 1,
      });
      return response.data;
    } catch {
      const response = await apiClient.post<any>('/api/buyer/inquiries', {
        productId,
        message,
      });
      return response.data;
    }
  },

  contactSeller: async (payload: { productId: number; supplierId: string; contactType: 'CALL' | 'WHATSAPP'; buyerId?: number }): Promise<any> => {
    const response = await apiClient.post<any>('/api/buyer/contact-seller', payload);
    return response.data;
  },

  // Reply to Buyer Inquiry
  replyInquiry: async (inquiryId: string, replyMessage: string): Promise<any> => {
    const response = await apiClient.post<any>(`/api/seller/inquiries/${inquiryId}/reply`, {
      replyMessage,
    });
    return response.data;
  },
};
