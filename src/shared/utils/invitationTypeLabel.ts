const LABELS: Record<string, string> = {
  VISITOR: 'Visita',
  VISITA: 'Visita',
  PROVIDER: 'Proveedor',
  PROVEEDOR: 'Proveedor',
  SERVICE: 'Servicio',
  SERVICIO: 'Servicio',
  DELIVERY: 'Entrega',
  ENTREGA: 'Entrega',
};

/** Traduce el nombre técnico del catálogo (VISITOR) a la etiqueta visible (Visita). */
export const invitationTypeLabel = (type?: { name?: string | null; value?: string | null } | string | null): string => {
  const raw = typeof type === 'string' ? type : (type?.name ?? type?.value ?? '');
  const key = raw.trim().toUpperCase();
  const fallback = typeof type === 'string' ? raw : type?.value ?? raw;
  return LABELS[key] ?? (fallback || 'Visita');
};
