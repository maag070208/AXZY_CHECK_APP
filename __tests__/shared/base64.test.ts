import { bytesToBase64 } from '../../src/shared/utils/base64';

describe('bytesToBase64', () => {
  it('codifica 0, 1, 2 y 3 bytes con el relleno correcto', () => {
    expect(bytesToBase64(Uint8Array.from([]))).toBe('');
    expect(bytesToBase64(Uint8Array.from([37]))).toBe('JQ==');
    expect(bytesToBase64(Uint8Array.from([37, 80]))).toBe('JVA=');
    expect(bytesToBase64(Uint8Array.from([37, 80, 68]))).toBe('JVBE');
  });

  it('codifica la cabecera %PDF de un recibo', () => {
    expect(bytesToBase64(Uint8Array.from([37, 80, 68, 70]))).toBe('JVBERg==');
  });
});
