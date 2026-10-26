/**
 * Codificador base64 mínimo para archivos pequeños (recibos PDF) en React Native,
 * donde no hay `Buffer` ni `btoa` garantizados en Hermes.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    output += ALPHABET[first >> 2];
    output += ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output += second === undefined ? '=' : ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? '=' : ALPHABET[third & 0x3f];
  }
  return output;
};
