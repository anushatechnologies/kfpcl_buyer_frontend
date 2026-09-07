import type { CartItem } from "../store/cartStore";
import type { FreeItemOffer, ServerCartItem } from "../types/storefront";

export interface FreeItemOfferPreview {
  offer: FreeItemOffer;
  matchingQuantity: number;
  qualifyingQuantity: number;
  freeQuantity: number;
  unlockedSets: number;
  unlockedFreeQuantity: number;
  missingQuantity: number;
  progressPercent: number;
}

export const buildFreeItemOfferPreview = (
  offer: FreeItemOffer,
  cart: CartItem[],
): FreeItemOfferPreview => {
  const qualifyingQuantity = Math.max(offer.qualifyingQuantity || 1, 1);
  const freeQuantity = Math.max(offer.freeQuantity || 1, 1);
  const matchingQuantity = offer.qualifyingByProduct
    ? cart.reduce(
        (total, item) =>
          total + (offer.qualifyingProductId && item.productId === offer.qualifyingProductId ? item.quantity : 0),
        0,
      )
    : cart.reduce(
        (total, item) =>
          total + (offer.qualifyingVariantId && item.variantId === offer.qualifyingVariantId ? item.quantity : 0),
        0,
      );

  const unlockedSets = Math.floor(matchingQuantity / qualifyingQuantity);
  const unlockedFreeQuantity = unlockedSets * freeQuantity;
  const remainder = matchingQuantity % qualifyingQuantity;
  const missingQuantity =
    matchingQuantity >= qualifyingQuantity
      ? remainder === 0
        ? 0
        : qualifyingQuantity - remainder
      : qualifyingQuantity - matchingQuantity;
  const progressPercent =
    qualifyingQuantity > 0 ? Math.min(100, (Math.min(matchingQuantity, qualifyingQuantity) / qualifyingQuantity) * 100) : 0;

  return {
    offer,
    matchingQuantity,
    qualifyingQuantity,
    freeQuantity,
    unlockedSets,
    unlockedFreeQuantity,
    missingQuantity,
    progressPercent,
  };
};

export const getOfferLabel = (offer: FreeItemOffer, type: "qualifying" | "free") => {
  if (type === "qualifying") {
    return offer.qualifyingVariantName || offer.qualifyingProductName || "selected items";
  }

  return offer.freeVariantName || offer.freeProductName || "bonus item";
};

export const buildUnlockedFreeItems = (
  offers: FreeItemOffer[],
  cart: CartItem[],
): ServerCartItem[] =>
  offers
    .map((offer) => buildFreeItemOfferPreview(offer, cart))
    .filter((preview) => preview.unlockedFreeQuantity > 0)
    .map((preview) => ({
      variantId: Number(preview.offer.freeVariantId || preview.offer.qualifyingVariantId || preview.offer.id),
      variantName: preview.offer.freeVariantName || preview.offer.freeProductName || "Bonus item",
      productId: Number(preview.offer.freeProductId || preview.offer.qualifyingProductId || preview.offer.id),
      productName: preview.offer.freeProductName || preview.offer.freeVariantName || "Bonus item",
      productImage: preview.offer.freeProductImage || preview.offer.qualifyingProductImage || "",
      quantity: preview.unlockedFreeQuantity,
      unitPrice: 0,
      totalPrice: 0,
      freeItem: true,
      offerName:
        preview.offer.name ||
        `Buy ${preview.qualifyingQuantity} get ${preview.freeQuantity} free`,
    }));
