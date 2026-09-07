import { readStoredSession, writeStoredSession } from '../lib/session';
import * as storefrontApi from "../services/storefrontApi";
import type {
  Address,
  AddressPayload,
  AppliedCoupon,
  Banner,
  Category,
  CheckoutSettings,
  Coupon,
  CustomerProfile,
  CustomerSession,
  FreeItemOffer,
  OrderTracking,
  PaymentMethod,
  PlacedOrder,
  PolicyContent,
  Product,
  ProductSuggestion,
  ServerCart,
  Store,
  SubCategory,
} from '../types/storefront';

export const getBanners = async (): Promise<Banner[]> => {
  return storefrontApi.getBanners().catch(() => []);
};

export const getCategories = async (): Promise<Category[]> => {
  return storefrontApi.getCategories().catch(() => []);
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
  return storefrontApi.getCategoryById(id).catch(() => null);
};

export const getSubcategories = async (categoryId?: number): Promise<SubCategory[]> => {
  return storefrontApi.getSubcategories(categoryId).catch(() => []);
};

export const getStores = async (query?: { name?: string; page?: number; size?: number }): Promise<Store[]> => {
  return storefrontApi.getStores(query).catch(() => []);
};

export const getProducts = async (query?: {
  storeId?: number;
  categoryId?: number;
  subCategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  trending?: boolean;
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<Product[]> => {
  return storefrontApi.getProducts(query).catch(() => []);
};

export const getTrendingProducts = async (): Promise<Product[]> => {
  return storefrontApi.getTrendingProducts().catch(() => []);
};

export const getBestSellerProducts = async (): Promise<Product[]> => {
  return storefrontApi.getBestSellerProducts().catch(() => []);
};

export const getProductSuggestions = async (keyword: string): Promise<ProductSuggestion[]> => {
  return storefrontApi.getProductSuggestions(keyword).catch(() => []);
};

export const getProductById = async (id: number | string): Promise<Product | null> => {
  return storefrontApi.getProductById(id).catch(() => null);
};

export const getWishlist = async (buyerId?: number | string) => {
  return storefrontApi.getWishlist(buyerId);
};

export const addToWishlist = async (productId: number | string, buyerId?: number | string) => {
  return storefrontApi.addToWishlist(productId, buyerId);
};

export const removeFromWishlist = async (productId: number | string, buyerId?: number | string) => {
  return storefrontApi.removeFromWishlist(productId, buyerId);
};

export const contactSeller = async (payload: { productId: number; supplierId: string; contactType: "CALL" | "WHATSAPP"; buyerId?: number }) => {
  return storefrontApi.contactSeller(payload);
};

export const getCheckoutSettings = async (): Promise<CheckoutSettings> => {
  return storefrontApi.getCheckoutSettings().catch(() => ({
    deliveryCharge: 0,
    platformFee: 0,
    handlingCharge: 0,
    smallCartFee: 0,
    smallCartThreshold: 0,
    onlinePaymentEnabled: true,
    cashOnDeliveryEnabled: true,
  }));
};

export const getActiveCoupons = async (): Promise<Coupon[]> => {
  return storefrontApi.getActiveCoupons().catch(() => []);
};

export const getActiveFreeItemOffers = async (): Promise<FreeItemOffer[]> => {
  return storefrontApi.getActiveFreeItemOffers().catch(() => []);
};

export const applyCoupon = async (payload: { code: string; customerId: number; cartValue: number }): Promise<AppliedCoupon> => {
  return storefrontApi.applyCoupon(payload).catch(() => ({
    success: false,
    code: payload.code.trim().toUpperCase(),
    discount: 0,
    finalValue: payload.cartValue,
  }));
};

export const getPolicy = async (type: string): Promise<PolicyContent> => {
  return storefrontApi.getPolicy(type).catch(() => ({
    id: 1,
    type,
    content: "",
  }));
};

export const createLocalSession = (name?: string, email?: string): CustomerSession => {
  const existing = readStoredSession();
  const session: CustomerSession = {
    accessToken: `session-${Date.now()}`,
    refreshToken: `refresh-${Date.now()}`,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    customerId: existing?.customerId || 1,
    phoneNumber: existing?.phoneNumber || '9876543210',
    name: name || existing?.name || 'Buyer',
    email: email || existing?.email || 'buyer1@kfpcl.com',
    walletBalance: existing?.walletBalance ?? 0,
    roles: 'buyer',
  };
  writeStoredSession(session);
  return session;
};

export const getCustomerProfile = async (): Promise<CustomerProfile> => {
  return storefrontApi.getCustomerProfile().catch(() => {
    const session = readStoredSession();
    return {
      id: session?.customerId || 1,
      name: session?.name || 'Buyer',
      phoneNumber: session?.phoneNumber || '9876543210',
      email: session?.email || 'buyer1@kfpcl.com',
      walletBalance: Number(session?.walletBalance || 0),
      isActive: true,
    };
  });
};

export const updateCustomerProfile = async (payload: { name?: string; email?: string }) => {
  return storefrontApi.updateCustomerProfile(payload);
};

export const getAddresses = async () => storefrontApi.getAddresses().catch(() => []);
export const saveAddress = async (payload: AddressPayload, addressId?: number): Promise<Address> => {
  return storefrontApi.saveAddress(payload, addressId);
};
export const deleteAddress = async (addressId: number) => storefrontApi.deleteAddress(addressId);

export const syncCartToServer = async (items: Array<{ variantId: number; quantity: number }>): Promise<ServerCart> => {
  return storefrontApi.syncCartToServer(items).catch(() => ({
    items: [],
    freeItems: [],
    subtotal: 0,
    deliveryCharge: 0,
    platformFee: 0,
    grandTotal: 0,
  }));
};

export const placeOrder = async (payload: { addressId: number; paymentMethod: PaymentMethod; walletAmount?: number; couponCode?: string }): Promise<PlacedOrder> => {
  return storefrontApi.placeOrder(payload);
};

export const getOrders = async () => storefrontApi.getOrders().catch(() => []);
export const getOrderById = async (id: number) => storefrontApi.getOrderById(id).catch(() => null);
export const getOrderTracking = async (orderNumber: string): Promise<OrderTracking> => storefrontApi.getOrderTracking(orderNumber);
export const initiateOnlinePayment = async (orderId: number) => storefrontApi.initiateOnlinePayment(orderId);
export const verifyOnlinePayment = async (payload: any) => storefrontApi.verifyOnlinePayment(payload);
export const requestRefund = async (payload: any) => storefrontApi.requestRefund(payload);
export const getWalletBalance = async (customerId?: number | string) => (customerId != null ? storefrontApi.getWalletBalance(Number(customerId)).catch(() => 0) : 0);
export const getWalletHistory = async (customerId?: number | string) => (customerId != null ? storefrontApi.getWalletHistory(Number(customerId)).catch(() => []) : []);
export const submitDeliveryRating = async (orderNumber: string, ratingData: any) => storefrontApi.submitDeliveryRating(orderNumber, ratingData);
export const getDeliveryRatingStatus = async (orderNumber: string) => storefrontApi.getDeliveryRatingStatus(orderNumber);
export const submitProductRating = async (payload: { productId: number; rating: number; comment?: string; review?: string; buyerId?: number }) => {
  return storefrontApi.submitProductRating(payload);
};
export const getProductRatings = async (productId: number) => storefrontApi.getProductRatings(productId).catch(() => []);
