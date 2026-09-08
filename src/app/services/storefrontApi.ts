import { API_BASE_URL } from "../lib/config";
import {
  calculateDiscountPercent,
  getVariantOriginalPrice,
  getVariantPrice,
  normalizeMediaUrl,
} from "../lib/storefrontUtils";
import { mapProductToSuggestion, mergeRankedProducts, mergeSuggestions, rankProductsForSearch } from "../lib/smartSearch";
import { readStoredSession } from "../lib/session";
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
  OrderStoreGroup,
  OrderTracking,
  PaymentMethod,
  PlacedOrder,
  PolicyContent,
  Product,
  ProductSuggestion,
  ServerCart,
  Store,
  SubCategory,
  Variant,
} from "../types/storefront";

type RequestOptions = Omit<RequestInit, "body"> & {
  auth?: boolean;
  body?: unknown;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT = 12000;
const SEARCH_CATALOG_TTL_MS = 5 * 60 * 1000;

let cachedSearchCatalogPromise: Promise<Product[]> | null = null;
let cachedSearchCatalogAt = 0;

const withTimeout = (promise: Promise<Response>, timeoutMs: number) =>
  new Promise<Response>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });

const parseErrorMessage = async (response: Response) => {
  const text = await response.text().catch(() => "");
  if (!text) return `Request failed with status ${response.status}`;

  try {
    const parsed = JSON.parse(text);
    return parsed?.message || parsed?.error || text;
  } catch {
    return text;
  }
};

const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { body, headers, timeoutMs = DEFAULT_TIMEOUT, auth = false, ...rest } = options;
  const requestHeaders = new Headers(headers || {});
  requestHeaders.set("Accept", "application/json");

  if (auth) {
    const accessToken = readStoredSession()?.accessToken;
    if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const runRequest = () =>
    withTimeout(
      fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        cache: rest.cache ?? "no-store",
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
      timeoutMs,
    );

  let response = await runRequest();

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

const firstPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }
  return 0;
};

const mapVariant = (variant: any): Variant => {
  const sellingPrice = firstPositiveNumber(
    variant?.discountPrice,
    variant?.price,
    variant?.numericPrice,
    variant?.indicativePrice,
    variant?.sellingPrice,
    variant?.unitPrice,
    variant?.rate,
    variant?.basePrice,
    variant?.mrp,
  );
  const listPrice = firstPositiveNumber(
    variant?.mrp,
    variant?.originalPrice,
    variant?.price,
    variant?.numericPrice,
    variant?.indicativePrice,
    sellingPrice,
  );
  const p = listPrice > sellingPrice ? listPrice : sellingPrice;
  const dp = listPrice > sellingPrice ? sellingPrice : null;

  return {
    id: Number(variant?.id || Date.now()),
    name: variant?.name || variant?.variantName || "Standard pack",
    sku: variant?.sku,
    price: p,
    discountPrice: dp,
    stock: Number(variant?.stock ?? variant?.stockQuantity ?? 50),
    isActive: variant?.isActive !== false && variant?.active !== false,
    displayOrder: Number(variant?.displayOrder || 0),
  };
};

const isExplicitlyFalse = (value: unknown) =>
  value === false || (typeof value === "string" && value.trim().toLowerCase() === "false");

const isExplicitlyTrue = (value: unknown) =>
  value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");

const HIDDEN_PRODUCT_STATUSES = new Set(["ARCHIVED", "DELETED", "DISABLED", "DRAFT", "INACTIVE", "PENDING", "REJECTED"]);

const isCustomerVisibleProduct = (product: any) => {
  const status = String(product?.status ?? product?.productStatus ?? "").trim().toUpperCase();

  return (
    Boolean(product) &&
    !isExplicitlyFalse(product?.isActive) &&
    !isExplicitlyFalse(product?.active) &&
    !isExplicitlyTrue(product?.deleted) &&
    !isExplicitlyTrue(product?.isDeleted) &&
    !product?.deletedAt &&
    !HIDDEN_PRODUCT_STATUSES.has(status)
  );
};

