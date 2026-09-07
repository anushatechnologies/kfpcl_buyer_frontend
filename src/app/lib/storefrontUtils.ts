import type { Category, CheckoutFeeBreakdown, CheckoutSettings, Product, ProductSort, Variant } from "../types/storefront";
import { API_ORIGIN } from "./config";

export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const compactNumberFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatCurrency = (value?: number | null) => currencyFormatter.format(Number(value || 0));

export const formatCompactNumber = (value?: number | null) =>
  compactNumberFormatter.format(Number(value || 0));

export const normalizeMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\.?\//, "")}`;
};

export const withCountryCode = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  return `+91${normalized}`;
};

export const formatPhoneForDisplay = (phone?: string) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

export const formatPaymentMethodLabel = (paymentMethod?: string) => {
  switch ((paymentMethod || "").toUpperCase()) {
    case "COD":
      return "Cash on delivery";
    case "ONLINE":
      return "Online payment";
    case "WALLET":
      return "Wallet";
    case "COD_WALLET":
      return "Wallet + cash on delivery";
    case "ONLINE_WALLET":
      return "Wallet + online payment";
    default:
      return paymentMethod || "Payment";
  }
};

export const getVariantPrice = (variant?: Partial<Variant> | null) => {
  if (!variant) return 0;
  const fullPrice = Number(variant.price || 0);
  const discounted = Number(variant.discountPrice || 0);
  return discounted > 0 && discounted < fullPrice ? discounted : fullPrice;
};

export const getVariantOriginalPrice = (variant?: Partial<Variant> | null) =>
  Number(variant?.price || 0);

export const calculateDiscountPercent = (original: number, selling: number) => {
  if (!original || selling >= original) return 0;
  return Math.round(((original - selling) / original) * 100);
};

export const calculateCheckoutFeeBreakdown = (
  subtotal: number,
  settings: Pick<
    CheckoutSettings,
    "deliveryCharge" | "platformFee" | "handlingCharge" | "smallCartFee" | "smallCartThreshold"
  >,
  couponDiscount = 0,
): CheckoutFeeBreakdown => {
  const freeDeliveryThreshold = Number(settings.smallCartThreshold || 0);
  const hasSubtotal = subtotal > 0;
  const isBelowThreshold = hasSubtotal && freeDeliveryThreshold > 0 && subtotal < freeDeliveryThreshold;
  const clampedCouponDiscount = Math.min(Math.max(couponDiscount, 0), subtotal);
  const deliveryCharge = isBelowThreshold ? Number(settings.deliveryCharge || 0) : 0;
  const platformFee = hasSubtotal ? Number(settings.platformFee || 0) : 0;
  const handlingCharge = hasSubtotal ? Number(settings.handlingCharge || 0) : 0;
  const smallCartFee = isBelowThreshold ? Number(settings.smallCartFee || 0) : 0;
  const remainingForFreeDelivery = isBelowThreshold ? freeDeliveryThreshold - subtotal : 0;

  return {
    deliveryCharge,
    platformFee,
    handlingCharge,
    smallCartFee,
    couponDiscount: clampedCouponDiscount,
    total: Math.max(0, subtotal + deliveryCharge + platformFee + handlingCharge + smallCartFee - clampedCouponDiscount),
    freeDeliveryThreshold,
    remainingForFreeDelivery,
  };
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const createCategorySlug = (category: Pick<Category, "id" | "name">) =>
  `${category.id}-${slugify(category.name)}`;

export const getCategoryHref = (category: Pick<Category, "id" | "name">) =>
  `/category/${createCategorySlug(category)}`;

export const createProductSlug = (product: Pick<Product, "id" | "name">) =>
  `${product.id}-${slugify(product.name)}`;

export const getProductHref = (product: Pick<Product, "id" | "name">) =>
  `/product/${createProductSlug(product)}`;

export const parseProductId = (value?: string) => {
  if (!value) return NaN;
  const match = value.match(/^(\d+)/);
  return match ? Number(match[1]) : Number(value);
};

export const sortProducts = (products: Product[], sortBy: ProductSort) => {
  const items = [...products];

  switch (sortBy) {
    case "relevance":
      return items;
    case "price-asc":
      return items.sort((a, b) => a.minPrice - b.minPrice);
    case "price-desc":
      return items.sort((a, b) => b.minPrice - a.minPrice);
    case "discount":
      return items.sort((a, b) => b.discountPercent - a.discountPercent);
    case "name":
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return items.sort((a, b) => (b.displayOrder || 0) - (a.displayOrder || 0));
    case "featured":
    default:
      return items.sort((a, b) => {
        const scoreA = Number(Boolean(a.isTrending)) * 4 + Number(Boolean(a.bestSeller)) * 3 + (a.displayOrder || 0) * -0.01;
        const scoreB = Number(Boolean(b.isTrending)) * 4 + Number(Boolean(b.bestSeller)) * 3 + (b.displayOrder || 0) * -0.01;
        return scoreB - scoreA;
      });
  }
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
