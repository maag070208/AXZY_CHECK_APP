import { processColor, StyleSheet } from 'react-native';
import { getActiveRolePalette } from './role-colors';

/**
 * Capa de compatibilidad para pantallas legacy que aún tienen el verde de marca
 * escrito en StyleSheet. Solo remapea colores de MARCA; los verdes semánticos
 * (success) se conservan.
 */
const PRIMARY = new Set(['#065911', '#1f8a3a', '#1F8A3A', '#059669']);
const ACCENT = new Set(['#12a36f', '#12A36F', '#0ea36f']);
const SOFT = new Set(['#e8f7ef', '#E8F7EF', '#f0fdf4', '#F0FDF4', '#ecfdf5', '#ECFDF5', '#f5fdf8', '#F5FDF8']);
const HERO = new Set(['#0e3b2a', '#0E3B2A', '#0b3d2a', '#0B3D2A']);
const HERO_DEEP = new Set(['#071a12', '#071A12', '#022104', '#022C2A']);

const map = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const palette = getActiveRolePalette();
  const key = value.trim();
  const mapped = PRIMARY.has(key)
    ? palette.primary
    : ACCENT.has(key)
      ? palette.accent
      : SOFT.has(key)
        ? palette.primarySoft
        : HERO.has(key)
          ? palette.hero
          : HERO_DEEP.has(key)
            ? palette.heroDeep
            : value;
  return processColor(mapped);
};

export const installBrandColorPreprocessor = () => {
  const colorProps = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
    'shadowColor',
    'tintColor',
    'textDecorationColor',
  ];
  colorProps.forEach(prop => StyleSheet.setStyleAttributePreprocessor(prop, map));
};
