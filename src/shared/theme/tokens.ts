/**
 * Tokens de diseño de la APP. Única fuente para colores, radios y tipografía de pantallas nuevas.
 * Basados en el formulario de reportes del guardia (ReportForm): es el estándar de la app.
 */
export const tokens = {
  color: {
    primary: '#065911',       // verde de marca: botones, selección, íconos activos
    primarySoft: '#E8F7EF',   // fondo suave de íconos y botones secundarios
    screen: '#F4F9F6',        // fondo de pantalla
    card: '#FFFFFF',
    border: '#E6EEE9',        // borde de tarjetas y encabezados
    borderStrong: '#CBD5E1',  // radio sin seleccionar
    textStrong: '#0F172A',    // títulos
    text: '#1E293B',
    textBody: '#475569',
    textMuted: '#64748B',     // etiquetas de sección
    textHint: '#94A3B8',      // ayudas y textos secundarios
    danger: '#EF4444',
    dangerSoft: '#FEF2F2',
    dangerStrong: '#B91C1C',
    // Bloque destacado (hero) del inicio del residente
    heroBg: '#0E3B2A',
    heroDeep: '#071A12',
    heroAccent: '#A7F3D0',
    heroSoft: '#D1FAE5',
    heroMuted: '#9FB8AC',
  },
  radius: {
    icon: 11,
    tile: 12,
    control: 14,
    card: 16,
    pill: 999,
  },
  font: {
    label: { fontSize: 12, fontWeight: '900' as const, color: '#64748B', letterSpacing: 0.6 },
    hint: { fontSize: 10, fontWeight: '600' as const, color: '#94A3B8' },
    title: { fontSize: 18, fontWeight: '900' as const, color: '#0F172A' },
    tileText: { fontSize: 12, fontWeight: '700' as const, color: '#475569', lineHeight: 15 },
  },
} as const;
