/**
 * Validadores de campos del residente. Mismas reglas que el API (core/validation/common.ts):
 * si cambian allá, cambian aquí.
 */

export const PHONE_RE = /^\d{10}$/;
export const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quita espacios, guiones y paréntesis; el API solo acepta dígitos. */
export const cleanPhone = (value: string) => value.replace(/[\s()-]/g, '');

/** Vacío = sin valor (válido). Si hay algo, debe ser de 10 dígitos exactos. */
export const phoneError = (value: string | null | undefined): string | undefined => {
  const v = cleanPhone(value ?? '');
  if (!v) return undefined;
  return PHONE_RE.test(v) ? undefined : 'Debe tener exactamente 10 dígitos';
};

/** Obligatorio o no, según `required`. Entre 2 y 120 caracteres, solo letras y signos de nombre. */
export const nameError = (value: string | null | undefined, { required = true, max = 120 } = {}): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return required ? 'Este campo es obligatorio' : undefined;
  if (v.length < 2) return 'Debe tener al menos 2 caracteres';
  if (v.length > max) return `No puede pasar de ${max} caracteres`;
  if (!NAME_RE.test(v)) return 'Solo puede tener letras, espacios, apóstrofes, guiones y puntos';
  return undefined;
};

/** Misma política que la API (S-25): 10 a 100 caracteres, con al menos una letra y un número. */
export const passwordError = (value: string | null | undefined): string | undefined => {
  const v = value ?? '';
  if (v.length < 10) return 'Debe tener al menos 10 caracteres';
  if (v.length > 100) return 'No puede pasar de 100 caracteres';
  if (!/[A-Za-z]/.test(v)) return 'Debe incluir al menos una letra';
  if (!/\d/.test(v)) return 'Debe incluir al menos un número';
  return undefined;
};

/** Vacío = válido (opcional). Si hay algo: entre 6 y 120 caracteres con formato de correo. */
export const emailError = (value: string | null | undefined): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  if (v.length < 6) return 'Debe tener al menos 6 caracteres';
  if (v.length > 120) return 'No puede pasar de 120 caracteres';
  return EMAIL_RE.test(v) ? undefined : 'Ingresa un correo válido, por ejemplo nombre@correo.com';
};

/** Texto con mínimo y máximo. `required` decide si vacío es error. */
export const textError = (
  value: string | null | undefined,
  { min, max, required = false }: { min: number; max: number; required?: boolean },
): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return required ? 'Este campo es obligatorio' : undefined;
  if (v.length < min) return `Debe tener al menos ${min} caracteres`;
  if (v.length > max) return `No puede pasar de ${max} caracteres`;
  return undefined;
};
