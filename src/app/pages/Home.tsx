import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { AppShowcase } from "../components/AppShowcase";
import { CategoryCard } from "../components/CategoryCard";
import { ProductCard } from "../components/ProductCard";
import { APP_COPY } from "../lib/config";
import {
  getBanners,
  getBestSellerProducts,
  getCategories,
  getOrders,
  getProductById,
  getProducts,
  getTrendingProducts,
} from "../data/storefrontData";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useLocationStore } from "../store/locationStore";
import type { Banner, Category, Product } from "../types/storefront";

export function Home() {
  const currentLocation = useLocationStore((state) => state.location);
  const session = useAuthStore((state) => state.session);
  const cart = useCartStore((state) => state.cart);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [bestSellerProducts, setBestSellerProducts] = useState<Product[]>([]);
  const [freshProducts, setFreshProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [previouslyOrderedProducts, setPreviouslyOrderedProducts] = useState<Product[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [heroAspectRatio, setHeroAspectRatio] = useState(16 / 9);
  const [isLoading, setIsLoading] = useState(true);
  const [allProductsLoading, setAllProductsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getBanners(),
      getCategories(),
      getTrendingProducts(),
      getBestSellerProducts(),
      getProducts(),
    ])
      .then(([nextBanners, nextCategories, nextTrending, nextBestSellers, nextProducts]) => {
        if (!isMounted) return;
        // Only active banners added by Admin
        setBanners(nextBanners.filter((banner) => banner.isActive !== false));
        setCategories(nextCategories);
        setTrendingProducts(nextTrending.slice(0, 4));
        setBestSellerProducts(nextBestSellers.slice(0, 4));
        setFreshProducts(nextProducts.slice(0, 8));
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        setError(loadError?.message || "Unable to load the storefront right now.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setAllProductsLoading(true);
    getProducts()
      .then((data) => {
        if (!isMounted) return;
        setAllProducts(data);
      })
      .catch(() => {
        if (!isMounted) return;
      })
      .finally(() => {
        if (isMounted) setAllProductsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      setPreviouslyOrderedProducts([]);
      return;
    }

    let isMounted = true;
    getOrders()
      .then(async (orders) => {
        const recentOrders = orders.slice(0, 2);
        const itemProductIds = Array.from(
          new Set(
            recentOrders
              .flatMap((order) => [
                ...(order.items || []),
                ...(order.storeGroups ?? []).flatMap((group) => group.items || []),
              ])
              .map((item) => item.productId)
              .filter(Boolean),
          ),
        ).slice(0, 4);

        const products = await Promise.all(
          itemProductIds.map((id) => getProductById(Number(id)).catch(() => null)),
        );

        if (isMounted) {
          setPreviouslyOrderedProducts(products.filter(Boolean) as Product[]);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPreviouslyOrderedProducts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  // Dynamic banners directly from Admin Banner API
  const heroSlides: Banner[] = banners;
  const activeBanner = heroSlides[activeBannerIndex] || heroSlides[0];

  const dealProducts = useMemo(
    () => freshProducts.filter((product) => product.hasDiscount || product.discountPercent > 0).slice(0, 4),
    [freshProducts],
  );


  const cartInspiredProducts = useMemo(() => {
    const cartCategories = new Set(cart.map((item) => item.categoryName).filter(Boolean));
    return freshProducts
      .filter(
        (product) =>
          cartCategories.has(product.categoryName) &&
          !cart.some((item) => item.productId === product.id),
      )
      .slice(0, 4);
  }, [cart, freshProducts]);

  // Auto-advance dynamic slides if more than 1 banner exists
  useEffect(() => {
    if (heroSlides.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    // Reset while the next image loads so a previous banner cannot crop it.
    setHeroAspectRatio(16 / 9);
  }, [activeBanner?.id]);

  return (
    <div className="app-shell !px-3 sm:!px-6 !pt-3 !pb-0 sm:!pt-4">
      {/* ─── Hero Banner: Full-width, no carousel arrows, no dots ─── */}
      {heroSlides.length > 0 && activeBanner && (() => {
        const bannerLink =
          activeBanner.targetUrl ||
          (activeBanner.actionType === "CATEGORY" && activeBanner.actionValue
            ? `/shop?categoryId=${activeBanner.actionValue}`
            : null);
        const isExternalBannerLink = bannerLink ? /^https?:\/\//i.test(bannerLink) : false;

        const bannerImg = (
          <img
            key={activeBanner.id}
            src={activeBanner.imageUrl}
            alt={activeBanner.name || APP_COPY.brand}
            className="w-full h-full max-h-[210px] xs:max-h-[240px] sm:max-h-[340px] md:max-h-[420px] object-contain sm:object-cover object-center block select-none rounded-xl sm:rounded-[2.4rem]"
            onLoad={(event) => {
              const { naturalHeight, naturalWidth } = event.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                setHeroAspectRatio(naturalWidth / naturalHeight);
              }
            }}
            draggable={false}
          />
        );

        return (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full overflow-hidden"
          >
            {/* Banner image container with rounded corners and subtle shadow */}
            <div
              className="relative w-full overflow-hidden rounded-xl sm:rounded-[2.4rem] border border-[#E2E8F0]/80 bg-[#0A1628] shadow-[0_8px_30px_rgba(10,22,40,0.06)] flex items-center justify-center max-h-[210px] xs:max-h-[240px] sm:max-h-[340px] md:max-h-[420px]"
              style={{ aspectRatio: heroAspectRatio }}
            >
              {activeBanner.imageUrl ? (
                bannerLink ? (
                  isExternalBannerLink ? (
                    <a
                      href={bannerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full rounded-xl sm:rounded-[2.4rem] overflow-hidden"
                    >
                      {bannerImg}
                    </a>
                  ) : (
                    <Link to={bannerLink} className="block w-full h-full rounded-xl sm:rounded-[2.4rem] overflow-hidden">
                      {bannerImg}
                    </Link>
                  )
                ) : (
                  <div className="w-full h-full rounded-xl sm:rounded-[2.4rem] overflow-hidden">{bannerImg}</div>
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A4D3C] to-[#0A1628] text-white/60 text-base font-medium tracking-wide rounded-xl sm:rounded-[2.4rem]">
                  {activeBanner.name || APP_COPY.brand}
                </div>
              )}

              {/* Auto-slide indicator dots (no arrows) — only shown if multiple banners */}
              {heroSlides.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {heroSlides.slice(0, 8).map((banner, index) => (
                    <button
                      key={banner.id}
                      type="button"
                      aria-label={`Show banner ${index + 1}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveBannerIndex(index);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeBannerIndex
                          ? "w-6 bg-white shadow"
                          : "w-1.5 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        );
      })()}

      {isLoading ? (
        <div className="mt-10 flex min-h-[240px] items-center justify-center rounded-[2rem] border border-[#E2E8F0] bg-white/70 text-[#6B7B94] shadow-[0_24px_50px_rgba(10,22,40,0.05)]">
          <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
          Loading today's fresh picks...
        </div>
      ) : error ? (
        <div className="mt-10 rounded-[2rem] border border-[#F5D5D0] bg-[#FEF2F2] px-5 py-4 text-sm text-[#DC2626]">
          {error}
        </div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Shop by category</h2>
                <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-[#0A4D3C] to-[#D4A853]" />
              </div>
              <Link
                to="/shop"
                className="group/link inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0A4D3C] shadow-[0_4px_12px_rgba(10,22,40,0.03)] transition-all duration-300 hover:border-[#0A4D3C]/30 hover:bg-[#F8FAFD] hover:text-[#0A4D3C] hover:shadow-[0_8px_20px_rgba(10,77,60,0.08)]"
              >
                Explore full shop
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 justify-items-center">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} compact />
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-12"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Best sellers</h2>
                <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-[#D4A853] to-[#0A4D3C]" />
              </div>
              <Link
                to="/shop?sort=featured"
                className="group/link inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0A4D3C] shadow-[0_4px_12px_rgba(10,22,40,0.03)] transition-all duration-300 hover:border-[#0A4D3C]/30 hover:bg-[#F8FAFD] hover:text-[#0A4D3C] hover:shadow-[0_8px_20px_rgba(10,77,60,0.08)]"
              >
                Browse all
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {bestSellerProducts.map((product) => (
                <ProductCard
                  key={`${product.id}-${product.primaryVariant?.id || "primary"}`}
                  product={product}
                />
              ))}
            </div>
          </motion.section>

          {previouslyOrderedProducts.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="section-title">Previously ordered</h2>
                  <p className="mt-1 text-sm text-[#6B7B94]">
                    Your usual products, ready for a faster reorder.
                  </p>
                </div>
                <Link
                  to="/account?tab=orders"
                  className="text-sm font-semibold text-[#0A4D3C] transition hover:text-[#0E5E4A]"
                >
                  Repeat last order
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {previouslyOrderedProducts.map((product) => (
                  <ProductCard
                    key={`previous-${product.id}-${product.primaryVariant?.id || "primary"}`}
                    product={product}
                  />
                ))}
              </div>
            </motion.section>
          ) : null}

          {cartInspiredProducts.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <div className="mb-5">
                <h2 className="section-title">Recommended add-ons</h2>
                <p className="mt-1 text-sm text-[#6B7B94]">
                  Useful additions based on what is already in your cart.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {cartInspiredProducts.map((product) => (
                  <ProductCard
                    key={`cart-inspired-${product.id}-${product.primaryVariant?.id || "primary"}`}
                    product={product}
                  />
                ))}
              </div>
            </motion.section>
          ) : null}

          {dealProducts.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <div className="mb-5">
                <h2 className="section-title">Deals of the day</h2>
                <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-[#DC2626] to-[#D4A853]" />
                <p className="mt-2 text-sm text-[#6B7B94]">
                  Discounted essentials surfaced automatically from live product pricing.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {dealProducts.map((product) => (
                  <ProductCard
                    key={`deal-${product.id}-${product.primaryVariant?.id || "primary"}`}
                    product={product}
                  />
                ))}
              </div>
            </motion.section>
          ) : null}


          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-12"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Trending now</h2>
                <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-[#D4A853] to-[#0A4D3C]" />
              </div>
              <Link
                to="/shop?trending=1"
                className="text-sm font-semibold text-[#0A4D3C] transition hover:text-[#0E5E4A]"
              >
                Explore trending
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {trendingProducts.map((product) => (
                <ProductCard
                  key={`${product.id}-${product.primaryVariant?.id || "primary"}`}
                  product={product}
                />
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-12"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">All products</h2>
                <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-[#0A4D3C] to-[#D4A853]" />
                <p className="mt-1 text-sm text-[#6B7B94]">
                  Browse our complete catalogue in one place.
                </p>
              </div>
              <Link
                to="/shop"
                className="group/link inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0A4D3C] shadow-[0_4px_12px_rgba(10,22,40,0.03)] transition-all duration-300 hover:border-[#0A4D3C]/30 hover:bg-[#F8FAFD] hover:text-[#0A4D3C] hover:shadow-[0_8px_20px_rgba(10,77,60,0.08)]"
              >
                Open shop
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
              </Link>
            </div>
            {allProductsLoading ? (
              <div className="flex min-h-[200px] items-center justify-center text-[#6B7B94]">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Loading all products...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {allProducts.map((product) => (
                  <ProductCard
                    key={`all-${product.id}-${product.primaryVariant?.id ?? "primary"}`}
                    product={product}
                  />
                ))}
              </div>
            )}
          </motion.section>

          <div className="mt-12 -mx-3 sm:-mx-6 lg:-mx-8 overflow-hidden">
            <AppShowcase />
          </div>
        </>
      )}
    </div>
  );
}
