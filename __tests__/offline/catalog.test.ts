const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockGet = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

jest.mock('../../src/core/axios', () => ({ get: (...args: any[]) => mockGet(...args) }));

import { getCatalog, primeCatalogCache } from '../../src/shared/service/catalog.service';

describe('catálogos offline', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockGet.mockReset();
  });

  it('usa la caché cuando la API falla', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    mockGetItem.mockResolvedValue(JSON.stringify([{ id: 1, value: 'Baches' }]));

    const result = await getCatalog('incident_type');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ id: 1, value: 'Baches' }]);
  });

  it('sin red y sin caché devuelve error controlado', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    mockGetItem.mockResolvedValue(null);

    const result = await getCatalog('incident_type');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.messages[0]).toMatch(/Conectate una vez/);
  });

  it('guarda la respuesta exitosa para el próximo uso offline', async () => {
    mockGet.mockResolvedValue({ success: true, data: [{ id: 2, value: 'Riego' }] });

    await getCatalog('incident_type');

    expect(mockSetItem).toHaveBeenCalledWith(
      'checkapp.catalog.v1.incident_type',
      JSON.stringify([{ id: 2, value: 'Riego' }]),
    );
  });

  it('primeCatalogCache permite precargar desde el snapshot', async () => {
    await primeCatalogCache('incident_category', [{ id: 3, value: 'Mantenimiento' }]);
    expect(mockSetItem).toHaveBeenCalledWith(
      'checkapp.catalog.v1.incident_category',
      JSON.stringify([{ id: 3, value: 'Mantenimiento' }]),
    );
  });
});
