export interface ProductVariant {
  id: string;
  name?: string;
  variantName?: string;
  sku: string;
  weight?: number;
  unit?: string;
  price: number;
  mrp?: number;
  discountPrice?: number;
  stock: number;
  stockQuantity?: number;
  displayOrder?: number;
  active?: boolean;
  available?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  category: string;
  subCategory?: string;
  price: number;
  mrp?: number;
  minOrderQty: number;
  unit: string;
  currency?: string;
  images: string[];
  seller: {
    id: string;
    name: string;
    company?: string;
    location: string;
    rating: number;
    verified: boolean;
  };
  priceTiers?: { minQuantity: number; price: number }[];
  specifications?: Record<string, string>;
  certifications?: string[];
  inStock: boolean;
  leadTime?: string;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  origin?: string;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minOrderQty?: number;
  inStock?: boolean;
  verified?: boolean;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rating';
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
