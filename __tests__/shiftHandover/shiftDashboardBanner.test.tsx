/**
 * Home del jefe de turno (fase 7): monta `ShiftAlertBanner` una sola vez para recibir la
 * alerta de entrega de turno del cliente activo (`shift-handover:alerts:<clientId>`).
 * El canal y la re-suscripción se cubren en `shiftAlertsRealtime.test.tsx`; aquí se verifica
 * el montaje en `ShiftDashboard`.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-vision-camera', () => {
  const Camera: any = () => null;
  Camera.requestCameraPermission = jest.fn(async () => 'granted');
  return { Camera, useCameraDevice: () => null, useCodeScanner: () => undefined };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: any) => React.useEffect(() => callback(), [callback]),
    useIsFocused: () => true,
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector: any) =>
    selector({
      userState: {
        id: '2',
        role: 'SHIFT',
        fullName: 'Demo Jefe',
        username: 'demo_jefe',
        isSignedIn: true,
      },
    }),
}));

jest.mock('../../src/shared/theme/RoleThemeProvider', () => ({
  useRolePalette: () => ({
    role: 'SHIFT',
    primary: '#064E4B',
    primarySoft: '#E6FFFA',
    primaryDeep: '#033B39',
    accent: '#12A3A0',
    hero: '#064E4B',
    heroDeep: '#022C2A',
    heroAccent: '#99F6E4',
    label: 'Jefe de guardias',
  }),
}));

jest.mock('../../src/screens/recurring/service/recurring.service', () => ({
  getMyRecurringAssignments: jest.fn(async () => ({ success: true, data: [] })),
}));
jest.mock('../../src/screens/admin/service/dashboard.service', () => ({
  getLiveDashboard: jest.fn(async () => ({ success: false, data: null })),
}));
jest.mock('../../src/screens/home/service/round.service', () => ({
  startRound: jest.fn(async () => ({ success: false, data: null })),
  endRound: jest.fn(async () => ({ success: false, data: null })),
  getCurrentRound: jest.fn(async () => ({ success: false, data: null })),
  getActiveRounds: jest.fn(async () => ({ success: true, data: [] })),
}));

// El banner real se prueba por separado (canal/re-suscripción); aquí basta el montaje.
jest.mock('../../src/screens/shiftHandover/components/ShiftAlertBanner', () => {
  const React = require('react');
  return { ShiftAlertBanner: () => React.createElement('ShiftAlertBannerMock') };
});

import { ShiftDashboard } from '../../src/screens/home/screens/ShiftDashboard';

const render = async () => {
  let renderer: any;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ShiftDashboard />);
  });
  return renderer;
};

describe('HOME SHIFT · BANNER DE ENTREGA DE TURNO', () => {
  it('SHIFT-HOME-01 monta el banner una sola vez en el panel del jefe', async () => {
    const renderer = await render();

    const banners = renderer.root.findAll(
      (node: any) => node.type === 'ShiftAlertBannerMock',
    );
    expect(banners).toHaveLength(1);
    // El resto del home sigue renderizando (evita un doble montaje de la pantalla completa).
    // Un único panel del jefe renderizado (Text host del eyebrow, sin doble montaje).
    expect(
      renderer.root.findAll(
        (node: any) =>
          typeof node.type === 'string' && node.props?.children === 'PANEL DE SUPERVISIÓN',
      ),
    ).toHaveLength(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('SHIFT-HOME-02 el home del jefe se renderiza con el banner montado sin crash', async () => {
    const renderer = await render();

    expect(
      renderer.root.findAll((node: any) => node.type === 'ShiftAlertBannerMock'),
    ).toHaveLength(1);
    // Un único panel del jefe renderizado (Text host del eyebrow, sin doble montaje).
    expect(
      renderer.root.findAll(
        (node: any) =>
          typeof node.type === 'string' && node.props?.children === 'PANEL DE SUPERVISIÓN',
      ),
    ).toHaveLength(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
