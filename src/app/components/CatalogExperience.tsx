import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, ChevronRight, Grid3X3, LoaderCircle, Search, SlidersHorizontal, Sparkles, TrendingUp } from "lucide-react";
import { CategoryCard } from "./CategoryCard";
import { ProductCard } from "./ProductCard";
import { getCategoryHref, sortProducts } from "../lib/storefrontUtils";
import { getBestSellerProducts, getCategories, getCategoryById, getProducts, getSubcategories, getTrendingProducts } from "../data/storefrontData";
import type { Category, Product, ProductSort, SubCategory } from "../types/storefront";

/* Soft pastel accent colours for category cards */
const CATEGORY_COLORS = [
  "#FFF5E6", "#E8F5E9", "#FFF3E0", "#E3F2FD", "#FDE8E8",
  "#F3E8FF", "#E0F7FA", "#FFF9C4", "#FCE4EC", "#E8EAF6",
  "#E0F2F1", "#FBE9E7",
];

interface CatalogExperienceProps {
  fixedCategoryId?: number;
  title?: string;
  subtitle?: string;
}

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "relevance", label: "Best match" },
  { value: "featured", label: "Featured first" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "discount", label: "Best discounts" },
  { value: "name", label: "Alphabetical" },
  { value: "newest", label: "Newest picks" },
];

const numberFromParam = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

interface SearchParamsUpdater {
  [key: string]: string | null | undefined;
}

