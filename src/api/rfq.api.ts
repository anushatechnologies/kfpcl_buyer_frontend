import apiClient from './client';
import { RFQ, CreateRFQPayload, Quote, PaginatedRFQs } from '@/types/rfq';

function parseQuantity(value: unknown): { amount: number; unit: string } {
  if (typeof value === 'number') return { amount: value, unit: '' };

  const text = String(value ?? '').trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  return {
    amount: match ? Number(match[1]) : 1,
    unit: match?.[2]?.trim() || '',
  };
}

function parseNumericPrice(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    const num = Number(cleaned);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return undefined;
}

function extractPrice(dto: any): number {
  if (!dto) return 0;
  const found =
    parseNumericPrice(dto.amount) ??
    parseNumericPrice(dto.unitPrice) ??
    parseNumericPrice(dto.offeredPrice) ??
    parseNumericPrice(dto.price) ??
    parseNumericPrice(dto.quotedPrice) ??
    parseNumericPrice(dto.quotedAmount) ??
    parseNumericPrice(dto.totalPrice) ??
    parseNumericPrice(dto.totalAmount) ??
    parseNumericPrice(dto.quoteAmount) ??
    parseNumericPrice(dto.rate) ??
    parseNumericPrice(dto.cost) ??
    parseNumericPrice(dto.bidPrice) ??
    parseNumericPrice(dto.offerPrice) ??
    parseNumericPrice(dto.adminAmount) ??
    parseNumericPrice(dto.adminPrice) ??
    parseNumericPrice(dto.unit_price) ??
    parseNumericPrice(dto.offered_price) ??
    parseNumericPrice(dto.total_price) ??
    parseNumericPrice(dto.total_amount) ??
    parseNumericPrice(dto.quote_amount) ??
    parseNumericPrice(dto.quoted_price) ??
    parseNumericPrice(dto.quoted_amount) ??
    parseNumericPrice(dto.quotation?.amount) ??
    parseNumericPrice(dto.quotation?.unitPrice) ??
    parseNumericPrice(dto.quotation?.offeredPrice) ??
    parseNumericPrice(dto.quotation?.price) ??
    parseNumericPrice(dto.quote?.amount) ??
    parseNumericPrice(dto.quote?.unitPrice) ??
    parseNumericPrice(dto.quote?.offeredPrice) ??
    parseNumericPrice(dto.quote?.price) ??
    parseNumericPrice(dto.adminQuote?.amount) ??
    parseNumericPrice(dto.adminQuote?.unitPrice) ??
    parseNumericPrice(dto.adminQuote?.offeredPrice) ??
    parseNumericPrice(dto.adminQuotation?.amount) ??
    parseNumericPrice(dto.adminQuotation?.unitPrice);

  return found ?? 0;
}

function parseLeadTime(dto: any): string | undefined {
  if (!dto) return undefined;

  const raw =
    dto.leadTime ??
    dto.lead_time ??
    dto.deliveryDays ??
    dto.delivery_days ??
    dto.deliveryTimeline ??
    dto.delivery_timeline ??
    dto.deliveryTime ??
    dto.delivery_time ??
    dto.deliveryPeriod ??
    dto.delivery_period ??
    dto.leadDays ??
    dto.lead_days ??
    dto.leadTimeDays ??
    dto.lead_time_days ??
    dto.days ??
    dto.timeline ??
    dto.duration ??
    dto.expectedDeliveryDays ??
    dto.adminLeadTime ??
    dto.quotation?.leadTime ??
    dto.quotation?.deliveryDays ??
    dto.quote?.leadTime ??
    dto.quote?.deliveryDays ??
    dto.adminQuote?.leadTime ??
    dto.adminQuote?.deliveryDays ??
    dto.adminQuotation?.leadTime ??
    dto.adminQuotation?.deliveryDays;

  if (raw === undefined || raw === null || raw === '') return undefined;

  const str = String(raw).trim();
  if (!str) return undefined;

  // If pure number like 7 or "7", format as "7 days"
  if (/^\d+$/.test(str)) {
    const n = Number(str);
    return `${n} ${n === 1 ? 'day' : 'days'}`;
  }

  return str;
}

