import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  ChevronRight,
  Grid3X3,
  Layers,
  LayoutGrid,
  LoaderCircle,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { CategoryCard } from "./CategoryCard";
import { ProductCard } from "./ProductCard";
import { getCategoryHref, sortProducts } from "../lib/storefrontUtils";
import {
  getBestSellerProducts,
  getCategories,
  getCategoryById,
  getProducts,
  getSubcategories,
  getTrendingProducts,
} from "../data/storefrontData";
import type { Category, Product, ProductSort, SubCategory } from "../types/storefront";

/* Soft pastel accent colours for category cards */
const CATEGORY_COLORS = [
  "#FFF5E6", "#E8F5E9", "#FFF3E0", "#E3F2FD", "#FDE8E8",
  "#F3E8FF", "#E0F7FA", "#FFF9C4", "#FCE4EC", "#E8EAF6",
  "#E0F2F1", "#FBE9E7",
];

interface CatalogExperienceProps {
  fixedCategoryId?: number;
  categorySlug?: string;
  title?: string;
  subtitle?: string;
}

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
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

export function CatalogExperience({ fixedCategoryId, categorySlug, title, subtitle }: CatalogExperienceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [allShopProducts, setAllShopProducts] = useState<Product[]>([]);
  const [shopProductsLoading, setShopProductsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subSearch, setSubSearch] = useState("");

  const activeCategoryId =
    fixedCategoryId ??
    numberFromParam(searchParams.get("category") || searchParams.get("categoryId"));

  const resolvedCategoryId = useMemo(() => {
    if (activeCategoryId) return activeCategoryId;
    const target = (categorySlug || searchParams.get("category") || searchParams.get("categoryId") || "")
      .toLowerCase()
      .trim();
    if (!target) return undefined;
    const cleanTarget = target.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const found = categories.find((c) => {
      const slugified = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return (
        String(c.id) === target ||
        slugified === target ||
        slugified === cleanTarget ||
        c.name.toLowerCase() === target ||
        (cleanTarget.includes("agri") && slugified.includes("agri"))
      );
    });
    return found?.id;
  }, [activeCategoryId, categorySlug, searchParams, categories]);

  const effectiveCategoryId = activeCategoryId ?? resolvedCategoryId;
  const activeSubCategoryId = numberFromParam(searchParams.get("sub"));
  const keyword = searchParams.get("q") || "";
  const trending = searchParams.get("trending") === "1";
  const requestedSort = searchParams.get("sort") as ProductSort | null;
  const sortBy =
    requestedSort && requestedSort !== "relevance"
      ? requestedSort
      : "featured";

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
    return () => { isMounted = false; };
  }, []);

  const shouldShowCategoryGrid = !effectiveCategoryId && !keyword && !activeSubCategoryId && !trending;

  /* Fetch trending + all products for the shop landing page */
  useEffect(() => {
    if (!shouldShowCategoryGrid) return;
    let isMounted = true;
    setShopProductsLoading(true);

    Promise.all([getTrendingProducts(), getBestSellerProducts(), getProducts()])
      .then(([trending, bestSellers, all]) => {
        if (!isMounted) return;
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

    if (!effectiveCategoryId) {
      setSubcategories([]);
      setCurrentCategory(null);
      setSubcategoriesLoading(false);
      return () => { isMounted = false; };
    }

    setSubcategoriesLoading(true);

    Promise.all([getCategoryById(effectiveCategoryId), getSubcategories(effectiveCategoryId)])
      .then(([category, nextSubcategories]) => {
        if (!isMounted) return;
        setCurrentCategory(category || categories.find((c) => c.id === effectiveCategoryId) || null);
        setSubcategories(nextSubcategories);
      })
      .catch((loadError: any) => {
        if (!isMounted) return;
        const fallbackCat = categories.find((c) => c.id === effectiveCategoryId) || null;
        if (fallbackCat) {
          setCurrentCategory(fallbackCat);
        } else {
          setError(loadError?.message || "Unable to load category details.");
        }
      })
      .finally(() => {
        if (isMounted) setSubcategoriesLoading(false);
      });

    return () => { isMounted = false; };
  }, [effectiveCategoryId, categories]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    getProducts({
      categoryId: effectiveCategoryId,
      subCategoryId: effectiveCategoryId ? undefined : activeSubCategoryId,
      trending: trending || undefined,
      keyword: keyword || undefined,
      limit: 100,
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
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [effectiveCategoryId, keyword, trending]);

  /* Close mobile sidebar when a subcategory is selected */
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSubCategoryId]);

  // Filter products by category
  const relatedProducts = useMemo(() => {
    if (!effectiveCategoryId) return products;
    const currentCatName = currentCategory?.name?.trim().toLowerCase();
    return products.filter((product) => {
      if (product.categoryId != null && Number(product.categoryId) === Number(effectiveCategoryId)) return true;
      if (currentCatName && product.categoryName) {
        if (product.categoryName.trim().toLowerCase() === currentCatName) return true;
      }
      return false;
    });
  }, [products, effectiveCategoryId, currentCategory]);

  // Filter by subcategory
  const subCategoryFilteredProducts = useMemo(() => {
    if (!activeSubCategoryId) return relatedProducts;
    return relatedProducts.filter((product) => {
      if (product.subCategoryId != null && Number(product.subCategoryId) === Number(activeSubCategoryId)) return true;
      const activeSub = subcategories.find((s) => s.id === activeSubCategoryId);
      if (activeSub?.name && product.subCategoryName) {
        if (product.subCategoryName.trim().toLowerCase() === activeSub.name.trim().toLowerCase()) return true;
      }
      return false;
    });
  }, [relatedProducts, activeSubCategoryId, subcategories]);

  const sortedProducts = useMemo(() => sortProducts(subCategoryFilteredProducts, sortBy), [subCategoryFilteredProducts, sortBy]);

  const visibleTitle = title || currentCategory?.name || "Shop by category";
  const visibleSubtitle =
    subtitle ||
    (currentCategory?.description
      ? currentCategory.description
      : keyword
        ? `Showing smart results for "${keyword}".`
        : "Browse categories, refine with subcategories, and compare products on one clean page.");

  const activeSubcategoryName = subcategories.find((s) => s.id === activeSubCategoryId)?.name;

  const filteredSubcategories = useMemo(() => {
    if (!subSearch.trim()) return subcategories;
    const q = subSearch.trim().toLowerCase();
    return subcategories.filter((s) => s.name.toLowerCase().includes(q));
  }, [subcategories, subSearch]);

  const subcategoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of relatedProducts) {
      if (p.subCategoryId != null) {
        counts[p.subCategoryId] = (counts[p.subCategoryId] || 0) + 1;
      } else if (p.subCategoryName) {
        const match = subcategories.find(
          (s) => s.name.trim().toLowerCase() === p.subCategoryName?.trim().toLowerCase()
        );
        if (match) {
          counts[match.id] = (counts[match.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [relatedProducts, subcategories]);

  return (
    <div className="app-shell">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 py-4 text-sm text-[#6B7B94]">
        <Link to="/" className="hover:text-[#0A1628] transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {currentCategory ? (
          <>
            <Link to="/shop" className="hover:text-[#0A1628] transition-colors">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-[#0A1628]">{currentCategory.name}</span>
            {activeSubcategoryName && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-[#0A1628]">{activeSubcategoryName}</span>
              </>
            )}
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
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-b-none sm:rounded-t-xl bg-white/40">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                </div>
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
        /* ── Category Products Layout with Sidebar ── */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pb-16"
        >
          {/* Category Page Header Banner */}
          <div className="mb-6 rounded-2xl bg-white p-6 sm:p-7 border border-[#E2E8F0] shadow-xs">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                Direct from Verified Farmers & FPOs
              </span>
              {currentCategory && (
                <span className="text-xs text-[#64748B] font-medium">
                  • {subcategories.length} subcategories • {relatedProducts.length} product{relatedProducts.length === 1 ? '' : 's'} available
                </span>
              )}
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              {currentCategory?.name || visibleTitle}
            </h1>
            {visibleSubtitle && (
              <p className="mt-2 text-sm sm:text-[15px] text-[#64748B] max-w-3xl leading-relaxed">
                {visibleSubtitle}
              </p>
            )}
          </div>

          {/* ── Mobile Subcategory Pills (visible on < lg) ── */}
          {currentCategory && (subcategoriesLoading || subcategories.length > 0) && (
            <div className="lg:hidden mb-5">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {subcategoriesLoading ? (
                  <>
                    <div className="h-10 w-24 rounded-xl bg-[#F1F5F9] animate-pulse flex-shrink-0" />
                    <div className="h-10 w-28 rounded-xl bg-[#F1F5F9] animate-pulse flex-shrink-0" />
                    <div className="h-10 w-32 rounded-xl bg-[#F1F5F9] animate-pulse flex-shrink-0" />
                  </>
                ) : (
                  <>
                    {/* "All" pill */}
                    <button
                      type="button"
                      onClick={() => updateParams({ sub: null })}
                      className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 border ${
                        !activeSubCategoryId
                          ? "bg-[#065F46] text-white border-[#065F46] shadow-xs"
                          : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#86efac] hover:text-[#065F46]"
                      }`}
                    >
                      <LayoutGrid className={`h-3.5 w-3.5 ${!activeSubCategoryId ? 'text-white' : 'text-[#64748B]'}`} />
                      All ({relatedProducts.length})
                    </button>

                    {subcategories.map((sub) => {
                      const isActive = activeSubCategoryId === sub.id;
                      const count = subcategoryCounts[sub.id] || 0;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => updateParams({ sub: String(sub.id) })}
                          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 border ${
                            isActive
                              ? "bg-[#065F46] text-white border-[#065F46] shadow-xs"
                              : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#86efac] hover:text-[#065F46]"
                          }`}
                        >
                          {sub.imageUrl ? (
                            <img
                              src={sub.imageUrl}
                              alt=""
                              className={`h-5 w-5 rounded-md object-cover flex-shrink-0 border ${isActive ? 'border-white/40' : 'border-[#E2E8F0]'}`}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#065F46]'
                            }`}>
                              {sub.name.charAt(0)}
                            </div>
                          )}
                          <span>{sub.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Main layout: Vertical Sidebar (lg+) + Products Area ── */}
          <div className="flex gap-6 items-start">

            {/* ── FULLY VERTICAL SIDEBAR (desktop/tablet ≥ lg) ── */}
            {currentCategory && (subcategoriesLoading || subcategories.length > 0) && (
              <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 sticky top-[80px] self-start">
                <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col overflow-hidden">
                  {/* Sidebar header */}
                  <div className="p-4 border-b border-[#E2E8F0] bg-[#FAFAFA]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#065F46]">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#0F172A] leading-tight">
                            Subcategories
                          </h2>
                          <p className="text-[11px] text-[#64748B] font-medium">
                            {subcategories.length} available
                          </p>
                        </div>
                      </div>
                      {activeSubCategoryId && (
                        <button
                          type="button"
                          onClick={() => updateParams({ sub: null })}
                          className="text-[11px] font-bold text-[#065F46] hover:text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] px-2 py-1 rounded-md transition-colors border border-[#A7F3D0]"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Filter input when there are multiple subcategories */}
                    {subcategories.length > 3 && (
                      <div className="mt-3 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search subcategories..."
                          value={subSearch}
                          onChange={(e) => setSubSearch(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white placeholder:text-[#94A3B8] text-[#0F172A] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {subcategoriesLoading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                          <div className="h-8 w-8 rounded-lg bg-[#F1F5F9] animate-pulse flex-shrink-0" />
                          <div className="h-4 flex-1 rounded bg-[#F1F5F9] animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <nav className="p-2 space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
                      {/* "All" option */}
                      <button
                        type="button"
                        onClick={() => updateParams({ sub: null })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                          !activeSubCategoryId
                            ? "bg-[#ECFDF5] text-[#065F46] font-bold border-l-4 border-l-[#059669] shadow-xs"
                            : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          !activeSubCategoryId ? "bg-[#065F46] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          <LayoutGrid className="h-4 w-4" />
                        </div>
                        <span className="text-xs sm:text-[13px] flex-1 truncate">
                          All {currentCategory.name}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          !activeSubCategoryId ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          {relatedProducts.length}
                        </span>
                      </button>

                      {/* Subcategory list */}
                      {filteredSubcategories.length === 0 ? (
                        <div className="py-6 px-3 text-center text-xs text-[#94A3B8]">
                          No subcategories match "{subSearch}"
                        </div>
                      ) : (
                        filteredSubcategories.map((sub) => {
                          const isActive = activeSubCategoryId === sub.id;
                          const count = subcategoryCounts[sub.id] || 0;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => updateParams({ sub: String(sub.id) })}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                                isActive
                                  ? "bg-[#ECFDF5] text-[#065F46] font-bold border-l-4 border-l-[#059669] shadow-xs"
                                  : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium"
                              }`}
                            >
                              {/* Sub image or icon */}
                              <div className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border transition-all ${
                                isActive
                                  ? "border-[#A7F3D0] bg-white shadow-xs"
                                  : "border-[#E2E8F0] bg-[#F8FAFC]"
                              }`}>
                                {sub.imageUrl ? (
                                  <img
                                    src={sub.imageUrl}
                                    alt={sub.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.style?.setProperty("display", "flex");
                                    }}
                                  />
                                ) : null}
                                <span className={`${sub.imageUrl ? "hidden" : "flex"} h-full w-full items-center justify-center text-[11px] font-bold uppercase ${
                                  isActive ? "text-[#065F46]" : "text-[#94A3B8]"
                                }`}>
                                  {sub.name.charAt(0)}
                                </span>
                              </div>

                              <span className="text-xs sm:text-[13px] flex-1 truncate">
                                {sub.name}
                              </span>

                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                isActive ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F1F5F9] text-[#64748B]"
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </nav>
                  )}

                  {/* Bottom B2B RFQ Banner */}
                  <div className="p-4 border-t border-[#E2E8F0] bg-[#FAFAFA] mt-auto">
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="p-1.5 rounded-md bg-[#065F46] text-white flex-shrink-0 mt-0.5">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">Need Bulk Quantities?</p>
                        <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">
                          Request direct wholesale quotes from verified suppliers.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/rfq"
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#065F46] hover:bg-[#047857] text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      Post Buy Requirement (RFQ)
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </aside>
            )}

            {/* ── RIGHT: Products Area ── */}
            <div className="flex-1 min-w-0">
              {/* Sort + count toolbar */}
              <div className="flex flex-wrap items-center justify-between mb-4 gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-semibold text-[#475569]">
                    {isLoading ? (
                      <span className="flex items-center gap-1.5 text-[#64748B]">
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        Loading products...
                      </span>
                    ) : (
                      <>
                        <span className="font-extrabold text-[#0F172A]">{sortedProducts.length}</span>{" "}
                        product{sortedProducts.length === 1 ? "" : "s"} found
                        {activeSubcategoryName && (
                          <span className="text-[#64748B] font-normal">
                            {" "}in <span className="text-[#065F46] font-semibold">{activeSubcategoryName}</span>
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  {activeSubCategoryId && (
                    <button
                      type="button"
                      onClick={() => updateParams({ sub: null })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 rounded-full hover:bg-[#D1FAE5] transition-colors"
                    >
                      <span>{activeSubcategoryName}</span>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] hidden sm:inline font-medium">Sort:</span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => updateParams({ sort: e.target.value })}
                      className="appearance-none rounded-lg border border-[#E2E8F0] bg-white pl-3 pr-8 py-1.5 text-xs font-semibold text-[#0F172A] outline-none hover:border-[#CBD5E1] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all cursor-pointer shadow-xs"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Products Grid or Empty State */}
              {isLoading ? (
                <div className="flex min-h-[400px] items-center justify-center text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
                  <div className="text-center">
                    <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-[#065F46]" />
                    <span className="text-sm font-bold text-[#065F46]">Loading products...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
                    <Package className="h-8 w-8" />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-[#0F172A]">
                    {activeSubCategoryId
                      ? `No products in ${activeSubcategoryName || "this subcategory"}`
                      : currentCategory
                        ? `Products not currently listed in ${currentCategory.name}`
                        : "No products found"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B] leading-relaxed">
                    {activeSubCategoryId
                      ? "Suppliers have not listed products under this subcategory yet. You can view all category products or submit a bulk purchase requirement."
                      : "Verified farmers and suppliers are continuously adding fresh inventory. Post a requirement to receive direct bids or explore other categories."}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {activeSubCategoryId && (
                      <button
                        type="button"
                        onClick={() => updateParams({ sub: null })}
                        className="inline-flex items-center justify-center rounded-xl bg-[#065F46] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#047857] transition-colors shadow-xs"
                      >
                        View all {currentCategory?.name || "products"}
                      </button>
                    )}
                    <Link
                      to="/rfq"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#065F46] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#047857] transition-colors shadow-xs"
                    >
                      Post Buy Requirement (RFQ)
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to="/shop"
                      className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-xs font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-xs"
                    >
                      Browse all categories
                    </Link>
                  </div>

                  {/* Explore other categories row */}
                  {categories.length > 1 && (
                    <div className="mt-10 pt-6 border-t border-[#E2E8F0]">
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">
                        Explore other categories
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {categories
                          .filter((c) => c.id !== effectiveCategoryId)
                          .slice(0, 6)
                          .map((cat) => (
                            <Link
                              key={cat.id}
                              to={getCategoryHref(cat)}
                              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] hover:bg-[#ECFDF5] hover:border-[#A7F3D0] hover:text-[#065F46] text-xs font-semibold text-[#475569] transition-all"
                            >
                              {cat.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 animate-scale-in">
                  {sortedProducts.map((product) => (
                    <ProductCard
                      key={`${product.id}-${product.primaryVariant?.id || "single"}`}
                      product={product}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
