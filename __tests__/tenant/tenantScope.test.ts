/**
 * Fase 6 multicliente APP: tenant slice y persistencia por usuario, header X-Client-Id,
 * restauración/auto-selección, estados del selector, rol CLIENT en menú/home y chat por tenant.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockStorage: Record<string, string> = {
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStorage[key];
    }),
  },
}));

import {
  clearTenant,
  selectClient,
  setTenantClients,
  setTenantError,
  setTenantLoading,
  tenantSlice,
} from '../../src/core/store/slices/tenant.slice';
import {
  activeTenantClients,
  clientPickerState,
  clientScopeHeaderFor,
  clientTypeLabel,
  isTenantRole,
  resolveInitialTenantClientId,
  selectedTenantClient,
  tenantSelectionRequired,
} from '../../src/core/tenant/tenant.utils';
import {
  clearPersistedTenantClientId,
  loadPersistedTenantClientId,
  persistTenantClientId,
  tenantStorageKey,
} from '../../src/core/tenant/tenant.storage';
import type { TenantClient } from '../../src/core/tenant/tenant.types';
import { hasPermission } from '../../src/core/permissions/check';
import { P, ROLE_PERMISSIONS } from '../../src/core/permissions/permissions';
import { visibleMenuItems } from '../../src/navigation/drawer/menuItems';
import { homeKindForRole } from '../../src/screens/home/home-role';
import { getRolePalette } from '../../src/shared/theme/role-colors';

const reducer = tenantSlice.reducer;

const client = (id: number, overrides: Partial<TenantClient> = {}): TenantClient => ({
  id,
  organizationId: 1,
  name: `Cliente ${id}`,
  type: 'RESIDENTIAL',
  active: true,
  ...overrides,
});

const canFor = (role: string | null) => (required: any, mode: 'any' | 'all' = 'any') =>
  hasPermission(required, mode, null, role);

beforeEach(() => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  jest.clearAllMocks();
});

describe('TENANT SLICE', () => {
  it('TEN-01 carga, selecciona, marca error y limpia', () => {
    let state = reducer(undefined, { type: '@@init' });
    expect(state).toMatchObject({ clients: [], selectedClientId: null, status: 'idle' });

    state = reducer(state, setTenantLoading());
    expect(state.status).toBe('loading');

    state = reducer(state, setTenantClients([client(1), client(2)]));
    expect(state.clients).toHaveLength(2);
    expect(state.status).toBe('ready');

    state = reducer(state, selectClient(2));
    expect(state.selectedClientId).toBe(2);

    state = reducer(state, setTenantError());
    expect(state.status).toBe('error');

    state = reducer(state, clearTenant());
    expect(state).toMatchObject({ clients: [], selectedClientId: null, status: 'idle' });
  });

  it('TEN-02 selectClient acepta limpiar la selección', () => {
    let state = reducer(undefined, setTenantClients([client(1)]));
    state = reducer(state, selectClient(1));
    state = reducer(state, selectClient(null));
    expect(state.selectedClientId).toBeNull();
  });
});

describe('HEADER X-Client-Id', () => {
  it('TEN-03 solo ADMIN/MAINT con cliente seleccionado lo mandan', () => {
    expect(clientScopeHeaderFor('ADMIN', 7)).toEqual({ 'X-Client-Id': '7' });
    expect(clientScopeHeaderFor('MAINT', 12)).toEqual({ 'X-Client-Id': '12' });
  });

  it('TEN-04 nunca para otros roles, ni sin cliente, ni con ids inválidos', () => {
    ['GUARD', 'SHIFT', 'RESDN', 'CLIENT', 'UNKNOWN', null, undefined].forEach(role => {
      expect(clientScopeHeaderFor(role as any, 7)).toEqual({});
    });
    [null, undefined, 0, -2, 'abc', NaN].forEach(id => {
      expect(clientScopeHeaderFor('ADMIN', id as any)).toEqual({});
    });
  });

  it('TEN-05 identifica los roles de organización', () => {
    expect(isTenantRole('ADMIN')).toBe(true);
    expect(isTenantRole('MAINT')).toBe(true);
    expect(isTenantRole('CLIENT')).toBe(false);
    expect(isTenantRole('GUARD')).toBe(false);
  });
});

describe('RESTAURACIÓN Y AUTO-SELECCIÓN', () => {
  const clients = [client(1), client(2), client(3)];

  it('TEN-06 restaura la selección persistida si sigue existiendo', () => {
    expect(resolveInitialTenantClientId(clients, 2)).toBe(2);
  });

  it('TEN-07 selección persistida inválida: multi-cliente pide elegir', () => {
    expect(resolveInitialTenantClientId(clients, 99)).toBeNull();
    expect(resolveInitialTenantClientId(clients, null)).toBeNull();
  });

  it('TEN-08 un solo cliente activo se auto-selecciona', () => {
    expect(resolveInitialTenantClientId([client(5)], null)).toBe(5);
    // Con persisted inválido también gana el único activo.
    expect(resolveInitialTenantClientId([client(5)], 99)).toBe(5);
    // Los inactivos no cuentan.
    expect(resolveInitialTenantClientId([client(5), client(6, { active: false })], null)).toBe(5);
  });

  it('TEN-09 sin clientes activos no hay selección; persistido inactivo es inválido', () => {
    expect(resolveInitialTenantClientId([client(1, { active: false })], 1)).toBeNull();
    expect(resolveInitialTenantClientId([], null)).toBeNull();
    expect(selectedTenantClient(clients, 2)?.id).toBe(2);
    expect(selectedTenantClient(clients, 99)).toBeNull();
    expect(activeTenantClients([client(1), client(2, { active: false })])).toHaveLength(1);
  });

  it('TEN-10 el gate pide cliente solo a ADMIN/MAINT multicliente sin selección', () => {
    expect(tenantSelectionRequired('ADMIN', clients, null)).toBe(true);
    expect(tenantSelectionRequired('MAINT', clients, null)).toBe(true);
    expect(tenantSelectionRequired('ADMIN', clients, 2)).toBe(false);
    expect(tenantSelectionRequired('ADMIN', [client(1)], null)).toBe(false);
    expect(tenantSelectionRequired('GUARD', clients, null)).toBe(false);
    expect(tenantSelectionRequired('CLIENT', clients, null)).toBe(false);
  });

  it('TEN-11 el tipo de cliente se muestra legible', () => {
    expect(clientTypeLabel('RESIDENTIAL')).toBe('Residencial');
    expect(clientTypeLabel('MAQUILA')).toBe('Maquila');
    expect(clientTypeLabel('PLAZA')).toBe('Plaza');
    expect(clientTypeLabel(null)).toBe('');
  });
});

describe('PERSISTENCIA POR USUARIO', () => {
  it('TEN-12 guarda y restaura por usuario, sin mezclar cuentas', async () => {
    await persistTenantClientId(10, 3);
    await persistTenantClientId(11, 8);

    expect(tenantStorageKey(10)).not.toBe(tenantStorageKey(11));
    expect(await loadPersistedTenantClientId(10)).toBe(3);
    expect(await loadPersistedTenantClientId(11)).toBe(8);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
  });

  it('TEN-13 borra la selección al cerrar sesión (logout) sin tocar otras cuentas', async () => {
    await persistTenantClientId(10, 3);
    await persistTenantClientId(11, 8);

    await clearPersistedTenantClientId(10);

    expect(await loadPersistedTenantClientId(10)).toBeNull();
    expect(await loadPersistedTenantClientId(11)).toBe(8);
  });

  it('TEN-14 datos corruptos o vacíos no rompen la restauración', async () => {
    mockStorage[tenantStorageKey(20)] = '{no-es-json';
    expect(await loadPersistedTenantClientId(20)).toBeNull();
    mockStorage[tenantStorageKey(21)] = JSON.stringify({ selectedClientId: 0 });
    expect(await loadPersistedTenantClientId(21)).toBeNull();
    expect(await loadPersistedTenantClientId(22)).toBeNull();
  });
});

describe('ESTADOS DE LA PANTALLA DE CLIENTE', () => {
  it('TEN-15 loading, error, empty y lista', () => {
    expect(clientPickerState('idle', [])).toBe('loading');
    expect(clientPickerState('loading', [])).toBe('loading');
    expect(clientPickerState('error', [])).toBe('error');
    expect(clientPickerState('ready', [])).toBe('empty');
    expect(clientPickerState('ready', [client(1)])).toBe('list');
  });
});

describe('ROL CLIENT EN MENÚ Y HOME', () => {
  it('TEN-16 CLIENT ve Inicio y Quejas, no los módulos de organización ni el selector', () => {
    const labels = visibleMenuItems('CLIENT', canFor('CLIENT')).map(item => item.label);

    expect(labels).toContain('Inicio');
    expect(labels).toContain('Quejas');
    expect(labels).not.toContain('Cliente');
    expect(labels).not.toContain('Guardias');
    expect(labels).not.toContain('Usuarios');
    expect(labels).not.toContain('Chat');
  });

  it('TEN-17 ADMIN/MAINT ven el ítem Cliente; GUARD no', () => {
    const admin = visibleMenuItems('ADMIN', canFor('ADMIN')).map(item => item.label);
    const maint = visibleMenuItems('MAINT', canFor('MAINT')).map(item => item.label);
    const guard = visibleMenuItems('GUARD', canFor('GUARD')).map(item => item.label);

    expect(admin).toContain('Cliente');
    expect(maint).toContain('Cliente');
    expect(guard).not.toContain('Cliente');
    expect(admin).toContain('Inicio');
    // Quejas sigue acotada a RESDN/CLIENT (roles explícitos del ítem).
    expect(admin).not.toContain('Quejas');
  });

  it('TEN-18 el home de CLIENT es el dashboard administrativo', () => {
    expect(homeKindForRole('CLIENT')).toBe('admin');
    expect(homeKindForRole('ADMIN')).toBe('admin');
    expect(homeKindForRole('SHIFT')).toBe('shift');
    expect(homeKindForRole('GUARD')).toBe('guard');
    expect(homeKindForRole('MAINT')).toBe('guard');
    expect(homeKindForRole('RESDN')).toBe('resident');
    expect(homeKindForRole(null)).toBe('generic');
  });

  it('TEN-19 permisos: client.view para ADMIN/MAINT y matriz CLIENT', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toContain(P.CLIENT_VIEW);
    expect(ROLE_PERMISSIONS.MAINT).toContain(P.CLIENT_VIEW);
    expect(ROLE_PERMISSIONS.CLIENT).toContain(P.DASHBOARD_VIEW);
    expect(ROLE_PERMISSIONS.CLIENT).toContain(P.COMPLAINT_VIEW);
    expect(ROLE_PERMISSIONS.CLIENT).not.toContain(P.CHAT_USE);
    expect(hasPermission(P.CLIENT_VIEW, 'any', null, 'CLIENT')).toBe(false);
  });

  it('TEN-20 CLIENT tiene paleta própria (ámbar) y no cae en admin', () => {
    const palette = getRolePalette('CLIENT');
    expect(palette.role).toBe('CLIENT');
    expect(palette.primary).toBe('#B45309');
    expect(palette.label).toBe('Administrador de cliente');
  });
});