const mapProduct = (product: any): Product => {
  const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
  const orderedVariants = rawVariants.map(mapVariant).sort((a: Variant, b: Variant) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const basePrice = firstPositiveNumber(
    product?.discountPrice,
    product?.price,
    product?.numericPrice,
    product?.indicativePrice,
    product?.sellingPrice,
    product?.unitPrice,
    product?.basePrice,
    product?.rate,
    product?.pricePerUnit,
    product?.mrp,
    product?.priceTiers?.[0]?.price,
    rawVariants[0]?.discountPrice,
    rawVariants[0]?.price,
    rawVariants[0]?.numericPrice,
    rawVariants[0]?.indicativePrice,
    rawVariants[0]?.mrp,
  );
  const baseOriginalPrice = firstPositiveNumber(
    product?.mrp,
    product?.originalPrice,
    product?.price,
    product?.numericPrice,
    product?.indicativePrice,
    basePrice,
  );
  const baseStock = typeof product?.stockQuantity === "number" ? product.stockQuantity : typeof product?.stock === "number" ? product.stock : (product?.inStock !== false ? 50 : 0);

  const defaultVariant: Variant = {
    id: Number(product?.id || 1) * 100 + 1,
    name: product?.unit || "Standard pack",
    sku: product?.sku || `SKU-${product?.id || Date.now()}`,
    price: basePrice,
    discountPrice: baseOriginalPrice > basePrice ? basePrice : null,
    stock: baseStock,
    isActive: isCustomerVisibleProduct(product),
    displayOrder: 1,
  };

  const variants = orderedVariants.length > 0 ? orderedVariants : [defaultVariant];
  const primaryVariant = variants[0];
  const primaryPrice = getVariantPrice(primaryVariant) || basePrice;
  const originalPrice = getVariantOriginalPrice(primaryVariant) || baseOriginalPrice;

  const rawImageSource = Array.isArray(product?.images)
    ? product.images
    : Array.isArray(product?.galleryImages)
    ? product.galleryImages
    : [];
  const rawImages = rawImageSource.length > 0
    ? rawImageSource.map((item: any) => normalizeMediaUrl(item?.imageUrl || item)).filter(Boolean)
    : [];
  const heroImage = normalizeMediaUrl(product?.mainImageUrl || product?.imageUrl || product?.image || rawImages[0]) || "/images/products/placeholder.jpg";
  const gallery = [heroImage, ...rawImages].filter((value, index, array) => value && array.indexOf(value) === index);

  const catId = product?.categoryId != null ? Number(product.categoryId) : product?.category?.id != null ? Number(product.category.id) : null;
  const catName = product?.categoryName || product?.category?.name || (typeof product?.category === "string" ? product.category : "");

  const rawSubCategory = product?.subCategory ?? product?.subcategory;
  const subCatId = product?.subCategoryId != null ? Number(product.subCategoryId) : rawSubCategory?.id != null ? Number(rawSubCategory.id) : null;
  const subCatName = product?.subCategoryName || product?.subcategoryName || rawSubCategory?.name || (typeof rawSubCategory === "string" ? rawSubCategory : "");
  const rawStore = product?.store || product?.storeDetails || product?.storeInfo || product?.sellerStore || product?.seller?.store;
  const storeName = rawStore?.name || rawStore?.storeName || product?.storeName || product?.store_name || product?.seller?.companyName || product?.seller?.businessName || product?.seller?.name || product?.sellerCompany || "Karthikeya Farmer Producer Company Limited";
  const storeId = rawStore?.id ?? rawStore?.storeId ?? product?.storeId ?? product?.store_id ?? product?.seller?.id ?? 1;

  return {
    id: Number(product?.id || 0),
    name: product?.name || product?.productName || product?.title || "Untitled product",
    description: product?.description || "",
    isActive: isCustomerVisibleProduct(product),
    isTrending: Boolean(product?.isTrending || product?.trending),
    bestSeller: Boolean(product?.bestSeller || product?.bestseller),
    displayOrder: Number(product?.sortOrder || product?.displayOrder || 0),
    imageUrl: heroImage,
    videoUrl: product?.videoUrl || null,
    categoryId: catId,
    categoryName: catName,
    subCategoryId: subCatId,
    subCategoryName: subCatName,
    storeId: Number(storeId),
    storeName,
    hsnCode: product?.hsnCode || "",
    gstRate: Number(product?.gstRate || 0),
    images: gallery,
    variants,
    minPrice: firstPositiveNumber(product?.minPrice, primaryPrice),
    maxPrice: firstPositiveNumber(product?.maxPrice, primaryPrice),
    primaryVariant,
    discountPercent: calculateDiscountPercent(originalPrice, primaryPrice),
    hasDiscount: primaryPrice > 0 && originalPrice > primaryPrice,
    store: mapStore({
      ...rawStore,
      id: storeId,
      name: storeName,
      address: rawStore?.address || rawStore?.storeAddress || product?.storeAddress || product?.store_address || product?.seller?.address || product?.seller?.location || product?.sellerLocation,
      city: rawStore?.city || rawStore?.storeCity || product?.storeCity || product?.store_city || product?.seller?.city || product?.seller?.location,
      pincode: rawStore?.pincode || rawStore?.postalCode || rawStore?.storePincode || product?.storePincode || product?.store_pincode || product?.seller?.pincode,
      phoneNumber: rawStore?.phoneNumber || rawStore?.phone || rawStore?.storePhone || product?.storePhone || product?.store_phone || product?.seller?.phoneNumber || product?.seller?.phone || product?.sellerPhone,
      rating: rawStore?.rating ?? rawStore?.storeRating ?? product?.storeRating ?? product?.rating,
      timings: rawStore?.timings || rawStore?.openingHours || rawStore?.businessHours || product?.storeTimings,
      imageUrl: rawStore?.imageUrl || rawStore?.image || rawStore?.storeImage || product?.storeImage || product?.storeImageUrl || product?.store_image,
    }),
    isInStock: variants.some((variant: Variant) => Number(variant.stock || 0) > 0),
  };
};

const mapCategory = (category: any): Category => ({
  id: Number(category?.id || 0),
  name: category?.name || category?.title || "Category",
  description: category?.description || "",
  isActive: category?.isActive !== false && category?.active !== false,
  displayOrder: Number(category?.sortOrder || category?.displayOrder || 0),
  discount: Number(category?.discount || 0),
  imageUrl: normalizeMediaUrl(category?.imageUrl || category?.image) || "",
  videoUrl: category?.videoUrl || null,
  createdAt: category?.createdAt,
  updatedAt: category?.updatedAt,
});

const mapSubCategory = (subCategory: any): SubCategory => ({
  id: Number(subCategory?.id || 0),
  name: subCategory?.name || subCategory?.title || "Subcategory",
  description: subCategory?.description || "",
  isActive: subCategory?.isActive !== false && subCategory?.active !== false,
  displayOrder: Number(subCategory?.sortOrder || subCategory?.displayOrder || 0),
  discount: Number(subCategory?.discount || 0),
  categoryId: subCategory?.categoryId != null ? Number(subCategory.categoryId) : undefined,
  categoryName: subCategory?.categoryName || "",
  imageUrl: normalizeMediaUrl(subCategory?.imageUrl || subCategory?.image) || "",
  videoUrl: subCategory?.videoUrl || null,
  createdAt: subCategory?.createdAt,
  updatedAt: subCategory?.updatedAt,
});

const mapStore = (store: any): Store => ({
  id: Number(store?.id ?? store?.storeId ?? 0),
  name: store?.name || store?.storeName || store?.businessName || store?.companyName || store?.sellerCompany || "Store",
  label: store?.label || store?.storeLabel || "",
  displayOrder: Number(store?.displayOrder || 0),
  active: store?.active !== false && store?.isActive !== false,
  imageUrl: normalizeMediaUrl(store?.imageUrl || store?.image || store?.storeImage || store?.logo) || "",
  address: store?.address || store?.storeAddress || store?.addressLine1 || "",
  city: store?.city || store?.storeCity || "",
  pincode: store?.pincode || store?.postalCode || store?.zipCode || "",
  phoneNumber: store?.phoneNumber || store?.phone || store?.storePhone || store?.contactNumber || "",
  priceRange: store?.priceRange || "",
  timings: store?.timings || store?.openingHours || store?.businessHours || "",
  announcement: store?.announcement || "",
  delivery: store?.delivery || "",
  packageCost: store?.packageCost || "",
  rating: Number(store?.rating ?? store?.storeRating ?? 0),
  preferredOrder: Number(store?.preferredOrder || 0),
  latitude: store?.latitude != null ? Number(store.latitude) : undefined,
  longitude: store?.longitude != null ? Number(store.longitude) : undefined,
  createdAt: store?.createdAt,
  updatedAt: store?.updatedAt,
});

const mapCoupon = (coupon: any): Coupon => ({
  id: Number(coupon?.id),
  code: coupon?.code || "",
  description: coupon?.description || "",
  discountType: coupon?.discountType || "FIXED_AMOUNT",
  discountValue: Number(coupon?.discountValue || 0),
  minCartValue: Number(coupon?.minCartValue || 0),
  maxDiscountAmount: coupon?.maxDiscountAmount != null ? Number(coupon.maxDiscountAmount) : null,
  startDate: coupon?.startDate,
  expiryDate: coupon?.expiryDate,
  usageLimit: coupon?.usageLimit != null ? Number(coupon.usageLimit) : null,
  usageLimitPerUser: coupon?.usageLimitPerUser != null ? Number(coupon.usageLimitPerUser) : null,
  firstTimeUserOnly: Boolean(coupon?.firstTimeUserOnly),
  isActive: coupon?.isActive !== false,
});

const mapFreeItemOffer = (offer: any): FreeItemOffer => ({
  id: Number(offer?.id),
  name: offer?.name || "",
  description: offer?.description || "",
  qualifyingVariantId: offer?.qualifyingVariantId != null ? Number(offer.qualifyingVariantId) : null,
  qualifyingProductId: offer?.qualifyingProductId != null ? Number(offer.qualifyingProductId) : null,
  qualifyingProductName: offer?.qualifyingProductName || "",
  qualifyingProductImage: normalizeMediaUrl(offer?.qualifyingProductImage) || "",
  qualifyingVariantName: offer?.qualifyingVariantName || "",
  qualifyingVariantSku: offer?.qualifyingVariantSku || "",
  qualifyingQuantity: Number(offer?.qualifyingQuantity || 1),
  qualifyingByProduct: Boolean(offer?.qualifyingByProduct),
  freeVariantId: offer?.freeVariantId != null ? Number(offer.freeVariantId) : null,
  freeProductId: offer?.freeProductId != null ? Number(offer.freeProductId) : null,
  freeProductName: offer?.freeProductName || "",
  freeProductImage: normalizeMediaUrl(offer?.freeProductImage) || "",
  freeVariantName: offer?.freeVariantName || "",
  freeVariantSku: offer?.freeVariantSku || "",
  freeQuantity: Number(offer?.freeQuantity || 1),
  startDate: offer?.startDate,
  expiryDate: offer?.expiryDate,
  active: offer?.active !== false,
});

const mapSession = (payload: any): CustomerSession => {
  const expiresInSeconds = Number(payload?.expiresIn || 0);
  return {
    accessToken: payload?.accessToken || payload?.jwtToken,
    refreshToken: payload?.refreshToken,
    expiresAt: expiresInSeconds > 0 ? Date.now() + expiresInSeconds * 1000 : undefined,
    customerId: Number(payload?.customerId),
    phoneNumber: payload?.phoneNumber,
    name: payload?.name || "",
    email: payload?.email || "",
    walletBalance: payload?.walletBalance != null ? Number(payload.walletBalance) : undefined,
    roles: payload?.roles || null,
  };
};

const mapAddress = (address: any): Address => ({
  id: Number(address?.id),
  addressType: address?.addressType || "HOME",
  flatNumber: address?.flatNumber || "",
  addressLine1: address?.addressLine1 || "",
  addressLine2: address?.addressLine2 || "",
  landmark: address?.landmark || "",
  city: address?.city || "",
  state: address?.state || "",
  postalCode: address?.postalCode || "",
  latitude: Number(address?.latitude || 0),
  longitude: Number(address?.longitude || 0),
  isDefault: Boolean(address?.isDefault),
  contactName: address?.contactName || "",
  contactPhone: address?.contactPhone || "",
});

const mapOrderItem = (item: any) => ({
  id: item?.id != null ? Number(item.id) : undefined,
  productId: Number(item?.productId),
  variantId: Number(item?.variantId),
  productName: item?.productName || "",
  variantName: item?.variantName || "",
  sku: item?.sku || "",
  quantity: Number(item?.quantity || 0),
  unitPrice: Number(item?.unitPrice || 0),
  totalPrice: Number(item?.totalPrice || 0),
  hsnCode: item?.hsnCode || "",
  gstRate: Number(item?.gstRate || 0),
  taxableAmount: Number(item?.taxableAmount || 0),
  cgstRate: Number(item?.cgstRate || 0),
  sgstRate: Number(item?.sgstRate || 0),
  igstRate: Number(item?.igstRate || 0),
  cgstAmount: Number(item?.cgstAmount || 0),
  sgstAmount: Number(item?.sgstAmount || 0),
  igstAmount: Number(item?.igstAmount || 0),
  totalTaxAmount: Number(item?.totalTaxAmount || 0),
  imageUrl: normalizeMediaUrl(item?.imageUrl || item?.productImage || item?.image) || "",
  storeName: item?.storeName || "",
  freeItem: Boolean(item?.freeItem),
  offerName: item?.offerName || "",
});

const mapOrderStoreGroup = (group: any): OrderStoreGroup => ({
  storeId: group?.storeId != null ? Number(group.storeId) : undefined,
  storeName: group?.storeName || "Store",
  status: group?.status || "",
  subtotal: group?.subtotal != null ? Number(group.subtotal) : undefined,
  items: (group?.items || []).map(mapOrderItem),
});

const mapPlacedOrder = (data: any, fallbackPaymentMethod?: PaymentMethod): PlacedOrder => ({
  id: Number(data?.id || data?.orderId),
  orderId: data?.orderId != null ? Number(data.orderId) : undefined,
  orderNumber: data?.orderNumber || "",
  subtotal: Number(data?.subtotal || 0),
  deliveryCharge: Number(data?.deliveryCharge || 0),
  platformFee: Number(data?.platformFee || 0),
  handlingCharge: Number(data?.handlingCharge || 0),
  smallCartFee: Number(data?.smallCartFee || 0),
  walletApplied: Number(data?.walletApplied || 0),
  paidAmount: Number(data?.paidAmount || 0),
  tax: Number(data?.tax || 0),
  taxableAmount: Number(data?.taxableAmount || 0),
  cgstAmount: Number(data?.cgstAmount || 0),
  sgstAmount: Number(data?.sgstAmount || 0),
  igstAmount: Number(data?.igstAmount || 0),
  discount: Number(data?.discount || 0),
  grandTotal: Number(data?.grandTotal || 0),
  paymentMethod: data?.paymentMethod || fallbackPaymentMethod || "COD",
  orderStatus: data?.orderStatus || data?.status,
  status: data?.status || data?.orderStatus,
  paymentStatus: data?.paymentStatus || "",
  refundStatus: data?.refundStatus || "",
  placedAt: data?.placedAt,
  createdAt: data?.createdAt,
  estimatedDeliveryTime: data?.estimatedDeliveryTime,
  deliveryPersonName: data?.deliveryPersonName || "",
  deliveryPersonPhone: data?.deliveryPersonPhone || "",
  sellerName: data?.sellerName || "Karthikeya Farmer Producer Company Limited",
  sellerGstin: data?.sellerGstin || "36AIJPN3614J1Z4",
  sellerAddress: data?.sellerAddress || "",
  sellerState: data?.sellerState || "Telangana",
  sellerStateCode: data?.sellerStateCode || "36",
  placeOfSupply: data?.placeOfSupply || "",
  placeOfSupplyCode: data?.placeOfSupplyCode || "",
  reverseCharge: Boolean(data?.reverseCharge),
  address: data?.address,
  storeGroups: Array.isArray(data?.storeGroups) ? data.storeGroups.map(mapOrderStoreGroup) : [],
  items: (data?.items || []).map(mapOrderItem),
});

const mapTrackingResponse = (data: any): OrderTracking => ({
  orderNumber: data?.orderNumber || "",
  status: data?.status || "PENDING",
  message: data?.message || "",
  isLive: Boolean(data?.isLive),
  updatedAt: data?.updatedAt || data?.location?.updatedAt,
  deliveryPersonName: data?.deliveryPersonName || data?.riderName || "",
  deliveryPersonPhone: data?.deliveryPersonPhone || data?.riderPhone || "",
  lat:
    data?.lat != null
      ? Number(data.lat)
      : data?.location?.latitude != null
        ? Number(data.location.latitude)
        : data?.location?.lat != null
          ? Number(data.location.lat)
          : null,
  lng:
    data?.lng != null
      ? Number(data.lng)
      : data?.location?.longitude != null
        ? Number(data.location.longitude)
        : data?.location?.lng != null
          ? Number(data.location.lng)
          : null,
});

export const getBanners = async (): Promise<Banner[]> => {
  try {
    let list: any[] = [];

    // 1. Try Admin Banner API first (/api/admin/banners)
    try {
      const adminData = await apiRequest<any>("/api/admin/banners");
      const adminList = Array.isArray(adminData)
        ? adminData
        : Array.isArray((adminData as any)?.content)
        ? (adminData as any).content
        : Array.isArray((adminData as any)?.banners)
        ? (adminData as any).banners
        : Array.isArray((adminData as any)?.data)
        ? (adminData as any).data
        : [];
      if (adminList.length > 0) {
        list = adminList;
      }
    } catch {
      // Fall through to customer banners
    }

    // 2. Try Customer Banner API (/api/customer/banners) if admin endpoint had no banners
    if (list.length === 0) {
      try {
        const custData = await apiRequest<any>("/api/customer/banners");
        const custList = Array.isArray(custData)
          ? custData
          : Array.isArray((custData as any)?.content)
          ? (custData as any).content
          : Array.isArray((custData as any)?.banners)
          ? (custData as any).banners
          : Array.isArray((custData as any)?.data)
          ? (custData as any).data
          : [];
        if (custList.length > 0) {
          list = custList;
        }
      } catch {
        // Handled below
      }
    }

    return list
      .filter((banner) => banner?.isActive !== false && banner?.active !== false)
      .map(
        (banner, index): Banner => ({
          id: Number(banner?.id || index + 1),
          name: banner?.title || banner?.name || "Featured Banner",
          imageUrl: normalizeMediaUrl(banner?.imageUrl) || "",
          videoUrl: banner?.videoUrl || null,
          targetUrl: banner?.linkUrl || banner?.targetUrl || null,
          targetApp: banner?.targetApp || null,
          actionType: banner?.actionType || null,
          actionValue: banner?.actionValue ? String(banner.actionValue) : null,
          isActive: true,
          displayOrder: Number(banner?.sortOrder ?? banner?.displayOrder ?? index + 1),
          createdAt: banner?.createdAt || undefined,
        })
      )
      .filter((b) => Boolean(b.imageUrl || b.name))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  } catch (error) {
    console.warn("Failed to fetch banners from Admin API", error);
    return [];
  }
};

export const getCategories = async () => {
  try {
    let data = await apiRequest<any>("/api/buyer/categories");
    let list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
    if (list.length === 0) {
      try {
        const altData = await apiRequest<any>("/api/categories");
        const altList = Array.isArray(altData) ? altData : Array.isArray(altData?.content) ? altData.content : [];
        if (altList.length > 0) list = altList;
      } catch {}
    }
    if (list.length === 0) {
      try {
        const adminData = await apiRequest<any>("/api/admin/categories");
        const adminList = Array.isArray(adminData) ? adminData : Array.isArray(adminData?.content) ? adminData.content : [];
        if (adminList.length > 0) list = adminList;
      } catch {}
    }
    return list.map(mapCategory).filter((item) => item.isActive !== false);
  } catch (error) {
    console.warn("Failed to fetch categories", error);
    return [];
  }
};

export const getCategoryById = async (categoryId: number) => {
  try {
    const data = await apiRequest<any>(`/api/buyer/categories/${categoryId}`);
    if (data?.id || data?.data?.id) return mapCategory(data?.data || data);
    throw new Error('Not found');
  } catch {
    try {
      const data = await apiRequest<any>(`/api/categories/${categoryId}`);
      return mapCategory(data?.data || data);
    } catch {
      return null;
    }
  }
};

export const getSubcategories = async (categoryId?: number) => {
  try {
    const path = categoryId ? `/api/buyer/subcategories/${categoryId}` : "/api/buyer/categories";
    let data = await apiRequest<any>(path);
    let list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.subcategories) ? data.subcategories : Array.isArray(data?.data) ? data.data : [];
    
    if (list.length === 0) {
      try {
        const altPath = categoryId ? `/api/subcategories/${categoryId}` : `/api/subcategories`;
        const altData = await apiRequest<any>(altPath);
        const altList = Array.isArray(altData) ? altData : Array.isArray(altData?.content) ? altData.content : [];
        if (altList.length > 0) list = altList;
      } catch {}
    }

    if (list.length === 0 && categoryId) {
      try {
        const adminPath = `/api/admin/subcategories/${categoryId}`;
        const adminData = await apiRequest<any>(adminPath);
        const adminList = Array.isArray(adminData) ? adminData : Array.isArray(adminData?.content) ? adminData.content : [];
        if (adminList.length > 0) list = adminList;
      } catch {}
    }

    return list.map(mapSubCategory).filter((item) => item.isActive !== false);
  } catch (error) {
    console.warn("Failed to fetch subcategories", error);
    return [];
  }
};

