import apiClient from './client';
import { Product, ProductFilter, ProductListResponse, ProductVariant } from '@/types/product';

// Helper to normalize backend DTO to Product model
function mapProductDto(dto: any): Product {
  if (!dto) return {} as Product;

  const rawVariants = dto.variants || [];
  const mappedVariants: ProductVariant[] = Array.isArray(rawVariants)
    ? rawVariants.map((v: any, index: number) => ({
        id: v.id || `var-${index + 1}`,
        productId: dto.id,
        name: v.variantName || v.name || '',
        sku: v.sku || '',
        price: typeof v.price === 'number' ? v.price : Number(v.mrp) || 0,
        discountPrice: typeof v.discountPrice === 'number' ? v.discountPrice : typeof v.price === 'number' ? v.price : undefined,
        stock: typeof v.stockQuantity === 'number' ? v.stockQuantity : typeof v.stock === 'number' ? v.stock : 0,
        displayOrder: v.displayOrder || index + 1,
        active: v.active !== false,
      }))
    : [];

  const images: string[] = dto.imageUrl
    ? [dto.imageUrl]
    : Array.isArray(dto.images) && dto.images.length > 0
    ? dto.images
    : ['/images/products/placeholder.jpg'];

  return {
    id: String(dto.id || ''),
    name: dto.productName || dto.name || dto.title || '',
    description: dto.description || '',
    category: dto.categoryName || dto.categoryId || dto.category || '',
    subCategory: dto.subcategoryName || dto.subcategoryId || dto.subCategory || '',
    price: typeof dto.price === 'number' ? dto.price : Number(dto.mrp) || 0,
    mrp: typeof dto.mrp === 'number' ? dto.mrp : undefined,
    unit: dto.unit || 'kg',
    minOrderQty: dto.minOrderQty || 1,
    images: images,
    seller: dto.seller || {
      id: dto.sellerId || 'seller-1',
      name: dto.sellerName || 'Karthikeya Farmer Producer Company Limited Verified Supplier',
      company: dto.storeName || dto.sellerCompany || 'Karthikeya Farmer Producer Company Limited',
      location: dto.sellerLocation || 'India',
      rating: dto.sellerRating || 4.8,
      verified: true,
    },
    inStock: dto.stockQuantity !== undefined ? dto.stockQuantity > 0 : dto.inStock ?? true,
    variants: mappedVariants.length > 0 ? mappedVariants : undefined,
    priceTiers: dto.priceTiers,
    rating: dto.rating || 4.8,
    reviewCount: dto.reviewCount || 0,
    origin: dto.origin || 'India',
    specifications: dto.specifications || {},
    certifications: dto.certifications || ['APEDA', 'FSSAI'],
    tags: dto.tags || ['Export Quality'],
    leadTime: dto.leadTime || '3-5 days',
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
  };
}

function parseProductList(rawData: any, defaultLimit: number = 12): ProductListResponse {
  let list: any[] = [];
  let total = 0;
  let page = 1;
  let limit = defaultLimit;
  let totalPages = 1;

  if (Array.isArray(rawData)) {
    list = rawData;
    total = rawData.length;
  } else if (rawData?.content && Array.isArray(rawData.content)) {
    list = rawData.content;
    total = rawData.totalElements || rawData.content.length;
    // Catalog responses use `number`, while seller-product responses use `page`.
    page = Number(rawData.number ?? rawData.page ?? 0) + 1;
    limit = rawData.size || limit;
    totalPages = rawData.totalPages || 1;
  } else if (rawData?.products && Array.isArray(rawData.products)) {
    list = rawData.products;
    total = rawData.total || rawData.products.length;
    page = rawData.page || 1;
    limit = rawData.limit || limit;
    totalPages = rawData.totalPages || 1;
  } else if (rawData?.data && Array.isArray(rawData.data)) {
    list = rawData.data;
    total = rawData.data.length;
  }

  const mappedProducts = list.map(mapProductDto);

  return {
    products: mappedProducts,
    total: total || mappedProducts.length,
    page: page,
    limit: limit,
    totalPages: totalPages,
  };
}

