import apiClient from './client';

export interface BackendNotificationDto {
  id: number | string;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: number | string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  read: boolean;
  isRead?: boolean;
  referenceType?: string | null;
  referenceId?: number | string | null;
  targetPath?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  newInquiry?: boolean;
  orderUpdates?: boolean;
  rfqUpdates?: boolean;
  stockAlerts?: boolean;
  paymentUpdates?: boolean;
  whatsappEnabled?: boolean;
}

export interface PaginatedNotifications {
  content: NotificationItem[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

function getReadRfqReplies(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('kfpcl_read_rfq_replies') || '[]');
  } catch {
    return [];
  }
}

function saveReadRfqReply(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getReadRfqReplies();
    if (!list.includes(id)) {
      localStorage.setItem('kfpcl_read_rfq_replies', JSON.stringify([...list, id]));
    }
  } catch {}
}

import { readStoredSession } from '@/app/lib/session';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const session = readStoredSession();
    if (session?.accessToken && session.accessToken !== 'undefined' && session.accessToken !== 'null' && session.accessToken.trim()) {
      return session.accessToken.trim();
    }
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('kfpcl_token');
    if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
      return token.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}

function getLocalReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('kfpcl_read_notification_ids');
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveLocalReadId(id: string | number) {
  if (typeof window === 'undefined') return;
  try {
    const set = getLocalReadIds();
    set.add(String(id));
    localStorage.setItem('kfpcl_read_notification_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

function mapBackendNotification(item: any, localReadIds?: Set<string>): NotificationItem {
  const idStr = String(item.id ?? '');
  const isLocallyRead = localReadIds ? localReadIds.has(idStr) : false;
  const isRead = Boolean(isLocallyRead || item.read || item.isRead);
  const refType = String(item.referenceType || item.type || '').toUpperCase();
  const refId = item.referenceId ?? null;
  const title = item.title || 'Notification';
  const body = item.message || item.body || '';

  let targetPath = item.targetPath || item.link || '';
  if (!targetPath) {
    if (refType === 'RFQ' || title.toLowerCase().includes('rfq') || body.toLowerCase().includes('rfq')) {
      targetPath = '/rfq';
    } else if (refType === 'ORDER' || title.toLowerCase().includes('order')) {
      targetPath = '/orders';
    } else if (refType === 'PRODUCT' && refId) {
      targetPath = `/products/${refId}`;
    } else if (title.toLowerCase().includes('deal') || title.toLowerCase().includes('product')) {
      targetPath = '/products';
    }
  }

  return {
    id: idStr,
    type: item.type || (refType ? refType : 'GENERAL'),
    title,
    body,
    message: body,
    read: isRead,
    isRead,
    referenceType: item.referenceType ?? null,
    referenceId: refId,
    targetPath,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

async function fetchRfqReplyNotifications(): Promise<NotificationItem[]> {
  if (!hasAuthToken()) return [];
  try {
    const rfqRes = await apiClient.get<any>('/api/buyer/rfqs', { params: { page: 0, size: 30 } });
    const payload = rfqRes.data?.data || rfqRes.data;
    const list: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.rfqs)
      ? payload.rfqs
      : [];

    const readIds = getReadRfqReplies();
    const replyNotifs: NotificationItem[] = [];

    for (const rfq of list) {
      const quotes = rfq.quotes || rfq.quotations || rfq.bids || (rfq.response ? [rfq.response] : []);
      const rfqId = String(rfq.id || rfq.rfqId || rfq.rfqCode || '');
      const rfqTitle = rfq.productName || rfq.title || rfq.product?.name || `RFQ #${rfq.rfqCode || rfqId}`;

      if (Array.isArray(quotes) && quotes.length > 0) {
        for (const q of quotes) {
          const quoteId = String(q.id || q.quoteId || '1');
          const notifId = `rfq-reply-${rfqId}-${quoteId}`;
          // Check all possible price fields — same priority as extractPrice() in rfq.api.ts
          const rawPrice =
            q.amount ?? q.unitPrice ?? q.offeredPrice ?? q.price ??
            q.quotedPrice ?? q.quotedAmount ?? q.totalPrice ?? q.totalAmount ??
            q.quoteAmount ?? q.rate ?? q.cost ?? q.adminAmount ?? q.adminPrice ??
            q.unit_price ?? q.offered_price ?? q.total_price ?? q.total_amount ??
            q.quote_amount ?? q.quoted_price ?? q.quoted_amount;
          const offeredPrice = typeof rawPrice === 'number' ? rawPrice
            : typeof rawPrice === 'string' ? (Number(rawPrice.replace(/[^0-9.-]+/g, '')) || 0)
            : 0;
          const seller = q.sellerName || q.sellerCompany || q.adminName || 'Supplier';
          const priceText = offeredPrice > 0 ? `₹${Number(offeredPrice).toLocaleString('en-IN')}` : 'Quotation provided';
          // Check all lead-time field variants — no hardcoded fallback
          const rawLeadTime =
            q.leadTime ?? q.lead_time ?? q.deliveryDays ?? q.delivery_days ??
            q.deliveryTimeline ?? q.deliveryTime ?? q.leadDays ?? q.timeline ?? q.duration;
          const leadTimeText = rawLeadTime != null && String(rawLeadTime).trim() !== ''
            ? (/^\d+$/.test(String(rawLeadTime).trim())
                ? `${rawLeadTime} ${Number(rawLeadTime) === 1 ? 'day' : 'days'}`
                : String(rawLeadTime).trim())
            : '';
          const notesText = q.notes || q.comment || q.message || '';

          const bodyParts = [
            `${seller} replied with quotation of ${priceText}`,
            leadTimeText ? `Delivery: ${leadTimeText}` : '',
            notesText ? `Note: "${notesText}"` : '',
          ].filter(Boolean);

          const replyTimestamp =
            q.quotedAt ||
            q.quoted_at ||
            q.respondedAt ||
            q.responded_at ||
            q.repliedAt ||
            q.replied_at ||
            q.createdAt ||
            q.created_at ||
            q.updatedAt ||
            q.updated_at ||
            q.replyDate ||
            q.reply_date ||
            q.date ||
            q.timestamp ||
            rfq.respondedAt ||
            rfq.responded_at ||
            rfq.quotedAt ||
            rfq.quoted_at ||
            rfq.lastRepliedAt ||
            rfq.last_replied_at ||
            rfq.updatedAt ||
            rfq.updated_at ||
            rfq.createdAt ||
            new Date().toISOString();

          replyNotifs.push({
            id: notifId,
            type: 'RFQ_REPLY',
            title: `Supplier replied to your RFQ: ${rfqTitle}`,
            body: bodyParts.join(' • '),
            read: readIds.includes(notifId),
            targetPath: '/rfq',
            createdAt: replyTimestamp,
          });
        }
      } else if (rfq.status && ['quoted', 'responded', 'accepted', 'in_negotiation'].includes(String(rfq.status).toLowerCase())) {
        const notifId = `rfq-status-${rfqId}-${rfq.status}`;
        const statusTimestamp =
          rfq.respondedAt ||
          rfq.responded_at ||
          rfq.quotedAt ||
          rfq.quoted_at ||
          rfq.lastRepliedAt ||
          rfq.last_replied_at ||
          rfq.updatedAt ||
          rfq.updated_at ||
          rfq.createdAt ||
          new Date().toISOString();

        replyNotifs.push({
          id: notifId,
          type: 'RFQ_REPLY',
          title: `Supplier replied to your RFQ: ${rfqTitle}`,
          body: `Supplier has replied to your RFQ with status "${rfq.status}". Click to review quotation details.`,
          read: readIds.includes(notifId),
          targetPath: '/rfq',
          createdAt: statusTimestamp,
        });
      }
    }

    return replyNotifs;
  } catch {
    return [];
  }
}

export const notificationsApi = {
  /**
   * 🔔 GET /api/admin/notifications & /api/notifications
   * Fetch real notifications from the Admin API (and buyer notifications/RFQ replies if authenticated)
   */
  getNotifications: async (page: number = 0, size: number = 20): Promise<PaginatedNotifications> => {
    try {
      const isAuth = hasAuthToken();
      const localReadIds = getLocalReadIds();

      const [adminRes, buyerRes, rfqReplies] = await Promise.all([
        // Admin API - source of real notifications (deals, RFQs, enquiries, system updates)
        apiClient.get<any>('/api/admin/notifications', { params: { page, size } }).catch(() => null),
        // Buyer API - if authenticated, fetch buyer-specific notifications
        isAuth
          ? apiClient.get<any>('/api/notifications', { params: { page, size } }).catch(() => null)
          : Promise.resolve(null),
        // Buyer RFQ replies - if authenticated
        isAuth
          ? fetchRfqReplyNotifications().catch(() => [])
          : Promise.resolve([]),
      ]);

      // Extract raw items from Admin API
      const adminData = adminRes?.data;
      const rawAdminItems: any[] = Array.isArray(adminData?.notifications)
        ? adminData.notifications
        : Array.isArray(adminData?.data)
        ? adminData.data
        : Array.isArray(adminData)
        ? adminData
        : [];

      // Extract raw items from Buyer API
      const buyerData = buyerRes?.data?.data !== undefined ? buyerRes.data.data : buyerRes?.data;
      const rawBuyerItems: any[] = Array.isArray(buyerData)
        ? buyerData
        : Array.isArray(buyerData?.content)
        ? buyerData.content
        : Array.isArray(buyerData?.notifications)
        ? buyerData.notifications
        : [];

      const combinedRaw = [...rawAdminItems, ...rawBuyerItems];
      const backendItems = combinedRaw.map((it) => mapBackendNotification(it, localReadIds));

      // Combine backend notifications and RFQ replies, deduplicating by ID
      const seenIds = new Set<string>();
      const combined: NotificationItem[] = [];

      for (const item of [...(rfqReplies || []), ...backendItems]) {
        if (!item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        combined.push(item);
      }

      // Sort newest first
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        content: combined.slice(0, size),
        totalPages: Math.ceil(combined.length / size) || 1,
        totalElements: combined.length,
        page,
        size,
      };
    } catch (err) {
      console.warn('Failed to load notifications', err);
      return {
        content: [],
        totalPages: 0,
        totalElements: 0,
        page,
        size,
      };
    }
  },

  /**
   * Fetch complete list of notifications for the inbox.
   */
  getAllNotifications: async (): Promise<NotificationItem[]> => {
    const res = await notificationsApi.getNotifications(0, 100);
    return res.content;
  },

  /**
   * 🔔 GET /api/admin/notifications/unread-count
   * Fetch unread count for notification bell icon counter
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const localReadIds = getLocalReadIds();

      // 1. Try Admin API unread-count
      const adminRes = await apiClient.get<any>('/api/admin/notifications/unread-count').catch(() => null);
      if (adminRes?.data) {
        const rawCount = adminRes.data.unreadCount ?? adminRes.data.count;
        if (typeof rawCount === 'number') {
          return Math.max(0, rawCount - localReadIds.size);
        }
      }

      // 2. Try buyer unread count if authenticated
      if (hasAuthToken()) {
        const buyerRes = await apiClient.get<any>('/api/notifications/unread-count').catch(() => null);
        const buyerData = buyerRes?.data?.data !== undefined ? buyerRes.data.data : buyerRes?.data;
        const buyerCount = buyerData?.unreadCount ?? buyerData?.count ?? (typeof buyerData === 'number' ? buyerData : null);
        if (typeof buyerCount === 'number' && buyerCount > 0) {
          return Math.max(0, buyerCount - localReadIds.size);
        }
      }

      // 3. Fallback: calculate unread from notification items list
      const res = await notificationsApi.getNotifications(0, 50);
      return res.content.filter((n) => !n.read).length;
    } catch (err) {
      console.warn('Failed to fetch unread count', err);
      return 0;
    }
  },

  /**
   * 🔔 PATCH /api/admin/notifications/{notificationId}/read & /api/notifications/{notificationId}/read
   * Mark a single notification as read
   */
  markAsRead: async (notificationId: string | number): Promise<NotificationItem | null> => {
    const idStr = String(notificationId);
    saveLocalReadId(idStr);

    if (idStr.startsWith('rfq-')) {
      saveReadRfqReply(idStr);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }
      return {
        id: idStr,
        type: 'RFQ_REPLY',
        title: '',
        body: '',
        message: '',
        read: true,
        isRead: true,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      await Promise.allSettled([
        apiClient.patch<any>(`/api/admin/notifications/${idStr}/read`).catch(() => null),
        apiClient.patch<any>(`/api/notifications/${idStr}/read`).catch(() => null),
      ]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }

      return {
        id: idStr,
        type: 'GENERAL',
        title: '',
        body: '',
        message: '',
        read: true,
        isRead: true,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`Failed to mark notification ${idStr} as read`, err);
      return null;
    }
  },

  /**
   * 🔔 PATCH /api/notifications/read-all & /api/admin/notifications/{id}/read
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<boolean> => {
    try {
      const list = await notificationsApi.getAllNotifications().catch(() => []);
      for (const item of list) {
        saveLocalReadId(item.id);
        if (item.id.startsWith('rfq-')) {
          saveReadRfqReply(item.id);
        }
      }

      const patchPromises: Promise<any>[] = [
        apiClient.patch<any>('/api/notifications/read-all').catch(() => null),
      ];

      const unreadBackendIds = list.filter((n) => !n.id.startsWith('rfq-')).map((n) => n.id);
      for (const id of unreadBackendIds) {
        patchPromises.push(apiClient.patch<any>(`/api/admin/notifications/${id}/read`).catch(() => null));
      }

      await Promise.allSettled(patchPromises);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }
      return true;
    } catch (err) {
      console.warn('Failed to mark all notifications as read', err);
      return false;
    }
  },

  /**
   * PUT /api/v1/notifications/preferences - Save alert toggle settings
   */
  updatePreferences: async (
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> => {
    try {
      const response = await apiClient.put<any>('/notifications/preferences', preferences);
      return response.data?.data || response.data || preferences;
    } catch (err) {
      console.warn('Failed to update notification preferences', err);
      return preferences;
    }
  },

};
