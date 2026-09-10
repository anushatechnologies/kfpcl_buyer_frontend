import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Gift,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  FileText,
  Send,
  User,
  X,
} from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { APP_COPY } from "../lib/config";
import { getDeliveryEtaText, getStockLabel, saveNotifyRequest } from "../lib/customerExperience";
import { useCallModalStore } from "../store/callModalStore";
import {
  formatCurrency,
  getCategoryHref,
  parseProductId,
} from "../lib/storefrontUtils";
import { getActiveFreeItemOffers, getProductById, getProductRatings, getProducts, submitProductRating } from "../data/storefrontData";
import { rfqApi } from "../../api/rfq.api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { readStoredSession } from "../lib/session";
import type { FreeItemOffer, Product as ProductType, Variant } from "../types/storefront";

export function Product() {
  const { slug } = useParams();
  const productId = parseProductId(slug);

  const [product, setProduct] = useState<ProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductType[]>([]);
  const [activeFreeItemOffers, setActiveFreeItemOffers] = useState<FreeItemOffer[]>([]);
  const [productRatings, setProductRatings] = useState<Array<{ id?: number; rating: number; comment?: string; customerName?: string; createdAt?: string }>>([]);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const session = useAuthStore((state) => state.session);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);

  // Enquiry / RFQ Submission state
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [rfqBuyerName, setRfqBuyerName] = useState(() => session?.name || "");
  const [rfqBuyerPhone, setRfqBuyerPhone] = useState(() => session?.phoneNumber || "");
  const [rfqQuantity, setRfqQuantity] = useState("");
  const [rfqDeliveryLocation, setRfqDeliveryLocation] = useState("");
  const [rfqSubject, setRfqSubject] = useState("");
  const [rfqNotes, setRfqNotes] = useState("");
  const [rfqFile, setRfqFile] = useState<File | null>(null);
  const [isRfqSubmitting, setIsRfqSubmitting] = useState(false);
  // Generate a stable enquiry ID per modal open
  const [enquiryId] = useState(() => `ENQ-${Date.now().toString(36).toUpperCase()}`);
  const enquiryDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Sync session name/phone when session changes or loads or RFQ modal opens
  useEffect(() => {
    if (session?.name && !rfqBuyerName) {
      setRfqBuyerName(session.name);
    }
    if (session?.phoneNumber && !rfqBuyerPhone) {
      setRfqBuyerPhone(session.phoneNumber);
    }
  }, [session]);

  useEffect(() => {
    if (isRfqModalOpen) {
      hydrateFromStorage();
      const current = readStoredSession();
      if (current?.name && !rfqBuyerName) {
        setRfqBuyerName(current.name);
      }
      if (current?.phoneNumber && !rfqBuyerPhone) {
        setRfqBuyerPhone(current.phoneNumber);
      }
    }
  }, [isRfqModalOpen, hydrateFromStorage]);

  // Prevent background scrolling when RFQ modal is active
  useEffect(() => {
    if (isRfqModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRfqModalOpen]);

  // Advanced States: Image zoom coordinates & active specifications tabs
  const [activeTab, setActiveTab] = useState<string>("ingredients");
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Smart Category detection for dynamic tab details
  const isPersonalCare = useMemo(() => {
    if (!product) return false;
    const cat = product.categoryName?.toLowerCase() || "";
    const name = product.name?.toLowerCase() || "";
    return (
      cat.includes("beauty") ||
      cat.includes("care") ||
      cat.includes("personal") ||
      name.includes("oil") ||
      name.includes("shampoo") ||
      name.includes("soap") ||
      name.includes("face")
    );
  }, [product]);

  // Dynamically splits descriptions by emoji bullets into structured list items
  const parsedDescription = useMemo(() => {
    const desc = product?.description || "";
    if (!desc) return [];
    
    // Split by emoji boundaries
    const parts = desc.split(/(?=\p{Emoji})/u);
    return parts.map(p => p.trim()).filter(Boolean);
  }, [product?.description]);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setIsLoading(false);
      setError("We could not find that product.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError("");

      getProductById(productId)
      .then(async (nextProduct) => {
        if (!isMounted) return;
        if (!nextProduct) {
          throw new Error("This product is unavailable or has not been approved for the storefront.");
        }
        setProduct(nextProduct);
        setSelectedVariantId(nextProduct.primaryVariant?.id || nextProduct.variants[0]?.id || null);
        setSelectedImageIndex(0);

        const related = await getProducts({
          categoryId: nextProduct.categoryId || undefined,
          subCategoryId: nextProduct.subCategoryId || undefined,
        });

        if (!isMounted) return;
        setRelatedProducts(related.filter((item) => item.id !== nextProduct.id).slice(0, 4));
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        setError(loadError?.message || "Unable to load the product details.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!Number.isFinite(productId)) return;
    let isMounted = true;
    getProductRatings(productId)
      .then((ratings) => {
        if (isMounted) {
          setProductRatings(ratings);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProductRatings([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(() => {
    let isMounted = true;

    getActiveFreeItemOffers()
      .then((offers) => {
        if (isMounted) {
          setActiveFreeItemOffers(offers);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveFreeItemOffers([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedVariant = useMemo<Variant | null>(() => {
    if (!product) return null;
    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ||
      product.primaryVariant ||
      product.variants[0] ||
      null
    );
  }, [product, selectedVariantId]);

  const quantityInCart = useCartStore((state) =>
    selectedVariant
      ? state.cart.find((item) => item.variantId === selectedVariant.id)?.quantity || 0
      : 0,
  );
  const gallery: string[] = (
    product?.images?.length
      ? product.images.map((img) => (typeof img === "string" ? img : img.imageUrl))
      : product?.imageUrl
      ? [product.imageUrl]
      : []
  ).filter(Boolean);
  const activeImage: string = gallery[selectedImageIndex] || product?.imageUrl || "";
  const sellingPrice = selectedVariant ? selectedVariant.discountPrice || selectedVariant.price : product?.minPrice || 0;
  const originalPrice = selectedVariant?.price || product?.maxPrice || sellingPrice;
  const selectedStock = Number(selectedVariant?.stock);
  const availableStock = Number.isFinite(selectedStock) ? Math.max(0, selectedStock) : undefined;
  const selectedVariantInStock = Boolean(selectedVariant) && (availableStock === undefined || availableStock > 0);
  const supportPhone = APP_COPY.phonePrimary.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${supportPhone}?text=${encodeURIComponent(`Hello, I would like to know more about ${product?.name || "this product"}.`)}`;
  const openCallModal = useCallModalStore((state) => state.openCallModal);
  
  const productOfferHighlights = useMemo(() => {
    if (!product) return [] as Array<{ offer: FreeItemOffer; type: "qualifying" | "free" }>;

    return activeFreeItemOffers
      .map((offer) => {
        const isQualifyingMatch = offer.qualifyingByProduct
          ? offer.qualifyingProductId === product.id
          : offer.qualifyingVariantId === selectedVariant?.id;
        const isFreeMatch = offer.freeVariantId === selectedVariant?.id || offer.freeProductId === product.id;

        if (isQualifyingMatch) {
          return { offer, type: "qualifying" } as const;
        }

        if (isFreeMatch) {
          return { offer, type: "free" } as const;
        }

        return null;
      })
      .filter((item): item is { offer: FreeItemOffer; type: "qualifying" | "free" } => Boolean(item))
      .slice(0, 2);
  }, [activeFreeItemOffers, product, selectedVariant?.id]);

  // Dynamic Rating distribution breakdown calculation
  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    if (productRatings.length === 0) {
      return [0, 0, 0, 0, 0];
    }
    productRatings.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating)));
      dist[5 - star]++;
    });
    const total = productRatings.length;
    return dist.map((count) => Math.round((count / total) * 100));
  }, [productRatings]);

  // Image hover coordinate calculations for magnifier lens zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleNotifyMe = () => {
    if (!product) return;
    saveNotifyRequest({
      productId: product.id,
      variantId: selectedVariant?.id,
      productName: product.name,
    });
    toast.success("We saved this notify request for your account flow.");
  };

  const handleSubmitProductRating = async () => {
    if (!product) return;
    if (!session?.accessToken) {
      openAuthModal();
      return;
    }

    setIsSubmittingRating(true);
    try {
      await submitProductRating({
        productId: product.id,
        rating: ratingValue,
        comment: ratingComment.trim(),
      });
      toast.success("Product review submitted.");
      setRatingComment("");
      const nextRatings = await getProductRatings(product.id);
      setProductRatings(nextRatings);
    } catch (error: any) {
      toast.error(error?.message || "You can rate products after they are delivered.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitRfq = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product) return;
    // Prefer Zustand session; fall back to localStorage in case React hasn't re-rendered
    // after writeStoredSession fired SESSION_UPDATED_EVENT (race-condition guard)
    const activeToken =
      session?.accessToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || localStorage.getItem('kfpcl_token')
        : null);
    if (!activeToken || activeToken === 'undefined' || activeToken === 'null') {
      toast.error("Please sign in to submit an RFQ.");
      openAuthModal();
      return;
    }

    if (!rfqBuyerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    const cleanPhone = rfqBuyerPhone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    const rawQuantity = rfqQuantity.trim();
    if (!rawQuantity) {
      toast.error("Enter a valid quantity, for example 500 kg or 30 Standard Packs.");
      return;
    }

    const quantityMatch = rawQuantity.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const unit = quantityMatch?.[2]?.trim() || selectedVariant?.name || "KG";
    const message = [
      `Buyer Name: ${rfqBuyerName.trim()}`,
      `Buyer Mobile: +91 ${cleanPhone}`,
      `Subject: ${rfqSubject.trim()}`,
      rfqNotes.trim(),
      rfqFile ? `Attachment selected: ${rfqFile.name}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    setIsRfqSubmitting(true);
    try {
      await rfqApi.createRFQ({
        productId: Number(product.id),
        productName: product.name,
        title: product.name,
        subject: rfqSubject.trim() || `Price Enquiry for ${product.name}`,
        description: message,
        buyerMessage: message,
        quantity: rawQuantity,
        unit,
        deliveryLocation: rfqDeliveryLocation.trim(),
        buyerName: rfqBuyerName.trim(),
        buyerPhone: `+91 ${cleanPhone}`,
        email: session?.email || undefined,
      });

      setIsRfqModalOpen(false);
      setRfqQuantity("");
      setRfqDeliveryLocation("");
      setRfqSubject("");
      setRfqNotes("");
      setRfqFile(null);
      toast.success("RFQ submitted successfully. It is now available in the admin RFQ panel.");
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      toast.error(serverMessage || "We could not submit your RFQ. Please try again.");
    } finally {
      setIsRfqSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-[55vh] items-center justify-center text-[#0A4D3C] font-black text-sm">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
        Loading product details...
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="app-shell-narrow text-center py-20">
        <h1 className="text-2xl font-black text-[#0A4D3C]">Product not found</h1>
        <p className="mt-4 text-sm text-[#7C9A90]">{error || "This product may have been removed or renamed."}</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#D4A853] hover:text-[#0A4D3C] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>
      </div>
    );
  }

  const qualifyingOffer = productOfferHighlights.find(o => o.type === "qualifying");

  return (
    <div className="app-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
      <Link
        to={product.categoryId && product.categoryName ? getCategoryHref({ id: product.categoryId, name: product.categoryName }) : "/shop"}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-[#0A4D3C] hover:bg-[#0A4D3C]/5 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Continue shopping
      </Link>

      {/* Unified Canvas Grid Layout (no separate border boxes for left/right halves) */}
      <div className="mt-10 grid gap-12 md:grid-cols-2 items-start relative">
        {/* Animated background blobs */}
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(10,77,60,0.02),transparent_70%)] pointer-events-none animate-pulse-glow" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.02),transparent_70%)] pointer-events-none animate-pulse-glow" style={{ animationDelay: "1.5s", animationDuration: '4s' }} />

        {/* Left Side: Product Image & Gallery Wrapper (Stretches to full height of grid for sticky tracking) */}
        <div className="relative self-stretch">
          <div className="space-y-6 md:sticky md:top-24">
            {/* Vertical Preview Gallery Integration */}
          <div className="flex gap-4 items-start">
            {/* Vertical Thumbnail Strip on Left */}
            {gallery.length > 1 && (
              <div className="flex flex-col gap-2 shrink-0">
                {gallery.slice(0, 5).map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    onMouseEnter={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-xl border-2 h-14 w-14 bg-white transition-all ${
                      selectedImageIndex === index ? "border-[#0A4D3C] scale-105 shadow-sm" : "border-transparent hover:border-gray-250"
                    }`}
                  >
                    <div className="flex h-full w-full items-center justify-center bg-gray-50 p-1">
                      <img
                        src={image}
                        alt=""
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Main Zoom Frame on Right */}
            <div
              className="relative overflow-hidden rounded-3xl bg-[#FAF8F5]/80 flex items-center justify-center border border-gray-150/40 cursor-zoom-in group/zoom aspect-square flex-1 shadow-[0_8px_30px_rgba(0,0,0,0.02)]"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
            >
              <div className="flex h-full w-full items-center justify-center p-8">
                <img
                  src={activeImage}
                  alt={product.name}
                  style={
                    isZooming
                      ? {
                          transform: "scale(1.8)",
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        }
                      : undefined
                  }
                  className="max-h-[90%] max-w-[90%] object-contain mix-blend-multiply transition-transform duration-75 ease-out"
                />
              </div>
              {/* Magnifier indicator */}
              <div className="absolute bottom-3 right-3 pointer-events-none rounded-md bg-[#0A4D3C]/80 px-2.5 py-1 text-[8.5px] font-black text-white uppercase tracking-wider opacity-60 group-hover/zoom:opacity-0 transition-opacity">
                Hover to Zoom
              </div>
            </div>
          </div>

          {/* Premium attributes badges aligned cleanly in horizontal strip without boxed lines */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-xs">🌿</span>
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">100% Organic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-[#FFEBEE] flex items-center justify-center text-xs">🚫</span>
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">No Toxins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-[#FFF3E0] flex items-center justify-center text-xs">🚜</span>
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">Farm Direct</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-[#E0F2F1] flex items-center justify-center text-xs">📦</span>
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">Eco Friendly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Product details column (Clean vertical alignment) */}
      <div className="space-y-5 md:pl-2">
        {/* Header Row */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {product.categoryName ? (
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4A853] bg-[#0A4D3C]/5 border border-[#D4A853]/25 px-2.5 py-1 rounded-md">
                {product.categoryName}
              </span>
            ) : <div />}

            <div className="flex items-center gap-2">
              <div className="flex items-center text-[#D4A853]">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current opacity-70" />
              </div>
              <span className="text-xs font-bold text-[#7C9A90]">(18 Reviews)</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {product.name}
          </h1>

          {/* Bulleted list features */}
          {parsedDescription.length > 0 ? (
            <ul className="space-y-2 pt-2">
              {parsedDescription.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[13.5px] text-gray-600 font-semibold leading-relaxed">
                  <span className="text-[#0A4D3C] mt-1.5 shrink-0 text-[10px]">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-gray-500 font-semibold">
              {product.description || "Fresh groceries and daily essentials selected for easy ordering."}
            </p>
          )}
        </div>

        {/* Store / Supplier Details Card added by Admin */}
        {(product.store?.name || product.storeName) && (
          <div className="rounded-2xl border border-emerald-800/15 bg-gradient-to-r from-[#F0FBF7] to-[#FAF8F5] p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A4D3C] text-[#D4A853] shadow-xs">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-[#0A4D3C] truncate">
                    {product.store?.name || product.storeName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800 flex-shrink-0">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Partner Store
                  </span>
                </div>
                {(product.store?.address || product.store?.city) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#52647C] line-clamp-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{product.store.address || product.store.city}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7B94] font-medium">
                  {product.store?.city && <span>📍 {product.store.city}</span>}
                  {product.store?.timings && <span>🕒 {product.store.timings}</span>}
                  {product.store?.phoneNumber && <span>📞 {product.store.phoneNumber}</span>}
                  {product.store?.rating != null && product.store.rating > 0 && <span>⭐ {product.store.rating} Rating</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Buy Box Panel Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Price list */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-[#0A4D3C]">{formatCurrency(sellingPrice)}</span>
            {originalPrice > sellingPrice && (
              <>
                <span className="text-base text-gray-400 line-through font-semibold">{formatCurrency(originalPrice)}</span>
                <span className="rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                  Save {Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Pack Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider text-[#7C9A90] font-black">Choose Pack Size</span>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariant?.id;
                  const variantSellingPrice = variant.discountPrice || variant.price;
                  return (
                    <button
                      type="button"
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                        isSelected
                          ? "border-[#0A4D3C] bg-[#0A4D3C] text-white shadow-sm scale-105"
                          : "border-gray-200 bg-white hover:border-[#0A4D3C]/40 text-[#4A5D76]"
                      }`}
                    >
                      {variant.name} • {formatCurrency(variantSellingPrice)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

            {/* Enquiry controls */}
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#7C9A90] font-black">Option Chosen</div>
                <h4 className="text-sm font-black text-gray-900 mt-0.5">{selectedVariant?.name || "Default Option"}</h4>
                <p className="text-[10px] text-gray-400 font-semibold leading-none mt-1">
                  {selectedVariant?.stock && selectedVariant.stock > 0
                    ? getStockLabel(selectedVariant.stock)
                    : "Out of stock"}
                  {" • "}{getDeliveryEtaText()}
                </p>
              </div>

              {selectedVariant && (
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRfqModalOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] text-[#D4A853] hover:bg-[#0E5E4A] transition-all font-bold text-xs uppercase tracking-wider px-4 shadow-md cursor-pointer"
                    id="submit-rfq-button"
                  >
                    <FileText className="h-4 w-4 text-[#D4A853]" />
                    RFQ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openCallModal({
                        phoneNumber: "6309981444",
                        title: `Call for ${product?.name || "Product Inquiry"}`,
                        subtitle: product?.store?.name ? `Direct contact for ${product.name} (Store: ${product.store.name})` : `Direct contact for ${product?.name || "KFPCL Product Inquiry"}`,
                        productName: product?.name,
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0A4D3C]/20 bg-[#F0FBF7] px-4 text-xs font-bold uppercase tracking-wider text-[#0A4D3C] transition-colors hover:bg-[#0A4D3C]/10 cursor-pointer"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </button>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1FB957]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Gamified offer progress */}
          {qualifyingOffer && (
            <div className="bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-black text-[#0A4D3C]">
                <span className="flex items-center gap-1">🎁 Bundle Offer Progress</span>
                <span>{quantityInCart} / {qualifyingOffer.offer.qualifyingQuantity}</span>
              </div>
              <div className="w-full bg-gray-200/60 rounded-full h-1.5">
                <div
                  className="bg-[#D4A853] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(Math.min(quantityInCart, qualifyingOffer.offer.qualifyingQuantity) / qualifyingOffer.offer.qualifyingQuantity) * 100}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-[#0A4D3C] leading-normal">
                {quantityInCart === 0
                  ? `Add ${qualifyingOffer.offer.qualifyingQuantity} items to receive ${qualifyingOffer.offer.freeQuantity} free bonus items!`
                  : quantityInCart < qualifyingOffer.offer.qualifyingQuantity
                    ? `Add ${qualifyingOffer.offer.qualifyingQuantity - quantityInCart} more to unlock your free gift!`
                    : "🎉 Offer Unlocked! Free bonus items will be added at checkout."}
              </p>
            </div>
          )}

          {/* Muted Trust highlights */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#7C9A90] py-1">
            <div className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-[#D4A853]" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#D4A853]" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PackageCheck className="h-4 w-4 text-[#D4A853]" />
              <span>Variant Aware</span>
            </div>
          </div>

          {/* Horizontal Tabs Selection (Ingredients, Shelf Life, Quality Guarantee) */}
          <div className="space-y-4 pt-4 border-t border-b border-gray-100 pb-4">
            <div className="flex gap-2 sm:gap-4 border-b border-gray-100 pb-2 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveTab("ingredients")}
                className={`pb-2 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 focus:outline-none ${
                  activeTab === "ingredients"
                    ? "border-[#D4A853] text-[#0A4D3C]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {isPersonalCare ? "Ingredients & Extracts" : "Specifications"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sourcing")}
                className={`pb-2 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 focus:outline-none ${
                  activeTab === "sourcing"
                    ? "border-[#D4A853] text-[#0A4D3C]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Shelf Life & Storage
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("promise")}
                className={`pb-2 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 focus:outline-none ${
                  activeTab === "promise"
                    ? "border-[#D4A853] text-[#0A4D3C]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Our Quality Guarantee
              </button>
            </div>

            {/* Tab content panel */}
            <div className="min-h-[100px] pt-1">
              <AnimatePresence mode="wait">
                {activeTab === "ingredients" && (
                  <motion.div
                    key="tab-ingredients"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-[#7C9A90] font-semibold leading-relaxed"
                  >
                    {isPersonalCare ? (
                      <div className="grid grid-cols-2 gap-2 text-[#4A5D76]">
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>Amla (Gooseberry)</span></div>
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>Bhringraj Extract</span></div>
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>Sesame & Coconut Oils</span></div>
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>Brahmi & Shikakai</span></div>
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>No Synthetic Coatings</span></div>
                        <div className="flex items-center gap-1"><span className="text-[#D4A853]">✦</span><span>Zero Parabens</span></div>
                      </div>
                    ) : (
                      <table className="w-full text-left text-[11px] text-[#4A5D76]">
                        <tbody>
                          <tr className="border-b border-gray-50"><td className="py-1 font-bold">Energy</td><td className="py-1 text-right">553 kcal</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1 font-bold">Protein</td><td className="py-1 text-right">18.2 g</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1 font-bold">Carbohydrates</td><td className="py-1 text-right">30.1 g</td></tr>
                          <tr><td className="py-1 font-bold">Total Fat</td><td className="py-1 text-right">43.8 g</td></tr>
                        </tbody>
                      </table>
                    )}
                  </motion.div>
                )}

                {activeTab === "sourcing" && (
                  <motion.div
                    key="tab-sourcing"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-[#4A5D76] font-semibold leading-relaxed space-y-1.5"
                  >
                    <div><span className="font-extrabold text-[#0A4D3C]">Shelf Life:</span> 6 Months from packaging date</div>
                    <div><span className="font-extrabold text-[#0A4D3C]">Storage:</span> Keep in a cool, dry place away from direct sunlight</div>
                    <div><span className="font-extrabold text-[#0A4D3C]">Origin:</span> Sourced from certified partner farms in Hyderabad, IN</div>
                  </motion.div>
                )}

                {activeTab === "promise" && (
                  <motion.div
                    key="tab-promise"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-[#4A5D76] font-semibold leading-relaxed space-y-1.5"
                  >
                    <p>
                      At Karthikeya Farmer Producer Company Limited, we partner directly with smallholder farmers to guarantee fair wages, pesticide-free cultivation, and 100% natural, premium grade quality.
                    </p>
                    <p className="italic text-[10px] text-[#D4A853] font-black">
                      No chemical additives or artificial coatings, guaranteed.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {!selectedVariantInStock ? (
            <button
              type="button"
              onClick={handleNotifyMe}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-[#0A4D3C] hover:bg-[#0A4D3C]/5 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              Notify me when available
            </button>
          ) : null}

          {/* Verification info line */}
          <div className="text-[11px] text-gray-450 flex items-center gap-1.5 leading-none">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D4A853] flex-shrink-0" />
            <span className="font-semibold text-gray-400">Pack sizes, pricing, and savings are verified. Protected checkout.</span>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-16 border-t border-gray-100 pt-12">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#0A4D3C] tracking-tight">Recommended add-ons</h2>
            <p className="mt-1 text-sm text-[#7C9A90] font-semibold">Products commonly purchased together.</p>
          </div>
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={`${relatedProduct.id}-${relatedProduct.primaryVariant?.id || "primary"}`} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Ratings & Advanced Reviews Section (Directly on canvas, clean 2-column) */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-20 border-t border-gray-100 pt-16 grid gap-10 md:grid-cols-[35%_65%] relative"
      >
        {/* Left Rating statistics panel */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#7C9A90]">
              <Star className="h-3.5 w-3.5 text-[#D4A853] fill-current" />
              Customer ratings
            </div>
            <h2 className="mt-2 font-sans font-black text-2xl text-[#0A4D3C]">Customer Reviews</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-black text-[#0A4D3C]">4.8</span>
              <div>
                <div className="flex items-center text-[#D4A853]">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current opacity-70" />
                </div>
                <span className="text-[10px] font-bold text-[#7C9A90]">based on {productRatings.length || 18} reviews</span>
              </div>
            </div>

            {/* Visual breakdown bar */}
            <div className="space-y-1.5 pt-3 border-t border-gray-100">
              {[5, 4, 3, 2, 1].map((stars, idx) => {
                const pct = ratingDistribution[idx];
                return (
                  <div key={stars} className="flex items-center gap-2 text-[11px] text-[#7C9A90] font-semibold">
                    <span className="w-10 text-right">{stars} star</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#D4A853] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-bold text-[#0A4D3C]">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right review items and review input panel */}
        <div className="space-y-6">
          <h2 className="font-sans font-black text-2xl text-[#0A4D3C]">User feedback</h2>
          
          {/* Individual Reviews */}
          {productRatings.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
              {productRatings.slice(0, 5).map((rating, index) => (
                <div key={rating.id || `${rating.customerName}-${index}`} className="rounded-xl border border-gray-105 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-extrabold text-xs text-gray-800">{rating.customerName || "Customer"}</div>
                    <div className="flex items-center gap-0.5 text-[#D4A853]">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className={`h-3 w-3 ${starIndex < rating.rating ? "fill-current text-[#D4A853]" : "fill-none text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  {rating.comment ? <p className="mt-2 text-xs leading-relaxed text-[#7C9A90] font-semibold">{rating.comment}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[#FAF8F5]/30 rounded-2xl border border-dashed border-gray-150/40">
              <span className="text-3xl block">✍️</span>
              <p className="mt-3 text-xs font-semibold text-[#7C9A90]">No reviews yet. Be the first to share your thoughts!</p>
            </div>
          )}

          {/* Rating Submission section */}
          {session?.accessToken ? (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h3 className="text-xs font-black text-[#0A4D3C] uppercase tracking-wider">Leave your feedback</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#7C9A90]">Your Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingValue(value)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                          value <= ratingValue ? "border-[#D4A853] bg-[#FEF7E8] text-[#B8860B]" : "border-gray-200 bg-white text-[#7C9A90]"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${value <= ratingValue ? "fill-current" : "fill-none"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={(event) => setRatingComment(event.target.value)}
                    placeholder="Describe your experience with this product (quality, delivery, packaging)..."
                    style={{ pointerEvents: "auto", position: "relative", zIndex: 10 }}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-[#0A1628] outline-none focus:border-[#0A4D3C] placeholder:text-[#7C9A90] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSubmitProductRating()}
                    disabled={isSubmittingRating}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A4D3C] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmittingRating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                    Submit Review
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-5 text-center py-5 bg-[#FAF8F5]/60 rounded-2xl border border-gray-150/40 px-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500">
                Purchased this product? Share your experience by signing in!
              </p>
              <button
                type="button"
                onClick={openAuthModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A4D3C] transition-colors"
              >
                Sign in to leave feedback
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Enquiry to Supplier Modal (rendered at document.body via Portal to guarantee top stacking above navbar) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isRfqModalOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-[#0A1628]/80 backdrop-blur-md overflow-y-auto"
                onClick={() => setIsRfqModalOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[min(90vh,760px)] flex flex-col rounded-[2rem] border border-[#D4A853]/20 bg-white shadow-2xl overflow-hidden my-auto"
                >
                  {/* Header (fixed at top of modal) */}
                  <div className="flex-shrink-0 bg-[#0A4D3C] px-6 py-4 sm:py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A853]/20">
                        <FileText className="h-5 w-5 text-[#D4A853]" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-white tracking-wide uppercase">Enquiry to Supplier</h3>
                        <p className="text-[11px] text-[#7EC8B0] font-semibold mt-0.5">{product?.name || "Product"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRfqModalOpen(false)}
                      className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Meta strip (fixed under header) */}
                  <div className="flex-shrink-0 bg-[#F0FBF7] border-b border-[#D4A853]/15 px-6 py-3 space-y-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-[#7C9A90]">Enquiry ID</span>
                        <p className="text-xs font-black text-[#0A4D3C] mt-0.5">{enquiryId}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-[#7C9A90]">Date</span>
                        <p className="text-xs font-black text-[#0A4D3C] mt-0.5">{enquiryDate}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-widest font-black text-[#7C9A90]">Product</span>
                        <p className="text-xs font-black text-[#0A4D3C] mt-0.5 truncate">{product?.name || "—"}</p>
                      </div>
                    </div>

                    {(rfqBuyerName || rfqBuyerPhone) && (
                      <div className="pt-2 border-t border-[#0A4D3C]/10 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[#0A4D3C]">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <User className="h-3 w-3 text-[#D4A853]" />
                          <span className="text-[#7C9A90] font-normal">Buyer:</span> {rfqBuyerName || "—"}
                        </div>
                        {rfqBuyerPhone && (
                          <div className="inline-flex items-center gap-1.5 font-bold">
                            <Phone className="h-3 w-3 text-[#D4A853]" />
                            <span className="text-[#7C9A90] font-normal">Mobile:</span> +91 {rfqBuyerPhone.replace(/\D/g, "")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form body (scrollable internal area) */}
                  <form
                    onSubmit={handleSubmitRfq}
                    className="flex flex-col flex-1 min-h-0 overflow-hidden"
                  >
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {/* Buyer Details Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[#0A4D3C]" />
                            Buyer Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={rfqBuyerName}
                            onChange={(e) => setRfqBuyerName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0A4D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/15 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-[#0A4D3C]" />
                            Buyer Mobile Number <span className="text-red-400">*</span>
                          </label>
                          <div className="relative flex rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0A4D3C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0A4D3C]/15 transition-colors overflow-hidden">
                            <span className="inline-flex items-center px-3 border-r border-gray-200 text-xs font-bold text-[#0A4D3C] bg-gray-100/80 select-none">
                              +91
                            </span>
                            <input
                              type="tel"
                              required
                              value={rfqBuyerPhone}
                              onChange={(e) => setRfqBuyerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              placeholder="10-digit mobile number"
                              maxLength={10}
                              className="w-full bg-transparent px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5">Quantity <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            required
                            value={rfqQuantity}
                            onChange={(e) => setRfqQuantity(e.target.value)}
                            placeholder="e.g. 500 kg, 5 MT"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0A4D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/15 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5">Delivery Location <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            required
                            value={rfqDeliveryLocation}
                            onChange={(e) => setRfqDeliveryLocation(e.target.value)}
                            placeholder="e.g. Mumbai, Dubai Port"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0A4D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/15 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5">Subject <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          required
                          value={rfqSubject}
                          onChange={(e) => setRfqSubject(e.target.value)}
                          placeholder="e.g. Price enquiry for bulk export order"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0A4D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/15 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5">Message</label>
                        <textarea
                          rows={3}
                          value={rfqNotes}
                          onChange={(e) => setRfqNotes(e.target.value)}
                          placeholder="Describe your requirements: destination port, packaging, certifications, delivery timeline..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0A4D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/15 resize-none transition-colors"
                        />
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-black text-[#7C9A90] mb-1.5">Upload File <span className="text-gray-400 font-semibold normal-case">(optional — spec sheet, PO, etc.)</span></label>
                        <label className="flex items-center gap-3 w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#0A4D3C]/40 hover:bg-[#F0FBF7] px-4 py-3 cursor-pointer transition-colors group">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            className="sr-only"
                            onChange={(e) => setRfqFile(e.target.files?.[0] ?? null)}
                          />
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A4D3C]/10 group-hover:bg-[#0A4D3C]/15 flex-shrink-0 transition-colors">
                            <Send className="h-4 w-4 text-[#0A4D3C] rotate-[-45deg]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {rfqFile ? (
                              <p className="text-xs font-bold text-[#0A4D3C] truncate">{rfqFile.name}</p>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-gray-600">Click to upload a file</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOC, XLS, JPG, PNG up to 10 MB</p>
                              </>
                            )}
                          </div>
                          {rfqFile && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setRfqFile(null); }}
                              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Actions Footer (always pinned at the bottom of the card) */}
                    <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-3.5 bg-gray-50 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsRfqModalOpen(false)}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRfqSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-6 py-2.5 text-xs font-bold text-[#D4A853] hover:bg-[#0E5E4A] transition-colors disabled:opacity-60 shadow-md"
                      >
                        {isRfqSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Enquiry
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
