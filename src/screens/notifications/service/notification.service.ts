import { get, patch } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  announcementId: number | null;
  announcement?: { id: number; title: string; body: string } | null;
}

export const getMyNotifications = (page = 1, pageSize = 30): Promise<TResult<{ items: AppNotification[]; total: number }>> =>
  get('/notifications/me', { params: { page, pageSize } });

export const getUnreadNotificationCount = (): Promise<TResult<{ count: number }>> =>
  get('/notifications/me/unread-count');

export const markNotificationRead = (id: number): Promise<TResult<AppNotification>> =>
  patch(`/notifications/${id}/read`, {});
