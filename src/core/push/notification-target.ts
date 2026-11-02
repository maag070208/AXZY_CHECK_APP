/** Destino de una notificación: navegador raíz y parámetros anidados para `navigate`. */
export interface NotificationTarget {
  route: string;
  params?: Record<string, unknown>;
}

const INVITATION_KINDS = new Set(['INVITATION_APPROVAL', 'INVITATION_EXPIRED', 'INVITATION_ENTERED', 'INVITATION_EXITED']);

const INVITATIONS: NotificationTarget = { route: 'INVITATIONS_STACK', params: { screen: 'INVITATIONS_MAIN' } };
const ANNOUNCEMENTS: NotificationTarget = {
  route: 'Tabs',
  params: { screen: 'HOME_STACK', params: { screen: 'RESIDENT_NOTIFICATIONS' } },
};
/** Bandeja de avisos: también es el destino de la aprobación fuera de horario, que no tiene pantalla propia. */
const INBOX: NotificationTarget = {
  route: 'Tabs',
  params: { screen: 'HOME_STACK', params: { screen: 'NOTIFICATIONS' } },
};

/**
 * Decide a dónde lleva el toque de una notificación según su `data` (el backend manda strings).
 * `type` lo usan las invitaciones; `kind` la aprobación fuera de horario; `announcementId` los anuncios.
 */
export const getNotificationTarget = (data?: Record<string, string>): NotificationTarget => {
  const kind = data?.type ?? data?.kind;
  if (kind && INVITATION_KINDS.has(kind)) return INVITATIONS;
  if (data?.announcementId) return ANNOUNCEMENTS;
  return INBOX;
};