export const getStores = async (query?: { name?: string; page?: number; size?: number }) => {
  const search = new URLSearchParams();
  if (query?.name) search.set("name", query.name);
  if (query?.page != null) search.set("page", String(query.page));
  if (query?.size != null) search.set("size", String(query.size));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  try {
    const data = await apiRequest<any>(`/api/stores${suffix}`);
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
    return list.map(mapStore);
  } catch {
    return [];
  }
};

const fetchProducts = async (query?: {
  storeId?: number;
  categoryId?: number;
  subCategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  trending?: boolean;
  keyword?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  params.set("page", String(query?.page || 1));
  params.set("limit", String(query?.limit || 50));

  if (query?.categoryId != null) params.set("categoryId", String(query.categoryId));
  if (query?.subCategoryId != null) params.set("subcategoryId", String(query.subCategoryId));
  if (query?.storeId != null) params.set("storeId", String(query.storeId));
  if (query?.minPrice != null) params.set("minPrice", String(query.minPrice));
  if (query?.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  if (query?.trending != null) params.set("trending", String(query.trending));
  if (query?.keyword) params.set("query", query.keyword);

  const isSearchOnly = Boolean(
    query?.keyword && !query?.categoryId && !query?.subCategoryId && !query?.storeId && !query?.minPrice && !query?.maxPrice,
  );
  const queryString = params.toString();
  const paths = [
    isSearchOnly
      ? `/api/buyer/products/search?query=${encodeURIComponent(query!.keyword!)}`
      : `/api/buyer/products?${queryString}`,
    `/api/products?${queryString}`,
    `/api/admin/products?${queryString}`,
  ];

  for (const path of paths) {
    try {
      const data = await apiRequest<any>(path);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.products)
              ? data.products
              : [];

      if (list.length > 0) {
        return list.map(mapProduct).filter((item) => item.isActive !== false);
      }
    } catch (error) {
      console.warn(`Failed to fetch ${path}`, error);
    }
  }

  return [];
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
}) => {
  return fetchProducts(query);
};

