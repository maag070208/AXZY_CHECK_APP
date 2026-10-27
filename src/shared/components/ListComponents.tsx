import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, Searchbar } from 'react-native-paper';
import { tokens } from '../theme/tokens';
import { useRolePalette } from '../theme/RoleThemeProvider';

/** Encabezado de sección numerado: "1. CONTACTOS" con pista a la derecha. Igual en todas las listas. */
export const ListSectionHeader = ({ index, text, hint }: { index: number; text: string; hint?: string }) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionLabel}>{`${index}. ${text}`}</Text>
    {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
  </View>
);

/** Buscador de las listas: mismo borde, radio y altura en todas las pantallas. */
export const ListSearch = ({ placeholder, value, onChangeText, onSubmitEditing }: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
}) => {
  const palette = useRolePalette();
  return (
  <Searchbar
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    onSubmitEditing={onSubmitEditing}
    style={styles.search}
    inputStyle={styles.searchInput}
    iconColor={palette.primary}
    placeholderTextColor={tokens.color.textHint}
    elevation={0}
  />
  );
};

/** Avatar de la fila: foto si existe; si no, ícono o inicial. */
export const ListAvatar = ({ photoUrl, icon, initial }: { photoUrl?: string | null; icon?: string; initial?: string }) => {
  const palette = useRolePalette();
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={[styles.avatarImg, { backgroundColor: palette.primarySoft }]} accessibilityLabel="Foto" />;
  return (
    <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
      {icon ? <Icon source={icon as any} size={22} color={palette.primary} /> : <Text style={[styles.avatarText, { color: palette.primary }]}>{initial ?? '?'}</Text>}
    </View>
  );
};

/** Fila de lista: tarjeta con borde. Título, detalle, meta y, opcionalmente, badge y acciones a la derecha. */
export const ListRowCard = ({ avatar, title, subtitle, meta, badge, actions, onPress, accessibilityLabel }: {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) => {
  const body = (
    <View style={styles.row}>
      {avatar}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        {meta}
      </View>
      {badge ? <View style={styles.badgeCol}>{badge}</View> : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
  if (!onPress) return <View style={styles.card}>{body}</View>;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </TouchableOpacity>
  );
};

/** Chip de estado compacto para la fila. */
export const StatusChip = ({ label, color, background }: { label: string; color: string; background: string }) => (
  <View style={[styles.chip, { backgroundColor: background }]}>
    <View style={[styles.chipDot, { backgroundColor: color }]} />
    <Text style={[styles.chipText, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  sectionLabel: { ...tokens.font.label },
  sectionHint: { ...tokens.font.hint },
  search: { backgroundColor: tokens.color.card, borderRadius: tokens.radius.control, borderWidth: 1, borderColor: tokens.color.border, height: 52 },
  searchInput: { fontSize: 14, color: tokens.color.textStrong, minHeight: 0 },
  avatar: { width: 44, height: 44, borderRadius: tokens.radius.control, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: tokens.radius.control, backgroundColor: tokens.color.primarySoft },
  avatarText: { fontSize: 17, fontWeight: '900', color: tokens.color.primary },
  card: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800', color: tokens.color.textStrong },
  subtitle: { fontSize: 12, color: tokens.color.textMuted },
  badgeCol: { alignItems: 'flex-end', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: tokens.radius.pill },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
});
