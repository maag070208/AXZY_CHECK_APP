/**
 * Pantalla de selección de cliente (fase 6): estados loading/empty/error, selección,
 * inactivos no seleccionables y accesibilidad de las filas.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ClientPickerList } from '../../src/screens/clients/components/ClientPickerList';
import { Skeleton } from '../../src/shared/components/Skeleton';
import type { TenantClient } from '../../src/core/tenant/tenant.types';

const clients: TenantClient[] = [
  { id: 1, organizationId: 1, name: 'Residencial Norte', type: 'RESIDENTIAL', active: true },
  { id: 2, organizationId: 1, name: 'Plaza Centro', type: 'PLAZA', active: true },
  { id: 3, organizationId: 1, name: 'Maquila Sur', type: 'MAQUILA', active: false },
];

const render = async (props: React.ComponentProps<typeof ClientPickerList>) => {
  let renderer: any;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ClientPickerList {...props} />);
  });
  return renderer;
};

/** Texto plano del árbol (evita serializar props circulares del test renderer). */
const bodyText = (renderer: any): string => {
  const parts: string[] = [];
  renderer.root.findAll(() => true).forEach((node: any) => {
    const children = node.props?.children;
    if (typeof children === 'string') parts.push(children);
    else if (Array.isArray(children)) {
      children.forEach((child: any) => {
        if (typeof child === 'string') parts.push(child);
      });
    }
  });
  return parts.join('|');
};

describe('PANTALLA DE CLIENTE', () => {
  it('CLI-01 loading muestra skeletons de la forma del contenido', async () => {
    const renderer = await render({
      clients: [],
      selectedClientId: null,
      state: 'loading',
      onSelect: jest.fn(),
    });

    expect(renderer.root.findAllByType(Skeleton).length).toBe(3);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('CLI-02 empty explica que no hay clientes', async () => {
    const renderer = await render({
      clients: [],
      selectedClientId: null,
      state: 'empty',
      onSelect: jest.fn(),
    });

    expect(bodyText(renderer)).toContain('No hay clientes disponibles');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('CLI-03 error muestra Reintentar y lo dispara', async () => {
    const onRetry = jest.fn();
    const renderer = await render({
      clients: [],
      selectedClientId: null,
      state: 'error',
      onSelect: jest.fn(),
      onRetry,
    });

    expect(bodyText(renderer)).toContain('No pudimos cargar tus clientes');
    const retry = renderer.root
      .findAll((node: any) => node.props?.accessibilityLabel === 'Reintentar' && !!node.props?.onPress)
      .pop();
    expect(retry).toBeTruthy();
    await ReactTestRenderer.act(async () => retry.props.onPress());
    expect(onRetry).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('CLI-04 lista clientes con tipo y estado, y marca el seleccionado', async () => {
    const renderer = await render({
      clients,
      selectedClientId: 2,
      state: 'list',
      onSelect: jest.fn(),
    });

    const body = bodyText(renderer);
    expect(body).toContain('Residencial Norte');
    expect(body).toContain('Residencial · Activo');
    expect(body).toContain('Plaza Centro');
    expect(body).toContain('Maquila Sur');
    expect(body).toContain('Maquila · Inactivo');
    expect(body).toContain('INACTIVO');

    const selected = renderer.root.findAll(
      (node: any) =>
        typeof node.props?.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Cliente Plaza Centro') &&
        node.props?.accessibilityRole === 'button',
    )[0];
    expect(selected.props.accessibilityState).toMatchObject({ selected: true, disabled: false });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('CLI-05 al elegir un cliente avisa y los inactivos no son seleccionables', async () => {
    const onSelect = jest.fn();
    const renderer = await render({
      clients,
      selectedClientId: null,
      state: 'list',
      onSelect,
    });

    const rowFor = (label: string) =>
      renderer.root.findAll(
        (node: any) =>
          typeof node.props?.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith(label) &&
          node.props?.accessibilityRole === 'button',
      )[0];

    const active = rowFor('Cliente Residencial Norte');
    await ReactTestRenderer.act(async () => active.props.onPress());
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    const inactive = rowFor('Cliente Maquila Sur');
    expect(inactive.props.accessibilityState).toMatchObject({ disabled: true });
    expect(inactive.props.disabled).toBe(true);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