export const getTrendingProducts = async () => {
  try {
    const data = await apiRequest<any>("/api/buyer/products/trending");
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
    return list.map(mapProduct).filter((item) => item.isActive !== false);
  } catch {
    return [];
  }
};

export const getBestSellerProducts = async () => {
  try {
    const data = await apiRequest<any>("/api/buyer/products/bestseller");
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
    return list.map(mapProduct).filter((item) => item.isActive !== false);
  } catch {
    return [];
  }
};

export const getProductSuggestions = async (keyword: string): Promise<ProductSuggestion[]> => {
  const query = keyword.trim();
  if (!query) return [];

  try {
    const data = await apiRequest<any>(`/api/buyer/products/suggestions?query=${encodeURIComponent(query)}`);
    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === "string") {
        // The suggestions endpoint returns names only. Resolve each name to the
        // catalog product before creating a link so we never navigate with a
        // fabricated array index such as /product/1-product-name.
        const products = await fetchProducts({ keyword: query }).catch(() => []);
        const suggestions = (data as string[])
          .map((name) => {
            const normalizedName = name.trim().toLocaleLowerCase();
            const product =
              products.find((item) => item.name.trim().toLocaleLowerCase() === normalizedName) ||
              rankProductsForSearch(products, name, 1)[0];

            return product ? mapProductToSuggestion(product) : null;
          })
          .filter((item): item is ProductSuggestion => Boolean(item));

        if (suggestions.length > 0) return suggestions;
      }
      if (typeof data[0] !== "string") {
        return (data as any[])
          .filter(isCustomerVisibleProduct)
          .map((item) => mapProductToSuggestion(mapProduct(item)));
      }
    }
  } catch {}

  const products = await fetchProducts({ keyword: query }).catch(() => []);
  return rankProductsForSearch(products, query, 8).map(mapProductToSuggestion);
};

