import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../../../shared/theme/theme';
import { Novedad } from '../service/novedades.service';

interface NovedadesMessageProps {
  novedad: Novedad;
  isOwn: boolean;
}

/**
 * @description Burbuja individual de una novedad en tiempo real.
 */
export const NovedadesMessage = ({ novedad, isOwn }: NovedadesMessageProps) => (
  <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      <View style={[styles.header, isOwn ? styles.headerOwn : styles.headerOther]}>
        <Text style={[styles.author, isOwn ? styles.authorOwn : styles.authorOther]} numberOfLines={1}>
          {novedad.userName}
        </Text>
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {formatTime(novedad.createdAt)}
        </Text>
      </View>
      <Text style={[styles.message, isOwn ? styles.messageOwn : styles.messageOther]}>
        {novedad.message}
      </Text>
    </View>
  </View>
);

/** @description Formatea la hora de creación en formato HH:mm. */
const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  headerOwn: {
    justifyContent: 'flex-end',
  },
  headerOther: {
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  authorOwn: {
    color: theme.colors.primaryContainer,
  },
  authorOther: {
    color: theme.colors.primary,
  },
  time: {
    fontSize: 9,
    fontWeight: '500',
  },
  timeOwn: {
    color: theme.colors.primaryContainer,
  },
  timeOther: {
    color: theme.colors.grayDark,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  messageOwn: {
    color: theme.colors.onPrimary,
  },
  messageOther: {
    color: theme.colors.onBackground,
  },
});