export function CatalogExperience({ fixedCategoryId, title, subtitle }: CatalogExperienceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [allShopProducts, setAllShopProducts] = useState<Product[]>([]);
  const [shopProductsLoading, setShopProductsLoading] = useState(false);

  const activeCategoryId = fixedCategoryId ?? numberFromParam(searchParams.get("category"));
  const activeSubCategoryId = numberFromParam(searchParams.get("sub"));
  const keyword = searchParams.get("q") || "";
  const trending = searchParams.get("trending") === "1";
  const requestedSort = searchParams.get("sort") as ProductSort | null;
  const sortBy =
    requestedSort && (requestedSort !== "relevance" || Boolean(keyword))
      ? requestedSort
      : keyword
        ? "relevance"
        : "featured";
  const sortOptions = keyword ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== "relevance");

  const [draftQuery, setDraftQuery] = useState(keyword);

  useEffect(() => {
    setDraftQuery(keyword);
  }, [keyword]);

  useEffect(() => {
    if (!searchParams.has("min") && !searchParams.has("max")) return;

    const next = new URLSearchParams(searchParams);
    next.delete("min");
    next.delete("max");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateParams = (updates: SearchParamsUpdater) => {
    const next = new URLSearchParams(searchParams);
    next.delete("min");
    next.delete("max");
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next);
  };

  useEffect(() => {
    let isMounted = true;

    getCategories()
      .then((nextCategories) => {
        if (!isMounted) return;
        setCategories(nextCategories);
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        setError(loadError?.message || "Unable to load filters right now.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldShowCategoryGrid = !activeCategoryId && !keyword && !activeSubCategoryId && !trending;

  /* Fetch trending + all products for the shop landing page */
  useEffect(() => {
    if (!shouldShowCategoryGrid) return;
    let isMounted = true;
    setShopProductsLoading(true);

    Promise.all([getTrendingProducts(), getBestSellerProducts(), getProducts()])
      .then(([trending, bestSellers, all]) => {
        if (!isMounted) return;
        /* Merge trending + bestsellers, deduplicate */
        const merged = [...trending, ...bestSellers];
        const seen = new Set<number>();
        const unique = merged.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
        setTrendingProducts(unique.slice(0, 8));
        setAllShopProducts(all);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setShopProductsLoading(false); });

    return () => { isMounted = false; };
  }, [shouldShowCategoryGrid]);

  useEffect(() => {
    let isMounted = true;

    if (!activeCategoryId) {
      setSubcategories([]);
      setCurrentCategory(null);
      return () => {
        isMounted = false;
      };
    }

    Promise.all([getCategoryById(activeCategoryId), getSubcategories(activeCategoryId)])
      .then(([category, nextSubcategories]) => {
        if (!isMounted) return;
        setCurrentCategory(category);
        setSubcategories(nextSubcategories);
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        setError(loadError?.message || "Unable to load category details.");
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategoryId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    getProducts({
      categoryId: activeCategoryId,
      subCategoryId: activeSubCategoryId,
      trending: trending || undefined,
      keyword: keyword || undefined,
    })
      .then((nextProducts) => {
        if (!isMounted) return;
        setProducts(nextProducts);
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        setError(loadError?.message || "Unable to load products.");
        setProducts([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategoryId, activeSubCategoryId, keyword, trending]);

  const sortedProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);

  const visibleTitle = title || currentCategory?.name || "Shop by category";
  const visibleSubtitle =
    subtitle ||
    (currentCategory?.description
      ? currentCategory.description
      : keyword
        ? `Showing smart results for "${keyword}" with typo correction and local grocery keywords.`
        : "Browse categories, refine with subcategories, and compare products on one clean page.");

  const appliedFilters = useMemo(() => {
    const labels: string[] = [];
    if (currentCategory?.name) labels.push(currentCategory.name);
    if (keyword) labels.push(`Search: ${keyword}`);
    if (activeSubCategoryId) {
      const match = subcategories.find((subcategory) => subcategory.id === activeSubCategoryId);


      if (match) labels.push(match.name);
    }
    if (trending) labels.push("Trending");
    return labels;
  }, [activeSubCategoryId, currentCategory?.name, keyword, subcategories, trending]);

  return (
    <div className="app-shell">
      {/* ── Breadcrumb + Page Header ── */}
      <div className="flex items-center gap-2 py-4 text-sm text-[#6B7B94]">
        <Link to="/" className="hover:text-[#0A1628] transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {currentCategory ? (
          <>
            <Link to="/shop" className="hover:text-[#0A1628] transition-colors">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-[#0A1628]">{currentCategory.name}</span>
          </>
        ) : keyword ? (
          <>
            <Link to="/shop" className="hover:text-[#0A1628] transition-colors">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-[#0A1628]">Search: "{keyword}"</span>
          </>
        ) : (
          <span className="font-semibold text-[#0A1628]">Shop</span>
        )}
      </div>

      {/* ── All Categories Grid + Products (when no category selected) ── */}
      {shouldShowCategoryGrid ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* ── Section: Categories ── */}
          <div className="mb-6">
            <h1 className="font-sans text-2xl font-bold text-[#0A1628] sm:text-3xl">
              Shop by Category
            </h1>
            <p className="mt-1.5 text-sm text-[#6B7B94] max-w-lg">
              Pick a category to browse fresh groceries, household essentials, and more.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={getCategoryHref(category)}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl p-3 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(10,22,40,0.08)] sm:flex-col sm:items-start sm:gap-0 sm:p-0"
                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
              >
                {/* Image */}
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-b-none sm:rounded-t-xl bg-white/40">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                {/* Name + Arrow */}
                <div className="flex flex-1 items-center justify-between sm:w-full sm:px-3 sm:py-3">
                  <h3 className="font-sans text-[13px] font-semibold text-[#0A1628] leading-snug line-clamp-2 group-hover:text-[#1E5AFA] transition-colors sm:text-sm">
                    {category.name}
                  </h3>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[#94A3B8] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#1E5AFA]" />
                </div>
              </Link>
            ))}
          </div>

          {/* ── Section: Trending Products ── */}
          {trendingProducts.length > 0 && (
            <div className="mt-10">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF5E6]">
                    <TrendingUp className="h-4 w-4 text-[#E67E22]" />
                  </div>
                  <div>
                    <h2 className="font-sans text-lg font-bold text-[#0A1628] sm:text-xl">Trending Products</h2>
                    <p className="text-xs text-[#6B7B94]">Most popular picks this week</p>
                  </div>
                </div>
                <Link
                  to="/shop?trending=1"
                  className="text-sm font-semibold text-[#1E5AFA] hover:underline hidden sm:inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {trendingProducts.map((product) => (
                  <ProductCard key={`trending-${product.id}-${product.primaryVariant?.id || "v"}`} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* ── Section: All Products ── */}
          <div className="mt-10">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5E9]">
                  <Sparkles className="h-4 w-4 text-[#2E7D32]" />
                </div>
                <div>
                  <h2 className="font-sans text-lg font-bold text-[#0A1628] sm:text-xl">All Products</h2>
                  <p className="text-xs text-[#6B7B94]">Browse our complete catalogue</p>
                </div>
              </div>
              <span className="text-sm text-[#6B7B94] font-medium">
                {allShopProducts.length} products
              </span>
            </div>
            {shopProductsLoading ? (
              <div className="flex min-h-[200px] items-center justify-center text-[#6B7B94]">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-sm">Loading products...</span>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {allShopProducts.map((product) => (
                  <ProductCard key={`all-${product.id}-${product.primaryVariant?.id || "v"}`} product={product} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* ── Category Products Layout ── */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto space-y-6 pb-12"
        >
          {/* Category Page Title and Subtitle */}
          <div className="mb-4">
            <h1 className="font-sans text-3xl font-black text-[#0A4D3C] tracking-tight">
              {currentCategory?.name || visibleTitle}
            </h1>
            {visibleSubtitle && (
              <p className="mt-2 text-sm text-[#7C9A90] font-semibold max-w-3xl leading-relaxed">
                {visibleSubtitle}
              </p>
            )}
          </div>

          {/* ── Top Subcategories Navigation (Boutique Organic Circular Menu) ── */}
          {currentCategory && subcategories.length > 0 && (
            <div className="sticky top-[70px] z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 pb-4 pt-4 mb-6 shadow-sm -mx-4 px-4 sm:mx-0 sm:px-2 sm:rounded-b-2xl">
                  <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
                    {/* "All" Option */}
                    <button
                      type="button"
                      onClick={() => updateParams({ sub: null })}
                      className="group flex flex-col items-center shrink-0 focus:outline-none"
                    >
                      <div className={`h-16 w-16 rounded-full border-2 bg-white overflow-hidden flex items-center justify-center transition-all duration-300 ${
                        !activeSubCategoryId
                          ? "border-[#D4A853] ring-4 ring-[#D4A853]/15 shadow-md scale-105"
                          : "border-[#E2E8F0] group-hover:border-[#0A4D3C]/30"
                      }`}>
                        <Grid3X3 className={`h-6 w-6 transition-colors duration-300 ${!activeSubCategoryId ? "text-[#0A4D3C]" : "text-[#94A3B8] group-hover:text-[#0A4D3C]"}`} />
                      </div>
                      <span className={`text-[12px] mt-2 transition-all duration-300 font-bold ${
                        !activeSubCategoryId ? "text-[#0A4D3C] font-black" : "text-[#6B7B94] group-hover:text-[#0A4D3C]"
                      }`}>
                        All {currentCategory.name}
                      </span>
                    </button>

                    {/* Subcategories */}
                    {subcategories.map((sub) => {
                      const isActive = activeSubCategoryId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => updateParams({ sub: String(sub.id) })}
                          className="group flex flex-col items-center shrink-0 focus:outline-none"
                        >
                          <div className={`h-16 w-16 rounded-full border-2 bg-white overflow-hidden transition-all duration-300 ${
                            isActive
                              ? "border-[#D4A853] ring-4 ring-[#D4A853]/15 shadow-md scale-105"
                              : "border-[#E2E8F0] group-hover:border-[#0A4D3C]/30"
                          }`}>
                            {sub.imageUrl ? (
                              <img
                                src={sub.imageUrl}
                                alt={sub.name}
                                className="h-full w-full object-cover bg-white"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                          </div>
                          <span className={`text-[12px] mt-2 transition-all duration-300 font-bold ${
                            isActive ? "text-[#0A4D3C] font-black" : "text-[#6B7B94] group-hover:text-[#0A4D3C]"
                          }`}>
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Promotional Banners (Dual Premium Editorial Side-by-Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Banner 1: Bazaar Selects */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A4D3C] via-[#0E5E4A] to-[#D4A853] p-7 text-white min-h-[180px] group shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-500 cursor-pointer">
                  <div className="max-w-[65%] z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4A853] bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Bazaar Selects</span>
                    <h3 className="mt-4 font-sans text-lg font-black leading-tight tracking-tight text-white sm:text-xl">
                      Forgot The Flowers? <span className="text-[#D4A853] font-black">WE DIDN'T!</span>
                    </h3>
                    <p className="mt-1.5 text-[13px] text-white/80 font-medium">Fresh blooms handpicked & delivered in minutes</p>
                  </div>
                  <div className="mt-5 z-10">
                    <button className="rounded-xl bg-[#D4A853] text-[#0A4D3C] px-6 py-2.5 text-[13px] font-black hover:bg-white hover:text-[#0A4D3C] hover:shadow-lg transition-all shadow-sm uppercase tracking-wider">
                      Explore Selects
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-36 w-36 opacity-90 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-700 z-0">
                    <img src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=300&q=80" alt="" className="h-full w-full object-contain mix-blend-screen" />
                  </div>
                </div>

                {/* Banner 2: Daily Fresh */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#073B4C] via-[#0A4D3C] to-[#E67E22] p-7 text-white min-h-[180px] group shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-500 cursor-pointer">
                  <div className="max-w-[65%] z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A7F3D0] bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Daily Fresh</span>
                    <h3 className="mt-4 font-sans text-lg font-black leading-tight tracking-tight text-white sm:text-xl">
                      Freshly Launched Market Deals
                    </h3>
                    <p className="mt-1.5 text-[13px] font-bold text-[#A7F3D0]">UP TO 30% OFF FRESHNESS</p>
                  </div>
                  <div className="mt-5 z-10">
                    <button className="rounded-xl bg-white text-[#0A4D3C] px-6 py-2.5 text-[13px] font-black hover:bg-[#F4F8F6] hover:shadow-lg transition-all shadow-sm uppercase tracking-wider">
                      Shop Fresh
                    </button>
                  </div>
                  <div className="absolute -bottom-3 -right-2 h-36 w-36 opacity-90 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-700 z-0">
                    <img src="https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=300&q=80" alt="" className="h-full w-full object-contain mix-blend-screen" />
                  </div>
                </div>
              </div>

              {/* ── Toolbar: Search + Sort + Count ── */}
              <div className="flex flex-col gap-4 rounded-3xl border border-[#E2E8F0]/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <div className="flex flex-1 items-center rounded-2xl bg-[#F8FAFC] px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0A4D3C]/20 focus-within:border-transparent border border-transparent hover:border-[#E2E8F0] transition-all shadow-inner shadow-slate-100/50">
                    <Search className="mr-3 h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                    <input
                      type="text"
                      value={draftQuery}
                      onChange={(event) => setDraftQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          updateParams({ q: draftQuery.trim() || null });
                        }
                      }}
                      className="w-full bg-transparent text-[15px] font-medium text-[#0A1628] outline-none placeholder:text-[#94A3B8]"
                      placeholder={`Search in ${currentCategory?.name || "products"}...`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateParams({ q: draftQuery.trim() || null })}
                    className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#0A4D3C] text-[#D4A853] hover:bg-[#0E5E4A] hover:text-white transition-all hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>

                {/* Sort + count */}
                <div className="flex items-center gap-4 flex-shrink-0 px-2 sm:px-0">
                  <span className="text-[13px] text-[#6B7B94] font-black uppercase tracking-wider hidden sm:inline">
                    {sortedProducts.length} result{sortedProducts.length === 1 ? "" : "s"}
                  </span>
                  <div className="h-6 w-px bg-[#E2E8F0] hidden sm:block" />
                  <div className="relative group">
                     <select
                       value={sortBy}
                       onChange={(event) => updateParams({ sort: event.target.value })}
                       className="appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-4 pr-10 py-2.5 text-sm text-[#0A1628] outline-none hover:border-[#CBD5E1] focus:border-[#0A4D3C] focus:ring-1 focus:ring-[#0A4D3C] transition-all cursor-pointer font-bold shadow-sm"
                     >
                       {sortOptions.map((option) => (
                         <option key={option.value} value={option.value}>
                           {option.label}
                         </option>
                       ))}
                     </select>
                     <SlidersHorizontal className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none group-hover:text-[#0A1628] transition-colors" />
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex min-h-[400px] items-center justify-center text-[#6B7B94]">
                  <div className="text-center">
                    <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0A4D3C]" />
                    <span className="text-sm font-bold text-[#0A4D3C]">Loading products...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#0A4D3C]/20 bg-[#F4F8F6] px-6 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4F0]">
                    <Search className="h-7 w-7 text-[#0A4D3C]" />
                  </div>
                  <h3 className="font-sans text-lg font-black text-[#0A4D3C]">No products found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[#7C9A90] font-medium">
                    Try broader terms or grocery names like rice, milk, atta, or dal.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      updateParams({
                        q: null,
                        sub: null,
                        trending: null,
                        sort: "featured",
                      })
                    }
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#0A4D3C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0E5E4A] transition-colors shadow-sm"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 animate-scale-in">
                  {sortedProducts.map((product) => (
                    <ProductCard key={`${product.id}-${product.primaryVariant?.id || "single"}`} product={product} />
                  ))}
                </div>
              )}
        </motion.div>
      )}
    </div>
  );
}