function mapQuoteDto(dto: any, rfqId?: string): Quote {
  if (!dto) return {} as Quote;
  const offeredPrice = extractPrice(dto);
  const quantity = parseQuantity(dto.quantity ?? dto.rfqQuantity ?? 1).amount;
  const leadTime = parseLeadTime(dto);

  const rawTotal =
    parseNumericPrice(dto.totalPrice) ??
    parseNumericPrice(dto.totalAmount) ??
    parseNumericPrice(dto.total_price) ??
    parseNumericPrice(dto.total_amount) ??
    (offeredPrice > 0 ? offeredPrice * (quantity || 1) : 0);

  const notes =
    dto.notes ||
    dto.comment ||
    dto.message ||
    dto.adminMessage ||
    dto.sellerMessage ||
    dto.replyMessage ||
    dto.responseMessage ||
    dto.adminNotes ||
    dto.sellerNotes ||
    dto.remarks ||
    '';

  return {
    id: String(dto.id || dto.quoteId || `quote-${Date.now()}`),
    rfqId: String(rfqId || dto.rfqId || ''),
    sellerId: dto.sellerId ? String(dto.sellerId) : undefined,
    sellerName: dto.sellerName || dto.adminName || dto.seller?.name || dto.admin?.name || 'Admin',
    sellerCompany: dto.sellerCompany || dto.adminCompany || dto.seller?.companyName || dto.seller?.company || 'KFPCL Admin',
    amount: offeredPrice,
    offeredPrice: offeredPrice,
    unitPrice: offeredPrice,
    totalPrice: rawTotal,
    currency: dto.currency || 'INR',
    deliveryDate: dto.deliveryDate || dto.expectedDeliveryDate || dto.delivery_date || '',
    leadTime: leadTime,
    validUntil: dto.validUntil || dto.validTill || dto.expiryDate || '',
    notes: notes,
    status: dto.status ? String(dto.status).toLowerCase() : 'pending',
    createdAt: dto.createdAt || dto.updatedAt || new Date().toISOString(),
  };
}

