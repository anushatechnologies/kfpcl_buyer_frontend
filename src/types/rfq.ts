export type RFQStatus =
  | 'draft'
  | 'submitted'
  | 'responded'
  | 'open'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'closed'
  | 'expired'
  | 'OPEN'
  | 'SUBMITTED'
  | 'RESPONDED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CLOSED'
  | 'EXPIRED';

export interface Quote {
  id: string;
  rfqId?: string;
  sellerId?: string;
  sellerName?: string;
  sellerCompany?: string;
  amount?: number;
  offeredPrice?: number;
  unitPrice?: number;
  totalPrice?: number;
  currency?: string;
  deliveryDate?: string;
  leadTime?: string;
  validUntil?: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  createdAt?: string;
}

export interface RFQ {
  id: string;
  rfqCode?: string;
  title: string;
  description: string;
  targetPrice?: number;
  quantity: number;
  unit: string;
  requiredByDate?: string;
  status: RFQStatus;
  quotes: Quote[];
  createdAt: string;
  // Convenience fields for backwards compatibility and direct response mapping
  amount?: number;
  quotedPrice?: number;
  leadTime?: string;
  deliveryDays?: number | string;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerCompany?: string;
  productName?: string;
  productCategory?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  specifications?: string;
  attachments?: string[];
  currency?: string;
  expiresAt?: string;
  buyerMessage?: string;
  response?: Quote | null;
  contact?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  } | null;
}

export interface CreateRFQPayload {
  title: string;
  description: string;
  targetPrice?: number;
  quantity: number | string;
  unit: string;
  requiredByDate?: string;
  // Aliases and backend fields
  subject?: string;
  buyerMessage?: string;
  productName?: string;
  productCategory?: string;
  productId?: string | number;
  email?: string;
  buyerName?: string;
  buyerPhone?: string;
  deliveryLocation?: string;
  deliveryDate?: string;
  specifications?: string;
}

export interface PaginatedRFQs {
  rfqs: RFQ[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}
