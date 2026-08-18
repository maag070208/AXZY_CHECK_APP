import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { theme } from '../../../shared/theme/theme';

export type ChangeKind = 'added' | 'modified' | 'removed';

interface ChangeItemProps {
  kind: ChangeKind;
  title: string;
  subtitle?: string;
  meta?: string;
}

/**
 * @description Fila visual reutilizable para representar un cambio individual
 * dentro del changelog (ruta agregada/modificada/eliminada, etc).
 */
export const ChangeItem: React.FC<ChangeItemProps> = ({ kind, title, subtitle, meta }) => {
  const { icon, color, bg, label } = getChangeStyle(kind);

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Icon source={icon} size={16} color={color} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.kindBadge, { backgroundColor: bg }]}>
            <Text style={[styles.kindBadgeText, { color }]}>{label}</Text>
          </View>
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </View>
  );
};

const getChangeStyle = (kind: ChangeKind) => {
  switch (kind) {
    case 'added':
      return {
        icon: 'plus-circle',
        color: '#059669',
        bg: '#ecfdf5',
        label: 'NUEVO',
      };
    case 'modified':
      return {
        icon: 'pencil-circle',
        color: '#2563eb',
        bg: '#eff6ff',
        label: 'EDITADO',
      };
    case 'removed':
      return {
        icon: 'minus-circle',
        color: '#dc2626',
        bg: '#fef2f2',
        label: 'ELIMINADO',
      };
  }
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  kindBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.grayDark,
    marginTop: 2,
  },
  meta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});