export const getProductById = async (productId: number | string) => {
  const paths = [
    `/api/buyer/products/${productId}`,
    `/api/products/${productId}`,
    `/api/admin/products/${productId}`,
  ];

  for (const path of paths) {
    try {
      const data = await apiRequest<any>(path);
      const rawProduct = data?.data || data;
      if (rawProduct && (rawProduct.id || rawProduct.productId || rawProduct.name || rawProduct.productName)) {
        const product = mapProduct(rawProduct);
        return product.isActive === false ? null : product;
      }
    } catch {
      // A deployment may expose only one of the buyer, catalog, or admin endpoints.
    }
  }

  return null;
};

export const getWishlist = async (buyerId: number | string = 1) => {
  try {
    const data = await apiRequest<any>(`/api/customer/products/wishlist?buyerId=${buyerId}`);
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
    return list.map(mapProduct).filter((item) => item.isActive !== false);
  } catch {
    return [];
  }
};

export const addToWishlist = async (productId: number | string, buyerId: number | string = 1) => {
  return apiRequest(`/api/customer/products/wishlist`, {
    method: "POST",
    body: { productId: Number(productId), buyerId: Number(buyerId) },
  });
};

export const removeFromWishlist = async (productId: number | string, buyerId: number | string = 1) => {
  return apiRequest(`/api/customer/products/wishlist?buyerId=${buyerId}&productId=${productId}`, {
    method: "DELETE",
  });
};

