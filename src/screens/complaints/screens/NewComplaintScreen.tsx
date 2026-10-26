import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../shared/components/AppButton';
import { CameraModal } from '../../check/components/CameraModal';
import { uploadFile } from '../../../shared/service/upload.service';
import { tokens } from '../../../shared/theme/tokens';
import {
  COMPLAINT_CATEGORIES,
  ComplaintCategory,
  ComplaintPhoto,
  createComplaint,
  MAX_COMPLAINT_PHOTOS,
} from '../service/complaint.service';

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

/** Sección numerada, igual que en el reporte del guardia: "1. TIPO DE QUEJA" + pista a la derecha. */
const SectionLabel = ({ index, text, hint }: { index: number; text: string; hint?: string }) => (
  <View style={styles.labelRow}>
    <Text style={styles.label}>{`${index}. ${text}`}</Text>
    {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
  </View>
);

export const NewComplaintScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ComplaintPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleError = title.trim().length > 0 && title.trim().length < TITLE_MIN
    ? `Debe tener al menos ${TITLE_MIN} caracteres`
    : undefined;
  const descriptionError = description.trim().length > 0 && description.trim().length < DESCRIPTION_MIN
    ? `Debe tener al menos ${DESCRIPTION_MIN} caracteres`
    : undefined;
  const canSubmit =
    !!category &&
    title.trim().length >= TITLE_MIN &&
    description.trim().length >= DESCRIPTION_MIN &&
    !uploading &&
    !sending;

  const onCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    setCameraOpen(false);
    setUploading(true);
    const result = await uploadFile(file.uri, 'image', 'complaints');
    setUploading(false);
    if (result.success && result.url && result.key && result.size) {
      setPhotos((current) => [...current, { type: 'IMAGE', url: result.url!, key: result.key!, size: result.size! }]);
      setError(null);
    } else {
      setError(result.error ?? 'No se pudo subir la foto. Inténtalo de nuevo.');
    }
  };

  const removePhoto = (key: string) => setPhotos((current) => current.filter((photo) => photo.key !== key));

  const submit = async () => {
    if (!category) return;
    setSending(true);
    setError(null);
    try {
      const complaint = await createComplaint({
        category,
        title: title.trim(),
        description: description.trim(),
        media: photos,
      });
      navigation.replace('COMPLAINT_DETAIL', { id: complaint.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la queja');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView extraScrollHeight={120} enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <SectionLabel index={1} text="TIPO DE QUEJA" />
        <View style={styles.grid}>
          {COMPLAINT_CATEGORIES.map((option) => {
            const selected = option.value === category;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setCategory(option.value)}
                style={[styles.tile, selected && styles.tileSelected]}
                activeOpacity={0.85}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={[styles.tileText, selected && styles.tileTextSelected]} numberOfLines={2}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLabel index={2} text="DETALLES" />
        <View style={styles.card}>
          <TextInput
            mode="outlined"
            label="Asunto"
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
            error={!!titleError}
            outlineColor={tokens.color.border}
            activeOutlineColor={tokens.color.primary}
            style={styles.input}
            accessibilityLabel="Asunto de la queja"
          />
          <Text style={styles.fieldHint}>{titleError ?? `De ${TITLE_MIN} a ${TITLE_MAX} caracteres.`}</Text>

          <TextInput
            mode="outlined"
            label="Describe lo que pasa"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={DESCRIPTION_MAX}
            error={!!descriptionError}
            outlineColor={tokens.color.border}
            activeOutlineColor={tokens.color.primary}
            style={styles.input}
            accessibilityLabel="Descripción de la queja"
          />
          <Text style={styles.fieldHint}>{descriptionError ?? `De ${DESCRIPTION_MIN} a ${DESCRIPTION_MAX} caracteres.`}</Text>
        </View>

        <SectionLabel index={3} text="FOTOS" hint={`Opcional · máximo ${MAX_COMPLAINT_PHOTOS}`} />
        <View style={styles.photoRow}>
          {photos.map((photo) => (
            <View key={photo.key} style={styles.photoItem}>
              <Image source={{ uri: photo.url }} style={styles.photoImg} accessibilityLabel="Foto adjunta" />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Quitar foto"
                onPress={() => removePhoto(photo.key)}
                style={styles.photoRemove}
              >
                <Icon source="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < MAX_COMPLAINT_PHOTOS && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tomar foto"
              onPress={() => setCameraOpen(true)}
              disabled={uploading}
              style={styles.addPhoto}
              activeOpacity={0.85}
            >
              <View style={styles.addIcon}>
                <Icon source="camera-plus-outline" size={22} color={tokens.color.primary} />
              </View>
              <Text style={styles.addText}>{uploading ? 'Subiendo…' : 'Tomar foto'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <AppButton label="Enviar queja" onPress={submit} disabled={!canSubmit} loading={sending} />
      </View>

      <CameraModal visible={cameraOpen} mode="photo" onDismiss={() => setCameraOpen(false)} onCapture={onCapture} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
  label: tokens.font.label,
  labelHint: tokens.font.hint,
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  tile: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tileSelected: { borderColor: tokens.color.primary, backgroundColor: tokens.color.primarySoft },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: tokens.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: tokens.color.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.color.primary },
  tileText: { ...tokens.font.tileText, flex: 1 },
  tileTextSelected: { color: tokens.color.primary },
  card: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 12,
  },
  input: { backgroundColor: tokens.color.card, fontSize: 14 },
  fieldHint: { ...tokens.font.hint, marginTop: 4, marginBottom: 10, marginLeft: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoItem: { position: 'relative' },
  photoImg: { width: 88, height: 88, borderRadius: tokens.radius.tile, backgroundColor: '#F1F5F9' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.color.borderStrong,
    backgroundColor: tokens.color.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addIcon: { width: 36, height: 36, borderRadius: tokens.radius.icon, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 11, fontWeight: '700', color: tokens.color.primary },
  error: { color: tokens.color.danger, marginTop: 12 },
  footer: {
    backgroundColor: tokens.color.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
  },
});