function mapRFQDto(dto: any): RFQ {
  if (!dto) return {} as RFQ;
  // Support both flat DTO and nested { rfq: {...}, quotes: [...] }
  const rfqObj = dto.rfq || dto;

  const responseRaw =
    rfqObj.response ??
    dto.response ??
    rfqObj.quotation ??
    dto.quotation ??
    rfqObj.adminQuotation ??
    dto.adminQuotation ??
    rfqObj.quote ??
    dto.quote ??
    rfqObj.adminQuote ??
    dto.adminQuote ??
    rfqObj.adminReply ??
    dto.adminReply ??
    rfqObj.supplierReply ??
    dto.supplierReply ??
    rfqObj.reply ??
    dto.reply ??
    null;

  let quotesRaw: any[] =
    dto.quotes ||
    rfqObj.quotes ||
    rfqObj.quotations ||
    dto.quotations ||
    rfqObj.bids ||
    dto.bids ||
    (responseRaw ? [responseRaw] : []);

  // If quotesRaw is empty, check if rfqObj itself contains reply/quote fields (flat DTO from backend)
  const rfqPrice = extractPrice(rfqObj);
  const rfqLeadTime = parseLeadTime(rfqObj);
  const isRespondedStatus = ['responded', 'quoted', 'accepted'].includes(
    String(rfqObj.status || dto.status || '').toLowerCase()
  );

  if ((!Array.isArray(quotesRaw) || quotesRaw.length === 0) && (rfqPrice > 0 || rfqLeadTime !== undefined || isRespondedStatus)) {
    if (rfqPrice > 0 || rfqLeadTime !== undefined) {
      quotesRaw = [rfqObj];
    }
  }

  const rfqId = String(rfqObj.id || rfqObj.rfqId || dto.id || '');
  const product = rfqObj.product || dto.product || {};
  const parsedQuantity = parseQuantity(rfqObj.quantity);

  const mappedQuotes = Array.isArray(quotesRaw)
    ? quotesRaw.map((q: any) => mapQuoteDto(q, rfqId))
    : [];

  const response = responseRaw
    ? mapQuoteDto(responseRaw, rfqId)
    : mappedQuotes[0] || null;

  const rawContact =
    rfqObj.contactDetails ||
    rfqObj.contact ||
    rfqObj.adminContact ||
    responseRaw?.contactDetails ||
    responseRaw?.contact ||
    null;

  // Compute final amount and leadTime directly on RFQ for direct access
  const finalAmount = response?.amount ?? response?.offeredPrice ?? rfqPrice;
  const finalLeadTime = response?.leadTime ?? rfqLeadTime;

  return {
    id: rfqId,
    rfqCode: rfqObj.rfqCode || rfqObj.code || undefined,
    title: product.name || rfqObj.title || rfqObj.productName || rfqObj.rfqNumber || 'Quotation Request',
    description: rfqObj.buyerMessage || rfqObj.description || rfqObj.specifications || '',
    targetPrice: rfqObj.targetPrice !== undefined && rfqObj.targetPrice !== null ? Number(rfqObj.targetPrice) : undefined,
    quantity: parsedQuantity.amount,
    unit: rfqObj.unit || parsedQuantity.unit || 'kg',
    requiredByDate: rfqObj.requiredByDate || rfqObj.deliveryDate || rfqObj.deadline,
    status: (rfqObj.status ? String(rfqObj.status).toLowerCase() : (mappedQuotes.length > 0 ? 'responded' : 'submitted')) as any,
    quotes: mappedQuotes,
    createdAt: rfqObj.createdAt || new Date().toISOString(),
    amount: finalAmount,
    quotedPrice: finalAmount,
    leadTime: finalLeadTime,
    deliveryDays: rfqObj.deliveryDays ?? rfqObj.delivery_days,
    // Backward compatibility aliases
    buyerId: rfqObj.buyerId ? String(rfqObj.buyerId) : undefined,
    buyerName: rfqObj.buyerName || 'Verified Buyer',
    buyerCompany: rfqObj.buyerCompany || rfqObj.company || 'Global Import Corp',
    productName: product.name || rfqObj.title || rfqObj.productName || '',
    productCategory: rfqObj.categoryId || rfqObj.productCategory || 'General',
    deliveryDate: rfqObj.requiredByDate || rfqObj.deliveryDate || rfqObj.deadline,
    deliveryLocation: rfqObj.deliveryLocation || 'India',
    specifications: rfqObj.buyerMessage || rfqObj.description || rfqObj.specifications || '',
    currency: rfqObj.currency || 'INR',
    expiresAt: rfqObj.deadline || rfqObj.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
    buyerMessage: rfqObj.buyerMessage || undefined,
    response,
    contact: rawContact
      ? {
          name: rawContact.name || rawContact.contactName || undefined,
          company: rawContact.company || rawContact.companyName || undefined,
          email: rawContact.email || rawContact.contactEmail || undefined,
          phone: rawContact.phone || rawContact.phoneNumber || rawContact.contactPhone || undefined,
        }
      : null,
  };
}


function extractPaginatedData(responseData: any, page: number, size: number): PaginatedRFQs {
  const payload = responseData?.data || responseData;

  if (Array.isArray(payload)) {
    const rfqs = payload.map(mapRFQDto);
    return {
      rfqs,
      totalPages: Math.ceil(rfqs.length / size) || 1,
      totalElements: rfqs.length,
      currentPage: page,
      pageSize: size,
    };
  }

  if (payload && Array.isArray(payload.content)) {
    return {
      rfqs: payload.content.map(mapRFQDto),
      totalPages: payload.totalPages ?? Math.ceil((payload.totalElements || payload.content.length) / size),
      totalElements: payload.totalElements ?? payload.content.length,
      currentPage: payload.number ?? page,
      pageSize: payload.size ?? size,
    };
  }

  if (payload && Array.isArray(payload.rfqs)) {
    return {
      rfqs: payload.rfqs.map(mapRFQDto),
      totalPages: payload.totalPages || 1,
      totalElements: payload.totalElements || payload.rfqs.length,
      currentPage: payload.currentPage || page,
      pageSize: payload.pageSize || size,
    };
  }

  return {
    rfqs: [],
    totalPages: 0,
    totalElements: 0,
    currentPage: page,
    pageSize: size,
  };
}

