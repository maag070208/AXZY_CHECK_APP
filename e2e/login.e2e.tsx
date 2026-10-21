/**
 * Flujo de login de la APP.
 *
 * Monta `MainNavigation` (pantalla de login real + gate de sesión), habla con
 * la API local que ya usa la app (`ENVIRONMENTS.LOCAL`) y valida que el token
 * real de la API deja la sesión iniciada y entra al navegador principal.
 *
 * No usa emulador ni Maestro: corre en Jest en segundos.
 */
import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import MainNavigation from '../src/navigation/MainNavigation';
import { axiosInstance } from '../src/core/axios';
import { store } from '../src/core/store/redux.config';
import { logout } from '../src/core/store/slices/user.slice';

// Dentro de Jest el build de axios para React Native no trae adaptador http
// (solo xhr/fetch, y `fetch` se queda colgado contra la IP de la LAN). Se usa
// un adaptador mínimo sobre el http de Node para hablar con la API real.
const nodeHttp = require('http');

const nodeAdapter = (config: any) =>
  new Promise((resolve, reject) => {
    const base = String(config.baseURL ?? '').replace(/\/$/, '');
    const url = new URL(`${base}${config.url}`);
    const body =
      typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {});
    const headers =
      typeof config.headers?.toJSON === 'function'
        ? config.headers.toJSON()
        : { ...config.headers };
    const request = nodeHttp.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: String(config.method ?? 'post').toUpperCase(),
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (response: any) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          raw += chunk;
        });
        response.on('end', () => {
          let data: unknown = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            // respuesta no JSON
          }
          const result = {
            data,
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: response.headers,
            config,
            request: {},
          };
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(result);
          } else {
            reject(Object.assign(new Error(`HTTP ${response.statusCode}`), { response: result }));
          }
        });
      },
    );
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });

axiosInstance.defaults.adapter = nodeAdapter as any;

jest.mock('../src/navigation/drawer/DrawerNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'DRAWER_HOME'),
  };
});

const flush = async (ms = 50) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

const findByText = (tree: ReactTestRenderer, text: string) =>
  tree.root.findAllByType(Text as any).find(node => node.props.children === text);

const findLoginButton = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find(node =>
      node.findAllByType(Text as any).some(child => child.props.children === 'Iniciar sesión'),
    );

describe('login (flujo real contra la API local)', () => {
  beforeEach(() => {
    store.dispatch(logout());
  });

  it('inicia sesión con aamaro/123456 y entra al navegador principal', async () => {
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <Provider store={store}>
          <PaperProvider>
            <MainNavigation />
          </PaperProvider>
        </Provider>,
      );
    });

    // Pantalla de login visible.
    expect(findByText(tree, 'Bienvenido')).toBeTruthy();

    const inputs = tree.root.findAllByType(TextInput as any);
    expect(inputs).toHaveLength(2);

    await act(async () => {
      inputs[0].props.onChangeText('aamaro');
      inputs[1].props.onChangeText('123456');
    });

    const button = findLoginButton(tree);
    expect(button).toBeTruthy();

    await act(async () => {
      button!.props.onPress();
    });

    // La petición real tarda unos ms: se espera a que Redux reciba el token.
    const started = Date.now();
    while (!store.getState().userState.isSignedIn && Date.now() - started < 10000) {
      await flush();
    }

    const user = store.getState().userState;
    expect(user.isSignedIn).toBe(true);
    expect(user.username).toBe('aamaro');
    expect(user.role).toBe('ADMIN');
    expect(user.token).toEqual(expect.any(String));

    // El gate de sesión reemplaza el login por el navegador principal.
    await flush();
    expect(findByText(tree, 'DRAWER_HOME')).toBeTruthy();
    expect(findLoginButton(tree)).toBeUndefined();

    // MainNavigation deja un setTimeout hasta el vencimiento del JWT: al
    // desmontar se limpia y Jest puede salir sin --forceExit.
    await act(async () => {
      tree.unmount();
    });
  });
});
