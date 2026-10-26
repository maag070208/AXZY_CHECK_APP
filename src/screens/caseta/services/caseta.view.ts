import type { PassVerification } from './caseta.service';

export type Tone = 'ok' | 'warn' | 'deny';

export interface VerificationView {
  tone: Tone;
  title: string;
  detail: string;
}

const REASON_TEXT: Record<string, string> = {
  IN_SCHEDULE: 'Dentro de su horario autorizado.',
  OUT_OF_SCHEDULE: 'Fuera de su horario. Se avisó al titular para que decida.',
  REVOKED: 'El pase fue revocado.',
  EXPIRED: 'La autorización ya venció.',
  NOT_YET_VALID: 'La autorización todavía no está vigente.',
  SCOPE_MISMATCH: 'El pase no aplica a este tipo de acceso.',
  UNKNOWN_PASS: 'El pase no es válido.',
  NO_AUTHORIZATION: 'Esta persona no está autorizada en esta propiedad.',
  PROPERTY_DEBT: 'La propiedad tiene adeudo. La administración debe autorizar el acceso.',
};

/** Traduce la decisión del servidor a lo que el guardia necesita ver: tono, título y motivo. */
export const describeVerification = (result: PassVerification | null): VerificationView | null => {
  if (!result) return null;
  const name = result.person ? result.person.firstName : 'Pase';
  const detail = REASON_TEXT[result.reason] ?? 'No se pudo determinar el acceso.';
  switch (result.decision) {
    case 'AUTHORIZED':
      return { tone: 'ok', title: `Puede pasar: ${name}`, detail };
    case 'NEEDS_APPROVAL':
      return { tone: 'warn', title: `Esperar aprobación: ${name}`, detail };
    default:
      return { tone: 'deny', title: 'No puede pasar', detail };
  }
};
