/**
 * Chat en vivo por cliente (multicliente).
 *
 * El API publica en `chat:team:<clientId>` y ya no existe el canal global `chat:team`.
 * La pantalla se suscribe al cliente activo, se re-suscribe al cambiar de asignación y,
 * sin cliente, no abre conexión (sigue el polling/REST).
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockGetOfflineClient = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../src/offline/client', () => ({
  getOfflineClient: (...args: any[]) => mockGetOfflineClient(...args),
}));
jest.mock('../../src/core/axios', () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
}));

import {
  chatChannelForClient,
  resolveChatClientId,
  subscribeToChatRealtime,
  useChatRealtime,
} from '../../src/screens/chat/service/chat.realtime';
import { getMessages, sendMessage } from '../../src/screens/chat/service/chat.service';

const fakeClient = () => {
  const subscribe = jest.fn();
  const get = jest.fn((name: string) => ({ name, subscribe }));
  const close = jest.fn();
  return { client: { channels: { get }, close }, get, subscribe, close };
};

const Probe = ({ clientId, createClient, onMessage }: any) => {
  useChatRealtime(clientId, onMessage, createClient);
  return null;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOfflineClient.mockResolvedValue(null);
  mockGet.mockResolvedValue({ success: true, data: [] });
  mockPost.mockResolvedValue({ success: true, data: { id: 1, message: 'hola' } });
});

describe('CANAL POR CLIENTE', () => {
  it('CHAT-CL-01 el canal lleva siempre el id del cliente', () => {
    expect(chatChannelForClient(7)).toBe('chat:team:7');
    expect(chatChannelForClient('42')).toBe('chat:team:42');
    expect(chatChannelForClient(7)).not.toBe('chat:team');
    expect(chatChannelForClient(7)?.startsWith('chat:team:')).toBe(true);
  });

  it('CHAT-CL-02 sin cliente válido no hay canal (nunca el global)', () => {
    [null, undefined, '', 0, -3, 'abc', NaN, 1.5].forEach(value => {
      expect(chatChannelForClient(value as any)).toBeNull();
    });
  });

  it('CHAT-CL-03 el suscriptor usa el canal del cliente', () => {
    const fake = fakeClient();
    const onMessage = jest.fn();
    const handle = subscribeToChatRealtime('chat:team:9', onMessage, () => fake.client);

    expect(fake.get).toHaveBeenCalledWith('chat:team:9');
    expect(fake.get).not.toHaveBeenCalledWith('chat:team');
    expect(fake.subscribe).toHaveBeenCalledWith('new-message', expect.any(Function));
    handle?.close();
    expect(fake.close).toHaveBeenCalledTimes(1);
  });

  it('CHAT-CL-04 sin canal no crea ninguna conexión', () => {
    const createClient = jest.fn();
    expect(subscribeToChatRealtime(null, jest.fn(), createClient)).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('CLIENTE ACTIVO DEL CHAT', () => {
  it('CHAT-CL-05 usa el cliente del offline y, si no hay, el de la sesión', async () => {
    mockGetOfflineClient.mockResolvedValueOnce({ id: 11, name: 'Norte', type: 'RESIDENTIAL' });
    expect(
      await resolveChatClientId({ userId: 33, sessionClientId: 4, useOfflineClient: true }),
    ).toBe(11);

    mockGetOfflineClient.mockResolvedValueOnce(null);
    expect(
      await resolveChatClientId({ userId: 33, sessionClientId: 4, useOfflineClient: true }),
    ).toBe(4);
  });

  it('CHAT-CL-06 sin cliente en sesión ni offline devuelve null (solo polling)', async () => {
    expect(
      await resolveChatClientId({ userId: 33, sessionClientId: null, useOfflineClient: true }),
    ).toBeNull();
    expect(
      await resolveChatClientId({ userId: 33, sessionClientId: 0, useOfflineClient: false }),
    ).toBeNull();
  });

  it('CHAT-CL-07 si la base offline falla, no rompe: cae a la sesión', async () => {
    mockGetOfflineClient.mockRejectedValueOnce(new Error('sin SQLCipher'));
    expect(
      await resolveChatClientId({ userId: 33, sessionClientId: 5, useOfflineClient: true }),
    ).toBe(5);
  });

  it('CHAT-CL-07b el cliente del selector (tenant) gana para ADMIN/MAINT', async () => {
    // Aunque haya cliente de sesión u offline, el cliente elegido en el selector manda.
    mockGetOfflineClient.mockResolvedValue({ id: 11, name: 'Offline', type: 'RESIDENTIAL' });
    expect(
      await resolveChatClientId({
        userId: 1,
        sessionClientId: 4,
        tenantClientId: 9,
        useOfflineClient: true,
      }),
    ).toBe(9);
  });

  it('CHAT-CL-07c sin cliente de tenant usa offline/sesión (resto de roles)', async () => {
    mockGetOfflineClient.mockResolvedValueOnce({ id: 11, name: 'Offline', type: 'RESIDENTIAL' });
    expect(
      await resolveChatClientId({
        userId: 33,
        sessionClientId: 4,
        tenantClientId: null,
        useOfflineClient: true,
      }),
    ).toBe(11);

    expect(
      await resolveChatClientId({
        userId: 33,
        sessionClientId: 4,
        tenantClientId: 0,
        useOfflineClient: false,
      }),
    ).toBe(4);
  });
});

describe('RE-SUSCRIPCIÓN AL CAMBIAR DE CLIENTE', () => {
  it('CHAT-CL-08 cierra el canal anterior y abre el del cliente nuevo', async () => {
    const first = fakeClient();
    const second = fakeClient();
    const createClient = jest
      .fn()
      .mockReturnValueOnce(first.client)
      .mockReturnValueOnce(second.client);
    const onMessage = jest.fn();
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Probe clientId={1} createClient={createClient} onMessage={onMessage} />,
      );
    });

    expect(first.get).toHaveBeenCalledWith('chat:team:1');
    expect(first.close).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe clientId={2} createClient={createClient} onMessage={onMessage} />);
    });

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(second.get).toHaveBeenCalledWith('chat:team:2');

    // El mensaje del canal nuevo llega a la lista de mensajes.
    await ReactTestRenderer.act(async () => {
      second.subscribe.mock.calls[0][1]({ data: { id: 90, message: 'en vivo' } });
    });
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 90 }));

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
    expect(second.close).toHaveBeenCalledTimes(1);
  });

  it('CHAT-CL-09 si el cliente desaparece, se desuscribe y no abre conexión', async () => {
    const first = fakeClient();
    const createClient = jest.fn().mockReturnValueOnce(first.client);
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Probe clientId={5} createClient={createClient} onMessage={jest.fn()} />,
      );
    });
    expect(createClient).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe clientId={null} createClient={createClient} onMessage={jest.fn()} />);
    });

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});

describe('CONTRATO REST SIN clientId', () => {
  it('CHAT-CL-10 los mensajes se piden sin clientId (el API ya no lo recibe)', async () => {
    await getMessages();
    const url = String(mockGet.mock.calls[0][0]);
    expect(url.startsWith('/chat/messages')).toBe(true);
    expect(url).not.toContain('clientId');
    expect(url).toBe('/chat/messages?limit=30');
  });

  it('CHAT-CL-11 al enviar solo viaja el mensaje, sin clientId en el payload', async () => {
    await sendMessage('hola');
    expect(mockPost).toHaveBeenCalledWith('/chat/messages', { message: 'hola' });
    const payload = mockPost.mock.calls[0][1];
    expect(payload).not.toHaveProperty('clientId');
  });
});