export const productsApi = {
  /**
   * 🛍️ Catalog & Products
   * GET /api/buyer/products - List all active products (Search, filter by category/price/brand)
   */
  getProducts: async (filters?: ProductFilter): Promise<ProductListResponse> => {
    try {
      const params: Record<string, any> = {};
      if (filters?.search) params.query = filters.search;
      if (filters?.category && filters.category !== 'all') params.categoryId = filters.category;
      if (filters?.minPrice !== undefined) params.minPrice = filters.minPrice;
      if (filters?.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
      if (filters?.page !== undefined) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      let response: any;
      try {
        if (filters?.search && !filters?.category && filters?.minPrice === undefined && filters?.maxPrice === undefined) {
          response = await apiClient.get('/api/buyer/products/search', { params: { query: filters.search } });
        } else {
          response = await apiClient.get('/api/buyer/products', { params });
        }
      } catch {
        try {
          response = await apiClient.get('/api/products', { params });
        } catch {
          response = await apiClient.get('/api/admin/products', { params });
        }
      }

      let rawData = response.data?.data || response.data;
      let parsed = parseProductList(rawData, filters?.limit || 12);

      if (filters?.search) {
        const q = filters.search.trim().toLowerCase();
        parsed.products = parsed.products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
        );
        parsed.total = parsed.products.length;
      }

      // If buyer returned empty products, check general / admin products so newly created Admin products appear immediately (only if not searching)
      if (parsed.products.length === 0 && !filters?.search) {
        try {
          const altResponse = await apiClient.get('/api/products', { params });
          const altData = altResponse.data?.data || altResponse.data;
          const altParsed = parseProductList(altData, filters?.limit || 12);
          if (altParsed.products.length > 0) return altParsed;
        } catch {}

        try {
          const adminResponse = await apiClient.get('/api/admin/products', { params });
          const adminData = adminResponse.data?.data || adminResponse.data;
          const adminParsed = parseProductList(adminData, filters?.limit || 12);
          if (adminParsed.products.length > 0) return adminParsed;
        } catch {}
      }

      return parsed;
    } catch (error) {
      console.error('Failed to get products', error);
      return { products: [], total: 0, page: 1, limit: filters?.limit || 12, totalPages: 1 };
    }
  },

  getAllProducts: async (
    filters?: Omit<ProductFilter, 'page' | 'limit'>
  ): Promise<ProductListResponse> => {
    const firstPage = await productsApi.getProducts({ ...filters, page: 1, limit: 100 });

    if (firstPage.totalPages <= 1) {
      return firstPage;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        productsApi.getProducts({ ...filters, page: index + 2, limit: 100 })
      )
    );
    const products = [
      ...firstPage.products,
      ...remainingPages.flatMap((page) => page.products),
    ];

    return {
      products,
      total: firstPage.total || products.length,
      page: 1,
      limit: products.length,
      totalPages: 1,
    };
  },

  /**
   * GET /api/buyer/products/{id} - Get full details of a single product
   */
  getProductById: async (id: string): Promise<Product> => {
    try {
      const response = await apiClient.get<any>(`/api/buyer/products/${id}`);
      const rawData = response.data?.data || response.data;
      if (rawData && (rawData.id || rawData.name)) return mapProductDto(rawData);
      throw new Error('Not found in buyer');
    } catch {
      try {
        const response = await apiClient.get<any>(`/api/products/${id}`);
        const rawData = response.data?.data || response.data;
        if (rawData && (rawData.id || rawData.name)) return mapProductDto(rawData);
        throw new Error('Not found in products');
      } catch {
        const response = await apiClient.get<any>(`/api/admin/products/${id}`);
        const rawData = response.data?.data || response.data;
        return mapProductDto(rawData);
      }
    }
  },

  /**
   * 🏬 Seller Products
   * GET /api/admin/products or /api/products
   */
  getSellerProducts: async (sellerId?: string): Promise<Product[]> => {
    try {
      const pageSize = 100;
      const params: any = {
        page: 0,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'DESC',
      };
      if (sellerId && String(sellerId).startsWith('seller_')) {
        params.sellerId = sellerId;
      }
      const requestConfig = {
        params,
        headers: { 'Cache-Control': 'no-cache' },
      };

      let firstResponse: any;
      try {
        firstResponse = await apiClient.get<any>('/api/admin/products', requestConfig);
      } catch {
        try {
          firstResponse = await apiClient.get<any>('/api/products', requestConfig);
        } catch {
          firstResponse = await apiClient.get<any>('/seller/products', requestConfig);
        }
      }

      const firstPage = parseProductList(firstResponse.data?.data || firstResponse.data, pageSize);

      if (firstPage.totalPages <= 1) {
        return firstPage.products;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          apiClient.get<any>('/api/admin/products', {
            ...requestConfig,
            params: { ...params, page: index + 1 },
          }).catch(() =>
            apiClient.get<any>('/api/products', {
              ...requestConfig,
              params: { ...params, page: index + 1 },
            })
          )
        )
      );

      return [
        ...firstPage.products,
        ...remainingPages.flatMap((response) =>
          parseProductList(response.data?.data || response.data, pageSize).products
        ),
      ];
    } catch (err) {
      console.error('Failed to get seller products', err);
      return [];
    }
  },

  /**
   * GET /api/admin/products/{id} - Get details of a specific seller/admin product
   */
  getSellerProductById: async (id: string): Promise<Product> => {
    try {
      const response = await apiClient.get<any>(`/api/admin/products/${id}`);
      const rawData = response.data?.data || response.data;
      return mapProductDto(rawData);
    } catch {
      try {
        const response = await apiClient.get<any>(`/api/products/${id}`);
        const rawData = response.data?.data || response.data;
        return mapProductDto(rawData);
      } catch {
        const response = await apiClient.get<any>(`/seller/products/${id}`);
        const rawData = response.data?.data || response.data;
        return mapProductDto(rawData);
      }
    }
  },

  /**
   * POST /api/admin/products - Submit a new product
   */
  createProduct: async (product: any): Promise<Product> => {
    const firstVariant = product.variants?.[0];
    const rawSku = product.sku || firstVariant?.sku;
    const topSku =
      rawSku && rawSku !== 'WF-1KG-SKU'
        ? rawSku
        : `SKU-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const sellerId = product.sellerId && String(product.sellerId).startsWith('seller_')
      ? product.sellerId
      : 'seller_1';

    const payload = {
      sellerId: sellerId,
      sku: topSku,
      sellerLocation: product.sellerLocation || product.location,
      sellerCompany: product.sellerCompany || product.companyName || product.company,
      location: product.sellerLocation || product.location,
      companyName: product.sellerCompany || product.companyName || product.company,
      productName: product.name || product.productName,
      title: product.name || product.productName,
      categoryId: product.categoryId || product.category,
      subcategoryId: product.subcategoryId || product.subCategory,
      measurementType: product.measurementType || 'SOLID',
      unit: product.unit || 'kg',
      price: typeof product.price === 'number' ? product.price : firstVariant?.price || 0,
      mrp: typeof product.mrp === 'number' ? product.mrp : firstVariant?.mrp || product.price || 0,
      stockQuantity: product.stockQuantity ?? 100,
      description: product.description || '',
      imageUrl: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.imageUrl,
      images: Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : [],
      variants: Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map((v: any, index: number) => {
            const varSku = v.sku && v.sku !== 'WF-1KG-SKU' ? v.sku : `${topSku}-${index + 1}`;
            return {
              id: v.id && !v.id.startsWith('var-') ? v.id : undefined,
              variantName: v.name || v.variantName || `Pack ${index + 1}`,
              sku: varSku,
              mrp: Number(v.mrp || v.price || 0),
              price: Number(v.discountPrice || v.price || 0),
              stockQuantity: Number(v.stock || v.stockQuantity || 0),
              displayOrder: v.displayOrder || index + 1,
              active: v.active !== false,
            };
          })
        : undefined,
    };

    let response: any;
    try {
      response = await apiClient.post<any>('/api/admin/products', payload);
    } catch {
      try {
        response = await apiClient.post<any>('/api/products', payload);
      } catch {
        response = await apiClient.post<any>('/seller/products', payload);
      }
    }
    return mapProductDto(response.data?.data || response.data);
  },

  // Update Product
  updateProduct: async (id: string, product: any): Promise<Product> => {
    const payload = {
      productName: product.name || product.productName,
      categoryId: product.category || product.categoryId,
      subcategoryId: product.subCategory || product.subcategoryId,
      unit: product.unit,
      price: product.price,
      mrp: product.mrp,
      description: product.description,
      variants: Array.isArray(product.variants)
        ? product.variants.map((v: any, index: number) => ({
            id: v.id && !v.id.startsWith('var-') ? v.id : undefined,
            variantName: v.name || v.variantName,
            sku: v.sku,
            mrp: Number(v.mrp || v.price || 0),
            price: Number(v.discountPrice || v.price || 0),
            stockQuantity: Number(v.stock || v.stockQuantity || 0),
            displayOrder: v.displayOrder || index + 1,
            active: v.active !== false,
          }))
        : undefined,
    };

    try {
      const response = await apiClient.put<any>(`/api/admin/products/${id}`, payload);
      return mapProductDto(response.data?.data || response.data);
    } catch {
      try {
        const response = await apiClient.put<any>(`/api/products/${id}`, payload);
        return mapProductDto(response.data?.data || response.data);
      } catch {
        const response = await apiClient.put<any>(`/seller/products/${id}`, payload);
        return mapProductDto(response.data?.data || response.data);
      }
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/admin/products/${id}`);
    } catch {
      try {
        await apiClient.delete(`/api/products/${id}`);
      } catch {
        await apiClient.delete(`/seller/products/${id}`);
      }
    }
  },

  getSupplierStorefront: async (sellerId: string): Promise<any> => {
    try {
      const response = await apiClient.get<any>(`/api/stores/${sellerId}`);
      return response.data?.data || response.data;
    } catch {
      const response = await apiClient.get<any>(`/suppliers/${sellerId}`);
      return response.data?.data || response.data;
    }
  },

  toggleFavorite: async (productId: string): Promise<any> => {
    try {
      const response = await apiClient.post<any>('/api/customer/products/wishlist', {
        productId: Number(productId) || 1,
        buyerId: 1,
      });
      return response.data;
    } catch {
      const response = await apiClient.post<any>(`/buyer/favorites/${productId}`);
      return response.data;
    }
  },
};