export const rfqApi = {
  /**
   * 1️⃣ Create a Request for Quotation (RFQ)
   * POST /api/buyer/rfqs
   * Auth resolved via X-User-Email header (set by apiClient interceptor)
   */
  createRFQ: async (payload: CreateRFQPayload): Promise<RFQ> => {
    const buyerEmail = payload.email || '';
    const rfqBody = {
      // productId is optional — omit when not provided so backend uses title-based lookup
      ...(payload.productId ? { productId: Number(payload.productId) } : {}),
      quantity: typeof payload.quantity === 'number'
        ? `${payload.quantity} ${payload.unit || 'KG'}`
        : payload.quantity || '100 KG',
      deliveryLocation: payload.deliveryLocation || 'India',
      buyerMessage: payload.description || payload.specifications || payload.title || 'Inquiry for wholesale quotation',
      email: buyerEmail,
      ...(payload.buyerName ? { buyerName: payload.buyerName } : {}),
      ...(payload.buyerPhone ? { buyerPhone: payload.buyerPhone } : {}),
    };

    try {
      const response = await apiClient.post<any>('/api/buyer/rfqs', rfqBody);
      return mapRFQDto(response.data?.data || response.data);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.response?.data?.error || err?.message || '');
      // If productId triggered an FK constraint failure (e.g. ID not found in RDS products table), retry safely without productId
      if ('productId' in rfqBody && (msg.includes('foreign key constraint fails') || msg.includes('FOREIGN KEY') || msg.includes('child row'))) {
        const { productId: _unused, ...safeBody } = rfqBody as any;
        const fallbackResponse = await apiClient.post<any>('/api/buyer/rfqs', safeBody);
        return mapRFQDto(fallbackResponse.data?.data || fallbackResponse.data);
      }
      throw err;
    }
  },

  /**
   * 2️⃣ List buyer RFQs (with received quotes)
   * GET /api/buyer/rfqs?page=0&size=10
   */
  getRFQsPaginated: async (page: number = 0, size: number = 10, status?: string): Promise<PaginatedRFQs> => {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;

    const response = await apiClient.get<any>('/api/buyer/rfqs', { params });
    return extractPaginatedData(response.data?.data || response.data, page, size);
  },

  /**
   * Helper to retrieve all/current list of buyer RFQs
   */
  getRFQs: async (page: number = 0, size: number = 10, status?: string): Promise<RFQ[]> => {
    const paginated = await rfqApi.getRFQsPaginated(page, size, status);
    return paginated.rfqs;
  },

  /**
   * Get single RFQ by ID / rfqCode
   * Method: GET
   * URL: /api/buyer/rfqs/{rfqCode}
   */
  getRFQById: async (id: string | number): Promise<RFQ> => {
    const response = await apiClient.get<any>(`/api/buyer/rfqs/${id}`);
    return mapRFQDto(response.data?.data || response.data);
  },

  /**
   * 3️⃣ Accept a Quotation
   * Method: POST
   * URL: /api/buyer/rfqs/{rfqCode}/accept
   */
  acceptQuote: async (rfqId: string | number, _quoteId?: string | number): Promise<any> => {
    const response = await apiClient.post<any>(`/api/buyer/rfqs/${rfqId}/accept`);
    return response.data?.data || response.data;
  },

  /**
   * Reject a Quotation
   * Method: POST
   * URL: /api/buyer/rfqs/{rfqCode}/reject
   */
  rejectQuote: async (rfqId: string | number, reason: string): Promise<any> => {
    const response = await apiClient.post<any>(`/api/buyer/rfqs/${rfqId}/reject`, { reason });
    return response.data?.data || response.data;
  },

  /**
   * Unified Respond (Accept or Reject)
   * Method: POST
   * URL: /api/buyer/rfqs/{rfqCode}/respond
   */
  respondRFQ: async (rfqId: string | number, action: "ACCEPT" | "REJECT", reason?: string): Promise<any> => {
    const response = await apiClient.post<any>(`/api/buyer/rfqs/${rfqId}/respond`, { action, reason });
    return response.data?.data || response.data;
  },

  /**
   * Re-Raise RFQ (New negotiation after rejection)
   * Method: POST
   * URL: /api/buyer/rfqs/{rfqCode}/re-raise
   */
  reRaiseRFQ: async (rfqId: string | number, payload: { quantity: string; deliveryLocation: string; buyerMessage: string }): Promise<any> => {
    const response = await apiClient.post<any>(`/api/buyer/rfqs/${rfqId}/re-raise`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Get Contact Details (Only after ACCEPTED)
   * Method: GET
   * URL: /api/buyer/rfqs/{rfqCode}/contact
   */
  getRFQContact: async (rfqId: string | number): Promise<any> => {
    const response = await apiClient.get<any>(`/api/buyer/rfqs/${rfqId}/contact`);
    return response.data?.data || response.data;
  },

  /**
   * 🏬 Admin/Seller RFQ Feed — all open buyer RFQs
   * GET /api/admin/rfqs
   */
  getSellerRFQFeed: async (page: number = 0, size: number = 20): Promise<RFQ[]> => {
    try {
      const response = await apiClient.get<any>('/api/admin/rfqs', { params: { page, size } });
      const paginated = extractPaginatedData(response.data?.data || response.data, page, size);
      return paginated.rfqs;
    } catch (err) {
      console.error('Failed to load admin RFQ feed', err);
      return [];
    }
  },

  /**
   * POST /api/admin/rfqs/{rfqId}/quotation - Submit quotation for an RFQ
   */
  submitQuoteToFeed: async (
    rfqId: string | number,
    quote: {
      offeredPrice: number;
      notes?: string;
      leadTime?: string;
      validUntil?: string;
      deliveryDate?: string;
    }
  ): Promise<any> => {
    const adminPayload = {
      unitPrice: Number(quote.offeredPrice || 0),
      quantity: 1,
      deliveryDays: quote.leadTime || "7",
      notes: quote.notes || (quote.leadTime ? `Lead time: ${quote.leadTime}` : ""),
    };

    const feedPayload = {
      offeredPrice: quote.offeredPrice,
      notes: quote.notes || (quote.leadTime ? `Lead time: ${quote.leadTime}` : ""),
      leadTime: quote.leadTime,
      validUntil: quote.validUntil,
      deliveryDate: quote.deliveryDate,
    };

    try {
      const response = await apiClient.post<any>(`/api/admin/rfqs/${rfqId}/quotation`, adminPayload);
      return response.data?.data || response.data;
    } catch {
      try {
        const response = await apiClient.post<any>(`/seller/rfq-feed/${rfqId}/quotes`, feedPayload);
        return response.data?.data || response.data;
      } catch {
        const response = await apiClient.post<any>(`/seller/rfq/${rfqId}/quote`, feedPayload);
        return response.data?.data || response.data;
      }
    }
  },

  /**
   * 3️⃣ Seller "My Quotes" Feed
   * GET /api/v1/seller/rfq/my-quotes?page=0&size=10
   */
  getMyQuotes: async (page: number = 0, size: number = 20): Promise<Quote[]> => {
    try {
      let response: any;
      try {
        response = await apiClient.get<any>('/seller/rfq/my-quotes', {
          params: { page, size },
        });
      } catch {
        response = await apiClient.get<any>('/seller/rfq-feed/my-quotes', {
          params: { page, size },
        });
      }

      const payload = response.data?.data || response.data;
      if (Array.isArray(payload)) {
        return payload.map((q: any) => mapQuoteDto(q));
      }
      if (payload && Array.isArray(payload.content)) {
        return payload.content.map((q: any) => mapQuoteDto(q));
      }
      return [];
    } catch (err) {
      console.error('Failed to get seller submitted quotes', err);
      return [];
    }
  },


  /**
   * Submit Quote for RFQ (Legacy helper)
   */
  submitQuote: async (rfqId: string | number, quote: Partial<Quote>): Promise<any> => {
    return rfqApi.submitQuoteToFeed(rfqId, {
      offeredPrice: quote.unitPrice ?? quote.offeredPrice ?? 0,
      notes: quote.notes,
      leadTime: quote.leadTime,
      validUntil: quote.validUntil,
      deliveryDate: quote.deliveryDate,
    });
  },
};