export const submitProductRating = async (payload: { productId: number; rating: number; review?: string; comment?: string; buyerId?: number }) => {
  return apiRequest(`/api/customer/products/rating`, {
    method: "POST",
    body: {
      productId: payload.productId,
      rating: payload.rating,
      review: payload.review || payload.comment || "",
      buyerId: payload.buyerId || 1,
    },
  });
};

export const contactSeller = async (payload: { productId: number; supplierId: string; contactType: "CALL" | "WHATSAPP"; buyerId?: number }) => {
  return apiRequest(`/api/buyer/contact-seller`, {
    method: "POST",
    body: {
      productId: payload.productId,
      supplierId: payload.supplierId,
      contactType: payload.contactType,
      buyerId: payload.buyerId || 1,
    },
  });
};

export const getCheckoutSettings = async () => {
  let settings: any = {};
  try {
    const data = await apiRequest<any>("/api/admin/checkout-settings");
    settings = data?.settings || data?.data || data || {};
  } catch {
    try {
      const data = await apiRequest<any>("/checkout-settings");
      settings = data?.settings || data || {};
    } catch {}
  }
  return {
    id: settings?.id != null ? Number(settings.id) : undefined,
    deliveryCharge: Number(settings?.deliveryCharge || 0),
    platformFee: Number(settings?.platformFee || 0),
    handlingCharge: Number(settings?.handlingCharge || 0),
    smallCartFee: Number(settings?.smallCartFee || 0),
    smallCartThreshold: Number(settings?.smallCartThreshold || 0),
    onlinePaymentEnabled: Boolean(settings?.onlinePaymentEnabled),
    cashOnDeliveryEnabled: settings?.cashOnDeliveryEnabled !== false,
    updatedAt: settings?.updatedAt,
  } satisfies CheckoutSettings;
};

export const getActiveCoupons = async () => {
  const data = await apiRequest<any[]>("/api/coupons/active").catch(() => apiRequest<any[]>("/coupons/active"));
  return (data || []).map(mapCoupon).filter((coupon) => coupon.isActive !== false);
};

export const getActiveFreeItemOffers = async () => {
  const data = await apiRequest<any[]>("/api/free-item-offers/active").catch(() => apiRequest<any[]>("/free-item-offers/active"));
  return (data || []).map(mapFreeItemOffer).filter((offer) => offer.active !== false);
};

export const applyCoupon = async (payload: { code: string; customerId: number; cartValue: number }) => {
  const params = new URLSearchParams({
    code: payload.code.trim().toUpperCase(),
    customerId: String(payload.customerId),
    cartValue: String(payload.cartValue),
  });

  const data = await apiRequest<any>(`/api/coupons/apply?${params.toString()}`, {
    auth: true,
  }).catch(() => apiRequest<any>(`/coupons/apply?${params.toString()}`, { auth: true }));

  return {
    success: data?.success !== false,
    code: data?.code || payload.code.trim().toUpperCase(),
    discount: Number(data?.discount || 0),
    finalValue: Number(data?.finalValue || 0),
  } satisfies AppliedCoupon;
};

export const getPolicy = async (type: string) => {
  const data = await apiRequest<{ policy?: any; content?: string }>(`/api/policies/${type}`).catch(async () => {
    return apiRequest<{ policy?: any; content?: string }>(`/policies/${type}`);
  });
  return {
    id: data?.policy?.id != null ? Number(data.policy.id) : undefined,
    type: data?.policy?.type || type,
    content: data?.content || data?.policy?.content || (typeof data === "string" ? data : ""),
    updatedAt: data?.policy?.updatedAt,
  } satisfies PolicyContent;
};

