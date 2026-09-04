import { get, post } from '../../../core/axios';

export interface IChatMessage {
  id: number;
  message: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    lastName?: string | null;
    role?: { name: string; value: string } | null;
  };
}

/** @description Loads chat history, newest first. Pass `cursor` (oldest loaded id) to page back. */
export const getMessages = (cursor?: number, limit = 30) => {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', String(cursor));
  query.set('limit', String(limit));
  return get<IChatMessage[]>(`/chat/messages?${query.toString()}`);
};

/** @description Sends a message from the authenticated user. */
export const sendMessage = (message: string) => {
  return post<IChatMessage>('/chat/messages', { message });
};

/** @description Requests a subscribe-only Ably TokenRequest for realtime updates. */
export const getRealtimeToken = () => {
  return get<any>('/realtime/token');
};
