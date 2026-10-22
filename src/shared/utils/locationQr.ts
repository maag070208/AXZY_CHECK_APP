const SECRET = "checkapp.location.v1.2026";

const hash = (value: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

export const signLocationQr = (id: number) =>
  hash(`CHECKAPP|LOCATION|${id}|v1|${SECRET}`);

export const buildLocationQrPayload = (id: number) =>
  JSON.stringify({ app: "CHECKAPP", type: "LOCATION", v: 1, id, sig: signLocationQr(id) });

export interface LocationQrPayload {
  id: number;
}

/**
 * Solo acepta QRs emitidos por CheckApp para ubicaciones.
 * Devuelve null para cualquier QR ajeno, incompleto o alterado.
 */
export const parseLocationQrPayload = (raw: string): LocationQrPayload | null => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed?.app !== "CHECKAPP" ||
      parsed?.type !== "LOCATION" ||
      parsed?.v !== 1 ||
      !Number.isInteger(parsed?.id) ||
      parsed.id <= 0 ||
      parsed?.sig !== signLocationQr(parsed.id)
    ) {
      return null;
    }
    return { id: parsed.id };
  } catch {
    return null;
  }
};
