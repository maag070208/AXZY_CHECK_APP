import { UserRole } from '../../core/types/IUser';

export interface RolePalette {
  role: string;
  primary: string;
  primarySoft: string;
  primaryDeep: string;
  accent: string;
  hero: string;
  heroDeep: string;
  heroAccent: string;
  label: string;
}

/**
 * Mismos colores por rol que el login WEB (LoginPage.tsx):
 * admin verde, jefe teal, guardia azul marino, residente violeta.
 */
const PALETTES: Record<string, RolePalette> = {
  ADMIN: {
    role: 'ADMIN',
    primary: '#065911',
    primarySoft: '#E8F7EF',
    primaryDeep: '#043D0B',
    accent: '#12A36F',
    hero: '#065911',
    heroDeep: '#022104',
    heroAccent: '#A7F3D0',
    label: 'Administración',
  },
  SHIFT: {
    role: 'SHIFT',
    primary: '#064E4B',
    primarySoft: '#E6FFFA',
    primaryDeep: '#033B39',
    accent: '#12A3A0',
    hero: '#064E4B',
    heroDeep: '#022C2A',
    heroAccent: '#99F6E4',
    label: 'Jefe de guardias',
  },
  GUARD: {
    role: 'GUARD',
    primary: '#0B2E4F',
    primarySoft: '#E0F2FE',
    primaryDeep: '#071F37',
    accent: '#0EA5E9',
    hero: '#0B2E4F',
    heroDeep: '#061A2C',
    heroAccent: '#BAE6FD',
    label: 'Guardia',
  },
  RESDN: {
    role: 'RESDN',
    primary: '#3B1D5A',
    primarySoft: '#F3E8FF',
    primaryDeep: '#2A1442',
    accent: '#A855F7',
    hero: '#3B1D5A',
    heroDeep: '#1E0F30',
    heroAccent: '#DDD6FE',
    label: 'Residente',
  },
  MAINT: {
    role: 'MAINT',
    primary: '#475569',
    primarySoft: '#F1F5F9',
    primaryDeep: '#334155',
    accent: '#64748B',
    hero: '#334155',
    heroDeep: '#1E293B',
    heroAccent: '#CBD5E1',
    label: 'Mantenimiento',
  },
};

export const getRolePalette = (role?: string | null): RolePalette =>
  PALETTES[role ?? 'ADMIN'] ?? PALETTES.ADMIN;

export const ROLE_PALETTES = PALETTES;
export const ROLE_KEYS = Object.keys(PALETTES) as UserRole[];
