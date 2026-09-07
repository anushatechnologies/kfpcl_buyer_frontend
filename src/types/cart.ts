export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  seller: string;
  unitPrice: number;
  variantId?: string;
  quantity: number;
  unit: string;
  minOrderQty: number;
}

export interface BackendCartItem {
  id?: string;
  productId: string;
  productName?: string;
  variantId?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  imageUrl?: string;
  unit?: string;
}

export interface BackendCart {
  id?: string;
  buyerId?: string;
  items: BackendCartItem[];
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

