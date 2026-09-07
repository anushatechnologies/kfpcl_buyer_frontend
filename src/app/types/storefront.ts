export interface Banner {
  id: number;
  name: string;
  imageUrl: string;
  videoUrl?: string | null;
  targetUrl?: string | null;
  targetApp?: string | null;
  actionType?: string | null;
  actionValue?: string | null;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  discount?: number;
  imageUrl: string;
  videoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubCategory {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  discount?: number;
  categoryId?: number;
  categoryName?: string;
  imageUrl: string;
  videoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Store {
  id: number;
  name: string;
  label?: string;
  displayOrder?: number;
  active?: boolean;
  imageUrl: string;
  address?: string;
  city?: string;
  pincode?: string;
  phoneNumber?: string;
  priceRange?: string;
  timings?: string;
  announcement?: string;
  delivery?: string;
  packageCost?: string;
  rating?: number;
  preferredOrder?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Variant {
  id: number;
  name: string;
  sku?: string;
  price: number;
  discountPrice?: number | null;
  stock?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  isTrending?: boolean;
  bestSeller?: boolean;
  displayOrder?: number;
  imageUrl: string;
  videoUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string;
  subCategoryId?: number | null;
  subCategoryName?: string;
  storeId?: number | null;
  storeName?: string;
  hsnCode?: string;
  gstRate?: number;
  images: Array<string | { id?: number; imageUrl: string; displayOrder?: number; createdAt?: string }>;
  variants: Variant[];
  minPrice: number;
  maxPrice: number;
  primaryVariant: Variant | null;
  discountPercent: number;
  hasDiscount: boolean;
  store?: Store;

  isInStock: boolean;
}

export interface ProductSuggestion {
  id: number;
  name: string;
  imageUrl: string;
  categoryName?: string;
  subCategoryName?: string;
  variantName?: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  isInStock: boolean;
}

export interface CheckoutSettings {
  id?: number;
  deliveryCharge: number;
  platformFee: number;
  handlingCharge: number;
  smallCartFee: number;
  smallCartThreshold: number;
  onlinePaymentEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  updatedAt?: string;
}

export interface CheckoutFeeBreakdown {
  deliveryCharge: number;
  platformFee: number;
  handlingCharge: number;
  smallCartFee: number;
  couponDiscount: number;
  total: number;
  freeDeliveryThreshold: number;
  remainingForFreeDelivery: number;
}

export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discountType?: CouponDiscountType | string;
  discountValue: number;
  minCartValue?: number;
  maxDiscountAmount?: number | null;
  startDate?: string;
  expiryDate?: string;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  firstTimeUserOnly?: boolean;
  isActive?: boolean;
}

export interface FreeItemOffer {
  id: number;
  name: string;
  description?: string;
  qualifyingVariantId?: number | null;
  qualifyingProductId?: number | null;
  qualifyingProductName?: string;
  qualifyingProductImage?: string;
  qualifyingVariantName?: string;
  qualifyingVariantSku?: string;
  qualifyingQuantity: number;
  qualifyingByProduct?: boolean;
  freeVariantId?: number | null;
  freeProductId?: number | null;
  freeProductName?: string;
  freeProductImage?: string;
  freeVariantName?: string;
  freeVariantSku?: string;
  freeQuantity: number;
  startDate?: string;
  expiryDate?: string;
  active?: boolean;
}

export interface AppliedCoupon {
  success: boolean;
  code: string;
  discount: number;
  finalValue: number;
}

export interface CustomerSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  customerId: number;
  phoneNumber: string;
  name?: string;
  email?: string;
  walletBalance?: number;
  roles?: string | null;
}

export interface CustomerProfile {
  id: number;
  name?: string;
  phoneNumber: string;
  email?: string;
  walletBalance?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: number;
  addressType?: string;
  flatNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
  contactName?: string;
  contactPhone?: string;
}

export interface AddressPayload {
  addressType?: string;
  flatNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderStoreGroup {
  storeId?: number;
  storeName: string;
  status?: string;
  subtotal?: number;
  items: Array<{
    id?: number;
    productId: number;
    variantId: number;
    productName: string;
    variantName?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    hsnCode?: string;
    gstRate?: number;
    taxableAmount?: number;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalTaxAmount?: number;
    imageUrl?: string;
    storeName?: string;
    freeItem?: boolean;
    offerName?: string;
  }>;
}

export interface ServerCartItem {
  id?: number;
  variantId: number;
  variantName?: string;
  productId: number;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  freeItem?: boolean;
  offerName?: string;
}

export interface ServerCart {
  cartId?: number;
  items: ServerCartItem[];
  freeItems?: ServerCartItem[];
  subtotal: number;
  estimatedDeliveryCharge?: number;
  deliveryCharge?: number;
  platformFee?: number;
  grandTotal: number;
}

export interface PlacedOrder {
  id: number;
  orderId?: number;
  orderNumber: string;
  subtotal: number;
  deliveryCharge?: number;
  platformFee?: number;
  handlingCharge?: number;
  smallCartFee?: number;
  walletApplied?: number;
  paidAmount?: number;
  tax?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  discount?: number;
  grandTotal: number;
  paymentMethod: string;
  orderStatus?: string;
  status?: string;
  paymentStatus?: string;
  refundStatus?: string;
  placedAt?: string;
  createdAt?: string;
  estimatedDeliveryTime?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  sellerName?: string;
  sellerGstin?: string;
  sellerAddress?: string;
  sellerState?: string;
  sellerStateCode?: string;
  placeOfSupply?: string;
  placeOfSupplyCode?: string;
  reverseCharge?: boolean;
  address?: {
    id: number;
    addressType?: string;
    flatNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  storeGroups?: OrderStoreGroup[];
  items: Array<{
    id?: number;
    productId: number;
    variantId: number;
    productName: string;
    variantName?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    hsnCode?: string;
    gstRate?: number;
    taxableAmount?: number;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalTaxAmount?: number;
    imageUrl?: string;
    storeName?: string;
    freeItem?: boolean;
    offerName?: string;
  }>;
}

export interface OrderTracking {
  orderNumber: string;
  status: string;
  message?: string;
  isLive: boolean;
  updatedAt?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface PolicyContent {
  id?: number;
  type?: string;
  content: string;
  updatedAt?: string;
}

export interface CurrentLocation {
  shortLabel: string;
  fullLabel: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  source: "default" | "device";
  permission: "prompt" | "granted" | "denied" | "unsupported" | "error";
}

export type PaymentMethod = "COD" | "ONLINE" | "WALLET" | "COD_WALLET" | "ONLINE_WALLET";
export type ProductSort =
  | "relevance"
  | "featured"
  | "price-asc"
  | "price-desc"
  | "discount"
  | "name"
  | "newest";
