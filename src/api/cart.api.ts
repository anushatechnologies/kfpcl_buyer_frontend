import apiClient from './client';
import { BackendCart } from '@/types/cart';

export const cartApi = {
  /**
   * 🛒 6. Persistent Shopping Cart
   * GET /api/v1/buyer/cart - Fetch the buyer's saved cart
   */
  getCart: async (): Promise<BackendCart> => {
    try {
      const response = await apiClient.get<any>('/api/buyer/cart');
      const data = response.data?.data ?? response.data;
      return {
        id: data?.id || '',
        buyerId: data?.buyerId || '',
        items: Array.isArray(data?.items) ? data.items : [],
      };
    } catch (err) {
      console.warn('Failed to fetch remote cart, using local state fallback', err);
      return { items: [] };
    }
  },

  /**
   * PUT /api/buyer/cart - Upsert (Add or Update) an item in the cart
   * Request Body: { productId: string, variantId?: string, quantity: number }
   */
  updateCartItem: async (
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<BackendCart> => {
    try {
      const payload: { productId: string; quantity: number; variantId?: string } = {
        productId,
        quantity,
      };
      if (variantId) {
        payload.variantId = variantId;
      }
      const response = await apiClient.put<any>('/api/buyer/cart', payload);
      const data = response.data?.data ?? response.data;
      return {
        id: data?.id || '',
        buyerId: data?.buyerId || '',
        items: Array.isArray(data?.items) ? data.items : [],
      };
    } catch (err) {
      console.warn('Failed to sync item to remote cart', err);
      return { items: [] };
    }
  },

  /**
   * DELETE /api/buyer/cart/items/{itemId} - Remove an item entirely from the cart
   */
  removeCartItem: async (itemId: string): Promise<BackendCart> => {
    try {
      const response = await apiClient.delete<any>(`/api/buyer/cart/items/${itemId}`);
      const data = response.data?.data ?? response.data;
      return {
        id: data?.id || '',
        buyerId: data?.buyerId || '',
        items: Array.isArray(data?.items) ? data.items : [],
      };
    } catch (err) {
      console.warn('Failed to remove item from remote cart', err);
      return { items: [] };
    }
  },
};
