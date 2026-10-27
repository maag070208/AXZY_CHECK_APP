import React from 'react';
import { SvgXml } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useRolePalette } from '../theme/RoleThemeProvider';
import { ROLE_MARKS } from '../assets/roles/roleMarks';

const ROLE_LOTTIE: Record<string, any> = {
  ADMIN: require('../assets/lottie/roles/admin/checkapp-icon_lottie-admin.json'),
  SHIFT: require('../assets/lottie/roles/shift/checkapp-icon_lottie-shift.json'),
  GUARD: require('../assets/lottie/roles/guard/checkapp-icon_lottie-guard.json'),
  RESDN: require('../assets/lottie/roles/resdn/checkapp-icon_lottie-resdn.json'),
  MAINT: require('../assets/lottie/roles/maint/checkapp-icon_lottie-maint.json'),
};

/** Marca CheckApp del rol, en SVG (para headers/drawer). */
export const RoleMark = ({ size = 22 }: { size?: number }) => {
  const { role } = useRolePalette();
  const xml = ROLE_MARKS[role] ?? ROLE_MARKS.ADMIN;
  return <SvgXml xml={xml} width={size} height={size} />;
};

/** Icono animado del rol para el login. */
export const RoleLottieIcon = ({ size = 74 }: { size?: number }) => {
  const { role } = useRolePalette();
  return (
    <LottieView
      source={ROLE_LOTTIE[role] ?? ROLE_LOTTIE.ADMIN}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  );
};
