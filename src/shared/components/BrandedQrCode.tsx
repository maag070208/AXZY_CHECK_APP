import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';

interface BrandedQrCodeProps {
  value: string;
  size?: number;
}

/** Mismo lenguaje visual que el QR de la hoja de rutas: panel verde, módulos blancos y pin central. */
export const BrandedQrCode = ({ value, size = 200 }: BrandedQrCodeProps) => {
  const panel = size + 16;
  const frame = panel + 16;
  const badge = Math.round(size * 0.22);

  return (
    <View style={[styles.frame, { width: frame, height: frame }]}>
      <View style={[styles.panel, { width: panel, height: panel }]}>
        <QRCode value={value} size={size} color="#FFFFFF" backgroundColor="#1C784D" ecl="H" quietZone={8} />
        <View style={[styles.pin, { width: badge, height: badge, borderRadius: badge * 0.3 }]}>
          <Icon source="map-marker" size={Math.round(badge * 0.5)} color="#1C784D" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: { backgroundColor: '#FFFFFF', borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 7 },
  panel: { position: 'relative', alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#1C784D', overflow: 'hidden' },
  pin: { position: 'absolute', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