export const getCustomerProfile = async () => {
  const session = readStoredSession();
  if (session?.accessToken?.startsWith("demo-")) {
    return {
      id: Number(session.customerId || 1),
      name: session.name || "",
      phoneNumber: session.phoneNumber || "",
      email: session.email || "",
      walletBalance: session.walletBalance != null ? Number(session.walletBalance) : 0,
      isActive: true,
    } satisfies CustomerProfile;
  }

  const data = await apiRequest<any>("/api/customer/profile", {
    auth: true,
  }).catch(async () => {
    return apiRequest<any>("/customer/profile", { auth: true });
  });

  return {
    id: Number(data?.id),
    name: data?.fullName || data?.name || "",
    phoneNumber: data?.phoneNumber || data?.phone || "",
    email: data?.email || "",
    walletBalance: data?.walletBalance != null ? Number(data.walletBalance) : undefined,
    isActive: data?.isActive !== false,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  } satisfies CustomerProfile;
};

export const updateCustomerProfile = async (payload: { name?: string; email?: string; fullName?: string; companyName?: string; businessType?: string; state?: string; city?: string }) => {
  const body = {
    ...payload,
    fullName: payload.fullName || payload.name,
  };
  const data = await apiRequest<any>("/api/customer/profile", {
    auth: true,
    method: "PUT",
    body,
  }).catch(async () => {
    return apiRequest<any>("/customer/profile", { auth: true, method: "PUT", body });
  });

  return {
    id: Number(data?.id),
    name: data?.fullName || data?.name || "",
    phoneNumber: data?.phoneNumber || data?.phone || "",
    email: data?.email || "",
    walletBalance: data?.walletBalance != null ? Number(data.walletBalance) : undefined,
    isActive: data?.isActive !== false,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  } satisfies CustomerProfile;
};

export const getAddresses = async () => {
  const data = await apiRequest<any[]>("/api/addresses", {
    auth: true,
  }).catch(async () => {
    return apiRequest<any[]>("/addresses", { auth: true });
  });
  return (data || []).map(mapAddress);
};

export const saveAddress = async (payload: AddressPayload, addressId?: number) => {
  const path = addressId != null ? `/api/addresses/${addressId}` : "/api/addresses";
  const fallbackPath = addressId != null ? `/addresses/${addressId}` : "/addresses";
  const method = addressId != null ? "PUT" : "POST";
  const data = await apiRequest<any>(path, {
    auth: true,
    method,
    body: payload,
  }).catch(async () => {
    return apiRequest<any>(fallbackPath, { auth: true, method, body: payload });
  });

  return mapAddress({
    ...payload,
    ...data,
    latitude: data?.latitude ?? payload.latitude,
    longitude: data?.longitude ?? payload.longitude,
  });
};

export const deleteAddress = async (addressId: number) => {
  await apiRequest(`/api/addresses/${addressId}`, {
    auth: true,
    method: "DELETE",
  }).catch(async () => {
    return apiRequest(`/addresses/${addressId}`, { auth: true, method: "DELETE" });
  });
};

export const syncCartToServer = async (items: Array<{ variantId: number; quantity: number }>) => {
  if (!items.length) {
    return {
      items: [],
      subtotal: 0,
      deliveryCharge: 0,
      platformFee: 0,
      grandTotal: 0,
    } satisfies ServerCart;
  }

  try {
    await apiRequest("/cart", {
      auth: true,
      method: "DELETE",
    });
  } catch {
    // Ignore stale cart clear failures.
  }

  const data = await apiRequest<any>("/cart/merge", {
    auth: true,
    method: "POST",
    body: items.map((item) => ({
      variantId: Number(item.variantId),
      quantity: Number(item.quantity),
    })),
  });

  return {
    cartId: data?.cartId != null ? Number(data.cartId) : undefined,
    items: (data?.items || []).map((item: any) => ({
      id: item?.id != null ? Number(item.id) : undefined,
      variantId: Number(item?.variantId),
      variantName: item?.variantName || "",
      productId: Number(item?.productId),
      productName: item?.productName || "",
      productImage: normalizeMediaUrl(item?.productImage) || "",
      quantity: Number(item?.quantity || 0),
      unitPrice: Number(item?.unitPrice || 0),
      totalPrice: Number(item?.totalPrice || 0),
      freeItem: Boolean(item?.freeItem),
      offerName: item?.offerName || "",
    })),
    freeItems: (data?.freeItems || []).map((item: any) => ({
      variantId: Number(item?.variantId),
      variantName: item?.variantName || "",
      productId: Number(item?.productId),
      productName: item?.productName || "",
      productImage: normalizeMediaUrl(item?.productImage) || "",
      quantity: Number(item?.quantity || 0),
      unitPrice: Number(item?.unitPrice || 0),
      totalPrice: Number(item?.totalPrice || 0),
      freeItem: Boolean(item?.freeItem),
      offerName: item?.offerName || "",
    })),
    subtotal: Number(data?.subtotal || 0),
    estimatedDeliveryCharge: Number(data?.estimatedDeliveryCharge || 0),
    deliveryCharge: Number(data?.deliveryCharge || 0),
    platformFee: Number(data?.platformFee || 0),
    grandTotal: Number(data?.grandTotal || 0),
  } satisfies ServerCart;
};

export const placeOrder = async (payload: {
  addressId: number;
  paymentMethod: PaymentMethod;
  walletAmount?: number;
  couponCode?: string;
}) => {
  let data: any;
  try {
    data = await apiRequest<any>("/api/buyer/orders", {
      auth: true,
      method: "POST",
      body: {
        addressId: Number(payload.addressId),
        paymentMethod: payload.paymentMethod,
        walletAmount: payload.walletAmount,
        couponCode: payload.couponCode,
      },
    });
  } catch {
    data = await apiRequest<any>("/api/orders", {
      auth: true,
      method: "POST",
      body: {
        addressId: Number(payload.addressId),
        paymentMethod: payload.paymentMethod,
        walletAmount: payload.walletAmount,
        couponCode: payload.couponCode,
      },
    });
  }

  return mapPlacedOrder(data?.data || data, payload.paymentMethod);
};

