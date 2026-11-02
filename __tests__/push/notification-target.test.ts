import { getNotificationTarget } from '../../src/core/push/notification-target';

describe('getNotificationTarget', () => {
  it.each(['INVITATION_APPROVAL', 'INVITATION_EXPIRED', 'INVITATION_ENTERED', 'INVITATION_EXITED'])(
    'lleva %s a la lista de invitaciones',
    type => {
      expect(getNotificationTarget({ type, invitationId: '7' })).toEqual({
        route: 'INVITATIONS_STACK',
        params: { screen: 'INVITATIONS_MAIN' },
      });
    },
  );

  it('lleva un anuncio a sus avisos del residente', () => {
    expect(getNotificationTarget({ announcementId: '12' })).toEqual({
      route: 'Tabs',
      params: { screen: 'HOME_STACK', params: { screen: 'RESIDENT_NOTIFICATIONS' } },
    });
  });

  it('lleva la aprobación fuera de horario a la bandeja de avisos', () => {
    expect(getNotificationTarget({ kind: 'AUTHORIZATION_APPROVAL', personId: '3' })).toEqual({
      route: 'Tabs',
      params: { screen: 'HOME_STACK', params: { screen: 'NOTIFICATIONS' } },
    });
  });

  it('usa la bandeja cuando no hay datos', () => {
    expect(getNotificationTarget(undefined)).toEqual(getNotificationTarget({}));
    expect(getNotificationTarget(undefined).params).toEqual({
      screen: 'HOME_STACK',
      params: { screen: 'NOTIFICATIONS' },
    });
  });
});
