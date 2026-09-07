import apiClient from './client';
import { Order } from '@/types/order';

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: string;
}

export interface UpdateOrderStatusPayload {
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  trackingNo?: string;
  shippingCarrier?: string;
}

function unwrapOrderData(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.orders)) return payload.orders;
    if (Array.isArray(payload.data)) return payload.data;
  }
  return [];
}

function normalizeOrder(data: any): Order {
  const address =
    typeof data?.shippingAddress === 'string'
      ? { name: '', street: data.shippingAddress, city: '', state: '', pincode: '', phone: '' }
      : data?.shippingAddress || { name: '', street: '', city: '', state: '', pincode: '', phone: '' };

  return {
    ...data,
    id: String(data?.id || ''),
    orderNumber: data?.orderNumber || data?.orderNo || String(data?.id || ''),
    items: Array.isArray(data?.items) ? data.items : [],
    subtotal: Number(data?.subtotal || 0),
    tax: Number(data?.tax || 0),
    shipping: Number(data?.shipping || 0),
    total: Number(data?.grandTotal ?? data?.total ?? 0),
    currency: data?.currency || 'INR',
    status: String(data?.status || 'PENDING').toLowerCase() as Order['status'],
    shippingAddress: address,
    trackingNumber: data?.trackingNumber || data?.trackingNo,
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt || data?.createdAt || new Date().toISOString(),
  };
}

export const ordersApi = {
  /**
   * 🛒 BUYER: Orders & Checkout
   * POST /api/v1/buyer/orders - Place a new order (Checkout)
   */
  createBuyerOrder: async (orderData: CreateOrderPayload, idempotencyKey?: string): Promise<Order> => {
    const response = await apiClient.post('/api/buyer/orders', orderData, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return normalizeOrder((response.data as any)?.data || response.data);
  },

  /**
   * GET /api/buyer/orders - List all past orders (Purchase history)
   */
  getBuyerOrders: async (): Promise<Order[]> => {
    try {
      const response = await apiClient.get('/api/buyer/orders');
      return unwrapOrderData(response.data).map(normalizeOrder);
    } catch {
      return [];
    }
  },

  /**
   * GET /api/buyer/orders/{id} - Get full details and status of a specific order
   */
  getBuyerOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/api/buyer/orders/${id}`);
    return normalizeOrder((response.data as any)?.data || response.data);
  },

  /**
   * 🚚 SELLER: Order Fulfillment
   * GET /api/seller/orders - List all incoming orders assigned to the seller
   */
  getSellerOrders: async (): Promise<Order[]> => {
    try {
      const response = await apiClient.get('/api/seller/orders');
      return unwrapOrderData(response.data).map(normalizeOrder);
    } catch {
      return [];
    }
  },

  /**
   * GET /api/seller/orders/{id} - Get details of an incoming order
   */
  getSellerOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/api/seller/orders/${id}`);
    return normalizeOrder((response.data as any)?.data || response.data);
  },

  /**
   * PUT /api/seller/orders/{id}/status - Update order status
   */
  updateSellerOrderStatus: async (
    id: string,
    payload: UpdateOrderStatusPayload
  ): Promise<Order> => {
    const response = await apiClient.put(`/api/seller/orders/${id}/status`, payload);
    return normalizeOrder((response.data as any)?.data || response.data);
  },

  // Aliases for convenience
  getOrders: async (): Promise<Order[]> => ordersApi.getBuyerOrders(),
  getOrderById: async (id: string): Promise<Order> => ordersApi.getBuyerOrderById(id),
  createOrder: async (orderData: CreateOrderPayload, idempotencyKey?: string): Promise<Order> =>
    ordersApi.createBuyerOrder(orderData, idempotencyKey),
};

