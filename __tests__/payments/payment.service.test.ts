import { get, getArrayBuffer } from '../../src/core/axios';
import { getMyBalance, getMyPaymentReceipt, getMyPayments } from '../../src/screens/payments/service/payment.service';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
  getArrayBuffer: jest.fn(),
}));

const mockGet = get as jest.Mock;
const mockGetArrayBuffer = getArrayBuffer as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('servicio de pagos (APP)', () => {
  it('consulta el saldo propio con el endpoint del residente', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { balance: 400, totalCharges: 1000, totalPaid: 600, applied: 600, credit: 0, pendingCharges: 1, currency: 'MXN', propertyId: 1 },
    });

    const result = await getMyBalance();
    expect(mockGet).toHaveBeenCalledWith('/residents/me/balance');
    expect(result.balance).toBe(400);
  });

  it('consulta cargos y pagos propios', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        summary: { balance: 0, totalCharges: 0, totalPaid: 0, applied: 0, credit: 0, pendingCharges: 0, currency: 'MXN', propertyId: 1 },
        charges: [{ id: 1, concept: 'Cuota', amount: 1000 }],
        payments: [{ id: 2, amount: 1000 }],
      },
    });

    const result = await getMyPayments();
    expect(mockGet).toHaveBeenCalledWith('/residents/me/payments');
    expect(result.charges).toHaveLength(1);
    expect(result.payments).toHaveLength(1);
  });

  it('convierte el error del API en un mensaje entendible', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, messages: ['Tu cuenta no está ligada a una propiedad activa'] });
    await expect(getMyPayments()).rejects.toThrow('Tu cuenta no está ligada a una propiedad activa');
  });

  it('convierte un error HTTP lanzado por axios en Error con el mensaje del API', async () => {
    mockGet.mockRejectedValue({ messages: ['El residente no tiene saldo pendiente'] });
    await expect(getMyBalance()).rejects.toThrow('El residente no tiene saldo pendiente');
  });

  it('descarga el recibo propio y lo convierte a base64 para compartir', async () => {
    mockGetArrayBuffer.mockResolvedValue(Uint8Array.from([37, 80, 68, 70]).buffer);
    const file = await getMyPaymentReceipt(9, 2);
    expect(mockGetArrayBuffer).toHaveBeenCalledWith('/residents/me/payments/9/receipt', {
      headers: { Accept: 'application/pdf' },
    });
    expect(file).toEqual({ base64: 'JVBERg==', filename: 'recibo-000002.pdf' });
  });

  it('propaga el mensaje cuando el recibo no se puede descargar', async () => {
    mockGetArrayBuffer.mockRejectedValue({ messages: ['Pago no encontrado'] });
    await expect(getMyPaymentReceipt(9)).rejects.toThrow('Pago no encontrado');
  });
});
