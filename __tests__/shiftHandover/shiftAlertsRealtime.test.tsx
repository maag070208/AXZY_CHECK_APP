/**
 * Alertas de entrega de turno en vivo por cliente (fase 7): canal
 * `shift-handover:alerts:<clientId>`, sin cliente no se suscribe y re-suscripción al cambiar.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockGetOfflineClient = jest.fn();

jest.mock('../../src/offline/client', () => ({
  getOfflineClient: (...args: any[]) => mockGetOfflineClient(...args),
}));
jest.mock('../../src/core/realtime/realtime.service', () => ({
  getRealtimeToken: jest.fn(),
}));

import { resolveActiveClientId } from '../../src/core/tenant/active-client';
import {
  shiftAlertsChannelForClient,
  subscribeToShiftAlerts,
  useShiftAlertsRealtime,
} from '../../src/screens/shiftHandover/service/shiftAlerts.realtime';

const fakeClient = () => {
  const subscribe = jest.fn();
  const get = jest.fn((name: string) => ({ name, subscribe }));
  const close = jest.fn();
  return { client: { channels: { get }, close }, get, subscribe, close };
};

const Probe = ({ clientId, createClient, onReminder }: any) => {
  useShiftAlertsRealtime(clientId, onReminder, createClient);
  return null;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOfflineClient.mockResolvedValue(null);
});

describe('CANAL DE ALERTAS POR CLIENTE', () => {
  it('SHIFT-01 el canal lleva el id del cliente y nunca es el global', () => {
    expect(shiftAlertsChannelForClient(7)).toBe('shift-handover:alerts:7');
    expect(shiftAlertsChannelForClient('42')).toBe('shift-handover:alerts:42');
    expect(shiftAlertsChannelForClient(7)).not.toBe('shift-handover:alerts');
  });

  it('SHIFT-02 sin cliente válido no hay canal', () => {
    [null, undefined, '', 0, -1, 'abc', NaN].forEach(value => {
      expect(shiftAlertsChannelForClient(value as any)).toBeNull();
    });
  });

  it('SHIFT-03 se suscribe al evento shift-reminder del canal del cliente', () => {
    const fake = fakeClient();
    const onReminder = jest.fn();
    const handle = subscribeToShiftAlerts('shift-handover:alerts:9', onReminder, () => fake.client);

    expect(fake.get).toHaveBeenCalledWith('shift-handover:alerts:9');
    expect(fake.subscribe).toHaveBeenCalledWith('shift-reminder', expect.any(Function));
    fake.subscribe.mock.calls[0][1]();
    expect(onReminder).toHaveBeenCalledTimes(1);
    handle?.close();
    expect(fake.close).toHaveBeenCalledTimes(1);
  });

  it('SHIFT-04 sin canal no crea conexión (sigue el polling)', () => {
    const createClient = jest.fn();
    expect(subscribeToShiftAlerts(null, jest.fn(), createClient)).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('CLIENTE ACTIVO DE LAS ALERTAS', () => {
  it('SHIFT-05 orden: tenant → offline → sesión', async () => {
    expect(
      await resolveActiveClientId({
        userId: 1,
        sessionClientId: 4,
        tenantClientId: 9,
        useOfflineClient: true,
      }),
    ).toBe(9);

    mockGetOfflineClient.mockResolvedValueOnce({ id: 11, name: 'Offline', type: 'RESIDENTIAL' });
    expect(
      await resolveActiveClientId({
        userId: 33,
        sessionClientId: 4,
        tenantClientId: null,
        useOfflineClient: true,
      }),
    ).toBe(11);

    expect(
      await resolveActiveClientId({ userId: 33, sessionClientId: 4, useOfflineClient: false }),
    ).toBe(4);
  });

  it('SHIFT-06 sin cliente o con base offline rota devuelve null/sesión', async () => {
    mockGetOfflineClient.mockRejectedValueOnce(new Error('sin SQLCipher'));
    expect(
      await resolveActiveClientId({ userId: 33, sessionClientId: 5, useOfflineClient: true }),
    ).toBe(5);
    expect(
      await resolveActiveClientId({ userId: 33, sessionClientId: null, useOfflineClient: true }),
    ).toBeNull();
  });
});

describe('RE-SUSCRIPCIÓN AL CAMBIAR DE CLIENTE', () => {
  it('SHIFT-07 cierra el canal anterior y abre el del cliente nuevo', async () => {
    const first = fakeClient();
    const second = fakeClient();
    const createClient = jest
      .fn()
      .mockReturnValueOnce(first.client)
      .mockReturnValueOnce(second.client);
    const onReminder = jest.fn();
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Probe clientId={1} createClient={createClient} onReminder={onReminder} />,
      );
    });

    expect(first.get).toHaveBeenCalledWith('shift-handover:alerts:1');

    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe clientId={2} createClient={createClient} onReminder={onReminder} />);
    });

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(second.get).toHaveBeenCalledWith('shift-handover:alerts:2');

    // El recordatorio del canal nuevo refresca el pendiente.
    await ReactTestRenderer.act(async () => {
      second.subscribe.mock.calls[0][1]();
    });
    expect(onReminder).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
    expect(second.close).toHaveBeenCalledTimes(1);
  });

  it('SHIFT-08 si el cliente desaparece se desuscribe y no abre conexión', async () => {
    const first = fakeClient();
    const createClient = jest.fn().mockReturnValueOnce(first.client);
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Probe clientId={5} createClient={createClient} onReminder={jest.fn()} />,
      );
    });

    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe clientId={null} createClient={createClient} onReminder={jest.fn()} />);
    });

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
