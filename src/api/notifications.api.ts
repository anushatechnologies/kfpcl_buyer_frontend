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

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('kfpcl_token') ||
      localStorage.getItem('kfpcl.customer.session');
    return Boolean(token);
  } catch {
    return false;
  }
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
            targetPath: '/account?tab=rfqs',
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
          targetPath: '/account?tab=rfqs',
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
   * 🔔 GET /api/notifications
   * Fetch all notifications belonging to the logged-in buyer
   * Headers: Authorization: Bearer <BUYER_JWT_TOKEN>
   */
  getNotifications: async (page: number = 0, size: number = 20): Promise<PaginatedNotifications> => {
    if (!hasAuthToken()) {
      return {
        content: [],
        totalPages: 0,
        totalElements: 0,
        page,
        size,
      };
    }
    try {
      const [backendRes, rfqReplies] = await Promise.all([
        apiClient.get<any>('/api/notifications', { params: { page, size } }).catch(() => null),
        fetchRfqReplyNotifications().catch(() => []),
      ]);

      const data = backendRes?.data?.data !== undefined ? backendRes.data.data : backendRes?.data;
      const rawContent: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : [];

      const backendItems: NotificationItem[] = rawContent.map((item: any) => {
        const isRead = Boolean(item.isRead ?? item.read);
        let targetPath = item.targetPath || item.link || '';
        if (!targetPath) {
          const refType = String(item.referenceType || item.type || '').toUpperCase();
          if (refType === 'RFQ') {
            targetPath = '/account?tab=rfqs';
          } else if (refType === 'ORDER') {
            targetPath = '/orders';
          } else if (refType === 'PRODUCT' && item.referenceId) {
            targetPath = `/products/${item.referenceId}`;
          }
        }

        return {
          id: String(item.id ?? ''),
          type: item.type || 'GENERAL',
          title: item.title || 'Notification',
          body: item.message || item.body || '',
          message: item.message || item.body || '',
          read: isRead,
          isRead,
          referenceType: item.referenceType ?? null,
          referenceId: item.referenceId ?? null,
          targetPath,
          createdAt: item.createdAt || new Date().toISOString(),
        };
      });

      // Combine backend notifications and RFQ replies, deduplicating by ID
      const seenIds = new Set<string>();
      const combined: NotificationItem[] = [];

      for (const item of [...rfqReplies, ...backendItems]) {
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
   * 🔔 GET /api/notifications/unread-count
   * Fetch unread count for notification bell icon counter
   * Headers: Authorization: Bearer <BUYER_JWT_TOKEN>
   */
  getUnreadCount: async (): Promise<number> => {
    if (!hasAuthToken()) return 0;
    try {
      const response = await apiClient.get<any>('/api/notifications/unread-count');
      const data = response.data?.data !== undefined ? response.data.data : response.data;
      if (typeof data?.count === 'number') {
        return data.count;
      }
      if (typeof data === 'number') {
        return data;
      }
      // Fallback: local unread count
      const res = await notificationsApi.getNotifications(0, 50);
      return res.content.filter((n) => !n.read).length;
    } catch (err) {
      console.warn('Failed to fetch unread count from /api/notifications/unread-count', err);
      try {
        const res = await notificationsApi.getNotifications(0, 50);
        return res.content.filter((n) => !n.read).length;
      } catch {
        return 0;
      }
    }
  },

  /**
   * 🔔 PATCH /api/notifications/{notificationId}/read
   * Mark a single notification as read
   * Headers: Authorization: Bearer <BUYER_JWT_TOKEN>
   */
  markAsRead: async (notificationId: string | number): Promise<NotificationItem | null> => {
    if (!hasAuthToken()) return null;
    const idStr = String(notificationId);
    try {
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

      const response = await apiClient.patch<any>(`/api/notifications/${idStr}/read`);
      const data = response.data?.data !== undefined ? response.data.data : response.data || {};
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }
      return {
        id: String(data.id || idStr),
        type: data.type || 'GENERAL',
        title: data.title || '',
        body: data.message || data.body || '',
        message: data.message || data.body || '',
        read: true,
        isRead: true,
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
        targetPath: data.targetPath || '',
        createdAt: data.createdAt || new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`Failed to mark notification ${idStr} as read`, err);
      return null;
    }
  },

  /**
   * 🔔 PATCH /api/notifications/read-all
   * Mark all notifications as read
   * Headers: Authorization: Bearer <BUYER_JWT_TOKEN>
   */
  markAllAsRead: async (): Promise<boolean> => {
    if (!hasAuthToken()) return false;
    try {
      const replies = await fetchRfqReplyNotifications().catch(() => []);
      for (const r of replies) {
        saveReadRfqReply(r.id);
      }
      await apiClient.patch<any>('/api/notifications/read-all');
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
