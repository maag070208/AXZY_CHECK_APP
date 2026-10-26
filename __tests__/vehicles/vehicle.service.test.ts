import { get, post, put, remove } from '../../src/core/axios';
import {
  createVehicle,
  deleteVehicle,
  getMyVehicles,
  lookupVehicles,
  registerVehicleAccess,
  updateVehicle,
} from '../../src/screens/vehicles/service/vehicle.service';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  remove: jest.fn(),
}));

const mockGet = get as jest.Mock;
const mockPost = post as jest.Mock;
const mockPut = put as jest.Mock;
const mockRemove = remove as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('servicio de vehículos (APP)', () => {
  it('consulta mis vehículos', async () => {
    mockGet.mockResolvedValue({ success: true, data: [{ id: 1, plate: 'ABC-123', status: 'PENDING', tagCode: null }] });
    const result = await getMyVehicles();
    expect(mockGet).toHaveBeenCalledWith('/vehicles/me');
    expect(result.data?.[0].plate).toBe('ABC-123');
  });

  it('registra un vehículo', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 1, plate: 'ABC-123', status: 'PENDING' } });
    const result = await createVehicle({ plate: 'ABC-123', brand: 'Toyota' });
    expect(mockPost).toHaveBeenCalledWith('/vehicles/me', { plate: 'ABC-123', brand: 'Toyota' });
    expect(result.data?.status).toBe('PENDING');
  });

  it('edita un vehículo y vuelve a revisión', async () => {
    mockPut.mockResolvedValue({ success: true, data: { id: 1, status: 'PENDING', tagCode: null } });
    const result = await updateVehicle(1, { plate: 'ABC-999' });
    expect(mockPut).toHaveBeenCalledWith('/vehicles/me/1', { plate: 'ABC-999' });
    expect(result.data?.tagCode).toBeNull();
  });

  it('elimina una solicitud', async () => {
    mockRemove.mockResolvedValue({ success: true, data: { id: 1 } });
    await deleteVehicle(1);
    expect(mockRemove).toHaveBeenCalledWith('/vehicles/me/1');
  });

  it('busca por placa o tag en caseta', async () => {
    mockGet.mockResolvedValue({ success: true, data: [{ id: 1, plate: 'ABC-123', tagCode: 'TAG-1' }] });
    const result = await lookupVehicles('TAG-1');
    expect(mockGet).toHaveBeenCalledWith('/vehicles/lookup', { params: { q: 'TAG-1' } });
    expect(result.data?.[0].tagCode).toBe('TAG-1');
  });

  it('registra entrada/salida manual', async () => {
    mockPost.mockResolvedValue({ success: true, data: { event: { decision: 'ALLOWED' } } });
    await registerVehicleAccess(1, 'ENTRY');
    expect(mockPost).toHaveBeenCalledWith('/vehicles/1/access', { direction: 'ENTRY' });
  });
});
