import apiClient from './client';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
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

async function fetchRfqReplyNotifications(): Promise<NotificationItem[]> {
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

          replyNotifs.push({
            id: notifId,
            type: 'RFQ_REPLY',
            title: `Supplier replied to your RFQ: ${rfqTitle}`,
            body: bodyParts.join(' • '),
            read: readIds.includes(notifId),
            targetPath: '/account?tab=rfqs',
            createdAt: q.createdAt || rfq.updatedAt || rfq.createdAt || new Date().toISOString(),
          });
        }
      } else if (rfq.status && ['quoted', 'responded', 'accepted', 'in_negotiation'].includes(String(rfq.status).toLowerCase())) {
        const notifId = `rfq-status-${rfqId}-${rfq.status}`;
        replyNotifs.push({
          id: notifId,
          type: 'RFQ_REPLY',
          title: `Supplier replied to your RFQ: ${rfqTitle}`,
          body: `Supplier has replied to your RFQ with status "${rfq.status}". Click to review quotation details.`,
          read: readIds.includes(notifId),
          targetPath: '/account?tab=rfqs',
          createdAt: rfq.updatedAt || rfq.createdAt || new Date().toISOString(),
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
   * 🔔 Fetch real notifications from /api/notifications and /api/buyer/rfqs replies
   */
  getNotifications: async (page: number = 0, size: number = 10): Promise<PaginatedNotifications> => {
    try {
      const [backendRes, rfqReplies] = await Promise.all([
        apiClient.get<any>('/api/notifications', { params: { page, size } }).catch(() => null),
        fetchRfqReplyNotifications().catch(() => []),
      ]);

      const data = backendRes?.data?.data || backendRes?.data || {};
      const rawContent: any[] = Array.isArray(data.content)
        ? data.content
        : Array.isArray(data)
        ? data
        : [];

      const backendItems: NotificationItem[] = rawContent.map((item: any) => ({
        id: String(item.id || ''),
        type: item.type || 'INFO',
        title: item.title || 'Notification',
        body: item.body || item.message || '',
        read: Boolean(item.read || item.isRead),
        targetPath: item.targetPath || item.link || '',
        createdAt: item.createdAt || new Date().toISOString(),
      }));

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
   * Fetch the complete notification inbox for the full Notifications page.
   */
  getAllNotifications: async (): Promise<NotificationItem[]> => {
    const res = await notificationsApi.getNotifications(0, 100);
    return res.content;
  },

  /**
   * PATCH /api/notifications/{id}/read - Mark a notification as read when clicked
   */
  markAsRead: async (notificationId: string): Promise<NotificationItem | null> => {
    try {
      if (notificationId.startsWith('rfq-')) {
        saveReadRfqReply(notificationId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
        }
        return {
          id: notificationId,
          type: 'RFQ_REPLY',
          title: '',
          body: '',
          read: true,
          createdAt: new Date().toISOString(),
        };
      }

      const response = await apiClient.patch<any>(`/api/notifications/${notificationId}/read`);
      const data = response.data?.data || response.data || {};
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }
      return {
        id: String(data.id || notificationId),
        type: data.type || 'INFO',
        title: data.title || '',
        body: data.body || '',
        read: true,
        targetPath: data.targetPath || '',
        createdAt: data.createdAt || new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`Failed to mark notification ${notificationId} as read`, err);
      return null;
    }
  },

  /**
   * PATCH /api/notifications/read-all - Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    try {
      // Mark all current RFQ replies as read in localStorage
      const replies = await fetchRfqReplyNotifications().catch(() => []);
      for (const r of replies) {
        saveReadRfqReply(r.id);
      }
      await apiClient.patch<any>('/api/notifications/read-all').catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kfpcl:notifications-updated'));
      }
    } catch (err) {
      console.warn('Failed to mark all notifications as read', err);
    }
  },

  /**
   * GET /api/notifications/unread-count - Get unread count
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await notificationsApi.getNotifications(0, 100);
      return res.content.filter((n) => !n.read).length;
    } catch {
      return 0;
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