export const getOrders = async () => {
  let data: any;
  try {
    data = await apiRequest<any>("/api/buyer/orders", {
      auth: true,
    });
  } catch {
    data = await apiRequest<any>("/api/orders", {
      auth: true,
    });
  }

  const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
  return list.map((order: any) => mapPlacedOrder(order));
};

export const getOrderById = async (orderId: number) => {
  let data: any;
  try {
    data = await apiRequest<any>(`/api/buyer/orders/${orderId}`, {
      auth: true,
    });
  } catch {
    data = await apiRequest<any>(`/api/orders/${orderId}`, {
      auth: true,
    });
  }

  return mapPlacedOrder(data?.data || data);
};

export const getOrderTracking = async (orderNumber: string) => {
  let data: any;
  try {
    data = await apiRequest<any>(`/api/tracking/${encodeURIComponent(orderNumber)}`, {
      auth: true,
    });
  } catch {
    data = await apiRequest<any>(`/tracking/${encodeURIComponent(orderNumber)}`, {
      auth: true,
    });
  }

  return mapTrackingResponse(data);
};

export const initiateOnlinePayment = async (orderId: number) => {
  try {
    return await apiRequest<{
      razorpayOrderId: string;
      amount: number;
      currency: string;
      receipt: string;
      keyId: string;
    }>("/api/payment/initiate", {
      auth: true,
      method: "POST",
      body: {
        orderId,
      },
    });
  } catch {
    return await apiRequest<{
      razorpayOrderId: string;
      amount: number;
      currency: string;
      receipt: string;
      keyId: string;
    }>("/payment/initiate", {
      auth: true,
      method: "POST",
      body: {
        orderId,
      },
    });
  }
};

export const verifyOnlinePayment = async (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  receipt: string;
}) => {
  try {
    return await apiRequest<{ success: boolean; message?: string }>("/api/payment/verify", {
      auth: true,
      method: "POST",
      body: payload,
    });
  } catch {
    return await apiRequest<{ success: boolean; message?: string }>("/payment/verify", {
      auth: true,
      method: "POST",
      body: payload,
    });
  }
};

export const requestRefund = async (payload: { orderId: number; amount?: number; reason?: string }) => {
  try {
    return await apiRequest<{
      refundStatus?: string;
      refundId?: string;
      refundAmount?: number;
      refundReason?: string;
      message?: string;
    }>("/api/payment/refund/request", {
      auth: true,
      method: "POST",
      body: payload,
    });
  } catch {
    return await apiRequest<{
      refundStatus?: string;
      refundId?: string;
      refundAmount?: number;
      refundReason?: string;
      message?: string;
    }>("/payment/refund/request", {
      auth: true,
      method: "POST",
      body: payload,
    });
  }
};

export const getWalletBalance = async (customerId: number) => {
  const session = readStoredSession();
  if (session?.accessToken?.startsWith("demo-")) {
    return Number(session.walletBalance || 0);
  }

  let data: any;
  try {
    data = await apiRequest<{ success?: boolean; balance?: number | string }>(`/api/wallet/balance/${customerId}`, {
      auth: true,
    });
  } catch {
    data = await apiRequest<{ success?: boolean; balance?: number | string }>(`/wallet/balance/${customerId}`, {
      auth: true,
    });
  }
  return Number(data?.balance || 0);
};

export const getWalletHistory = async (customerId: number) => {
  let data: any;
  try {
    data = await apiRequest<{ success?: boolean; history?: any[] }>(`/api/wallet/history/${customerId}`, {
      auth: true,
    });
  } catch {
    data = await apiRequest<{ success?: boolean; history?: any[] }>(`/wallet/history/${customerId}`, {
      auth: true,
    });
  }
  return (data?.history || []).map((item) => ({
    id: item?.id != null ? Number(item.id) : undefined,
    amount: Number(item?.amount || 0),
    type: item?.type || item?.transactionType || "",
    description: item?.description || "",
    createdAt: item?.createdAt,
  }));
};

export const submitDeliveryRating = async (orderNumber: string, payload: { rating: number; feedback?: string }) => {
  try {
    return await apiRequest<{ success?: boolean; message?: string }>(`/api/orders/${encodeURIComponent(orderNumber)}/rate`, {
      auth: true,
      method: "POST",
      body: payload,
    });
  } catch {
    return await apiRequest<{ success?: boolean; message?: string }>(`/orders/${encodeURIComponent(orderNumber)}/rate`, {
      auth: true,
      method: "POST",
      body: payload,
    });
  }
};

export const getDeliveryRatingStatus = async (orderNumber: string) => {
  try {
    return await apiRequest<{
      orderNumber?: string;
      delivered?: boolean;
      alreadyRated?: boolean;
      rating?: number;
      feedback?: string;
      canRate?: boolean;
    }>(`/api/orders/${encodeURIComponent(orderNumber)}/rating`, {
      auth: true,
    });
  } catch {
    return await apiRequest<{
      orderNumber?: string;
      delivered?: boolean;
      alreadyRated?: boolean;
      rating?: number;
      feedback?: string;
      canRate?: boolean;
    }>(`/orders/${encodeURIComponent(orderNumber)}/rating`, {
      auth: true,
    });
  }
};

export const getProductRatings = async (productId: number) => {
  try {
    const data = await apiRequest<any>(`/api/admin/ratings`);
    const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
    return list
      .filter((item: any) => Number(item?.productId) === Number(productId))
      .map((item: any) => ({
        id: item?.id != null ? Number(item.id) : undefined,
        rating: Number(item?.rating || 0),
        comment: item?.comment || "",
        createdAt: item?.createdAt,
        customerName: item?.customerName || item?.customer?.name || "Customer",
      }));
  } catch {
    return [];
  }
};
