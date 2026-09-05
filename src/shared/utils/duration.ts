/**
 * Formatea una duración en minutos a texto legible en español:
 * años / meses / días / horas / minutos, omitiendo las unidades grandes que
 * valgan cero. Evita frases confusas como "5010 horas".
 * @example formatDuration(5010) -> "6 meses 28 días 18 horas"
 */
export const formatDuration = (minutes: number): string => {
  const total = Math.floor(Math.max(0, minutes));
  if (total === 0) return 'menos de 1 min';

  const HOUR = 60;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const years = Math.floor(total / YEAR);
  const months = Math.floor((total % YEAR) / MONTH);
  const days = Math.floor((total % MONTH) / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const mins = Math.floor(total % HOUR);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (mins > 0) parts.push(`${mins} min`);
  return parts.join(' ');
};

/** "hace X años/meses/días/horas" a partir de un timestamp ISO. */
export const timeAgo = (value: string | null | undefined): string => {
  if (!value) return 'Sin actividad';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'hace unos segundos';
  return `hace ${formatDuration(minutes)}`;
};