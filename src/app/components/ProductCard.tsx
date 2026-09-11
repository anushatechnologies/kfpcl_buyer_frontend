import { useRef, useState } from "react";
import { FileText, ImageOff, MessageCircle, Phone, Star, Store } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { APP_COPY } from "../lib/config";
import { formatCurrency, getProductHref } from "../lib/storefrontUtils";
import { useCallModalStore } from "../store/callModalStore";
import type { Product } from "../types/storefront";

interface ProductCardProps {
  product: Product;
}


export function ProductCard({ product }: ProductCardProps) {
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const [primaryLoaded, setPrimaryLoaded] = useState(false);
  const [primaryError, setPrimaryError] = useState(false);

  const sellingPrice = product.primaryVariant ? product.primaryVariant.discountPrice || product.primaryVariant.price : product.minPrice;
  const originalPrice = product.primaryVariant?.price || product.maxPrice || sellingPrice;
  const gallery = product.images?.length
    ? product.images.map((img) => (typeof img === "string" ? img : img.imageUrl)).filter(Boolean)
    : [product.imageUrl].filter(Boolean);
  const primaryImage = gallery[0] || product.imageUrl;
  const secondaryImage = gallery[1] || primaryImage;
  const hasHoverImage = Boolean(gallery[1] && gallery[1] !== gallery[0]);
  const supportPhone = APP_COPY.phonePrimary.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${supportPhone}?text=${encodeURIComponent(`Hello, I would like to know more about ${product.name}.`)}`;
  const openCallModal = useCallModalStore((state) => state.openCallModal);

  return (
    <motion.article
      layout
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group flex h-full flex-col overflow-hidden bg-white transition-all duration-300 relative rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs sm:shadow-sm hover:shadow-md p-2.5 sm:p-4"
    >
      {/* Premium Clean White Image Container */}
      <div className="relative block overflow-hidden rounded-lg sm:rounded-xl bg-gray-50/50 aspect-square w-full border border-gray-100/50">
        <Link to={getProductHref(product)} className="relative flex h-full w-full items-center justify-center p-2 sm:p-3">
          <div
            ref={imageFrameRef}
            className="relative h-full w-full flex items-center justify-center"
          >
            {/* Shimmer skeleton while image loads */}
            {!primaryLoaded && !primaryError && (
              <div className="absolute inset-0 overflow-hidden rounded-lg sm:rounded-xl">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#E2EAE7] via-[#EFF5F3] to-[#E2EAE7]"
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.6s infinite linear",
                  }}
                />
              </div>
            )}

            {/* Fallback for broken images */}
            {primaryError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#A5BDB5]">
                <ImageOff className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-[9px] sm:text-[10px] font-medium text-[#7C9A90]">No image</span>
              </div>
            )}

            {!primaryError && (
              <img
                src={primaryImage}
                alt={product.name}
                loading="lazy"
                decoding="async"
                onLoad={() => setPrimaryLoaded(true)}
                onError={() => { setPrimaryError(true); setPrimaryLoaded(true); }}
                className={`h-full w-full object-contain mix-blend-multiply transition-all duration-500 group-hover:scale-[1.05] ${
                  primaryLoaded ? "opacity-100" : "opacity-0"
                } ${hasHoverImage ? "group-hover:opacity-0" : ""}`}
              />
            )}

            {hasHoverImage && !primaryError ? (
              <img
                src={secondaryImage}
                alt={`${product.name} alternate`}
                loading="lazy"
                decoding="async"
                className="absolute inset-2 sm:inset-4 h-[calc(100%-1rem)] sm:h-[calc(100%-2rem)] w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] scale-[1.02] object-contain mix-blend-multiply opacity-0 transition duration-500 group-hover:scale-100 group-hover:opacity-100"
              />
            ) : null}
          </div>
        </Link>

        {/* Champagne Gold Discount Tag */}
        {product.discountPercent > 0 && (
          <div className="absolute left-1.5 top-1.5 sm:left-2.5 sm:top-2.5 pointer-events-none z-10">
            <span className="rounded bg-[#D4A853] text-[#0A4D3C] px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
              {product.discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Gold Rating Star Tag */}
        <div className="absolute right-1.5 top-1.5 sm:right-2.5 sm:top-2.5 pointer-events-none z-10">
          <div className="inline-flex items-center gap-0.5 rounded bg-white/95 backdrop-blur-sm px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-[#0A4D3C] shadow-xs">
            <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-[#D4A853] text-[#D4A853]" />
            4.8
          </div>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="flex flex-1 flex-col pt-2 sm:pt-3">
        {/* Pack Size */}
        <div className="text-[10px] sm:text-[11px] font-medium text-[#78889E] leading-none mb-1 truncate">
          {product.primaryVariant?.name || "Premium pack"}
        </div>

        {/* Product Name */}
        <Link to={getProductHref(product)} className="block mb-2 sm:mb-3">
          <h3 className="line-clamp-2 min-h-[2.1rem] sm:min-h-[2.5rem] font-sans text-xs sm:text-[13.5px] font-extrabold tracking-tight leading-tight sm:leading-snug text-[#0A1628] hover:text-[#0A4D3C] transition-colors">
            {product.name}
          </h3>
        </Link>
        {(product.store?.name || product.storeName) && (
          <div
            className="mb-2 inline-flex items-center gap-1 rounded-md border border-[#0A4D3C]/15 bg-[#F0FBF7] px-1.5 py-0.5 text-[9.5px] sm:text-[10px] font-semibold text-[#0A4D3C] max-w-full truncate"
            title={`Store: ${product.store?.name || product.storeName}`}
          >
            <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 text-[#0A4D3C]" />
            <span className="truncate">{product.store?.name || product.storeName}</span>
            {product.store?.city && (
              <span className="text-[8.5px] sm:text-[9px] text-[#6B7B94] font-normal flex-shrink-0">
                • {product.store.city}
              </span>
            )}
          </div>
        )}

        {/* Price and enquiry actions */}
        <div className="mt-auto pt-2 sm:pt-2.5 border-t border-gray-50">
          {/* Price & Savings */}
          <div className="flex flex-col min-h-[2.4rem] justify-end">
            {sellingPrice > 0 ? (
              <>
                {originalPrice > sellingPrice ? (
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#94A3B8] line-through leading-tight">
                    {formatCurrency(originalPrice)}
                  </span>
                ) : null}
                <span className="text-[#0A4D3C] text-[13px] sm:text-[15px] font-black leading-tight">
                  {formatCurrency(sellingPrice)}
                </span>
                {originalPrice > sellingPrice ? (
                  <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-[#D4A853] uppercase mt-0.5 tracking-wider leading-none truncate">
                    Save {formatCurrency(originalPrice - sellingPrice)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-[#0A4D3C] text-[11px] sm:text-[12px] font-bold leading-tight tracking-tight inline-flex items-center gap-1">
                Price on Request
              </span>
            )}
          </div>

          <div
            className="mt-2.5 sm:mt-3 grid grid-cols-3 gap-1 sm:gap-1.5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Link
              to={getProductHref(product)}
              className="inline-flex h-7 sm:h-8 items-center justify-center gap-0.5 sm:gap-1 rounded-lg bg-[#0A4D3C] px-1 sm:px-2 text-[8px] sm:text-[9px] font-black uppercase tracking-wide text-white transition-colors hover:bg-[#0E5E4A] min-w-0"
              aria-label={`Request an RFQ for ${product.name}`}
            >
              <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              <span className="truncate">RFQ</span>
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCallModal({
                  phoneNumber: "6309981444",
                  title: `Call for ${product.name}`,
                  subtitle: product.store?.name ? `Direct contact for ${product.name} (${product.store.name})` : `Direct contact for ${product.name}`,
                  productName: product.name,
                });
              }}
              className="inline-flex h-7 sm:h-8 items-center justify-center gap-0.5 sm:gap-1 rounded-lg border border-[#0A4D3C]/20 bg-[#F0FBF7] px-1 sm:px-2 text-[8px] sm:text-[9px] font-black uppercase tracking-wide text-[#0A4D3C] transition-colors hover:bg-[#0A4D3C]/10 cursor-pointer min-w-0"
              aria-label={`Call about ${product.name}`}
            >
              <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              <span className="truncate">Call</span>
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 sm:h-8 items-center justify-center gap-0.5 sm:gap-1 rounded-lg bg-[#25D366] px-1 sm:px-2 text-[8px] sm:text-[9px] font-black text-white transition-colors hover:bg-[#1FB957] min-w-0"
              aria-label={`Message about ${product.name} on WhatsApp`}
            >
              <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Chat</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
