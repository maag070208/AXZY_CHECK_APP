import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { AppButton } from '../../../shared/components/AppButton';
import { PhotoSourceDialog } from '../../../shared/components/PhotoSourceDialog';
import { pickPhotoFromGallery } from '../../../shared/service/photo-picker.service';
import { isSpeechAvailable, startSpeech, stopSpeech } from '../../../shared/service/speech.service';
import { uploadFile } from '../../../shared/service/upload.service';
import { tokens } from '../../../shared/theme/tokens';
import { CameraModal } from '../../check/components/CameraModal';
import {
  COMPLAINT_CATEGORIES,
  ComplaintCategory,
  ComplaintPhoto,
  createComplaint,
  MAX_COMPLAINT_PHOTOS,
  MAX_COMPLAINT_VIDEO_SECONDS,
} from '../service/complaint.service';

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const EVIDENCE_MAX = MAX_COMPLAINT_PHOTOS; // fotos + video juntos

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
  const dispatch = useDispatch();
  const scrollRef = useRef<any>(null);
  const [evidenceY, setEvidenceY] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<ComplaintPhoto[]>([]);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dictating, setDictating] = useState(false);
  const dictationBase = useRef('');

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  /** Dictado por voz, igual que en el reporte del guardia. */
  const toggleDictation = async () => {
    if (dictating) {
      stopSpeech();
      return;
    }
    if (!isSpeechAvailable) {
      dispatch(showToast({ message: 'El dictado no está disponible. Compila la app para activarlo.', type: 'error' }));
      return;
    }
    const base = description.trim();
    dictationBase.current = base;
    setDictating(true);
    try {
      const spoken = await startSpeech((partial) => {
        setDescription(`${base ? `${base} ` : ''}${partial}`.trim());
      });
      const finalText = `${base ? `${base} ` : ''}${spoken}`.trim();
      if (finalText) setDescription(finalText);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'No se pudo dictar. Intenta de nuevo.', type: 'error' }));
    } finally {
      setDictating(false);
    }
  };
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVideo = evidence.some((item) => item.type === 'VIDEO');
  const evidenceFull = evidence.length >= EVIDENCE_MAX;
  const descriptionError = description.trim().length > 0 && description.trim().length < DESCRIPTION_MIN
    ? `Debe tener al menos ${DESCRIPTION_MIN} caracteres`
    : undefined;
  const canSubmit = !!category && description.trim().length >= DESCRIPTION_MIN && !uploading && !sending;

  /** Al elegir el tipo: baja a la evidencia y la resalta, como en el reporte de incidencias. */
  const selectCategory = (value: ComplaintCategory) => {
    setCategory(value);
    scrollRef.current?.scrollToPosition(0, Math.max(evidenceY - 90, 0), true);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.035, duration: 160, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  /** Sube un archivo (foto o video) y lo agrega a la evidencia. */
  const addEvidence = async (uri: string, kind: 'image' | 'video') => {
    setUploading(true);
    const result = await uploadFile(uri, kind, 'complaints');
    setUploading(false);
    if (result.success && result.url && result.key && result.size) {
      setEvidence((current) => [...current, { type: kind === 'video' ? 'VIDEO' : 'IMAGE', url: result.url!, key: result.key!, size: result.size! }]);
      setError(null);
    } else {
      setError(result.error ?? 'No se pudo subir el archivo. Inténtalo de nuevo.');
    }
  };

  const pickFromGallery = async () => {
    setPhotoSourceOpen(false);
    try {
      const uri = await pickPhotoFromGallery();
      if (uri) await addEvidence(uri, 'image');
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo abrir la galería' }));
    }
  };

  const removeEvidence = (key: string) => setEvidence((current) => current.filter((item) => item.key !== key));

  const submit = async () => {
    if (!category) return;
    const categoryLabel = COMPLAINT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
    setSending(true);
    setError(null);
    try {
      const complaint = await createComplaint({
        category,
        // El asunto se genera solo a partir del tipo de queja.
        title: `Queja: ${categoryLabel}`,
        description: description.trim(),
        media: evidence,
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
      <KeyboardAwareScrollView
        ref={scrollRef}
        extraScrollHeight={120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
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
                onPress={() => selectCategory(option.value)}
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

        <View onLayout={(e) => setEvidenceY(e.nativeEvent.layout.y)}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <SectionLabel index={2} text="EVIDENCIA" hint={`Foto o video · ${evidence.length}/${EVIDENCE_MAX}`} />
          </Animated.View>

          {evidence.length > 0 && (
            <View style={styles.mediaList}>
              {evidence.map((item) => (
                <View key={item.key} style={styles.mediaItem}>
                  {item.type === 'IMAGE' ? (
                    <Image source={{ uri: item.url }} style={styles.mediaImg} accessibilityLabel="Foto adjunta" />
                  ) : (
                    <View style={[styles.mediaImg, styles.videoTile]}>
                      <Icon source="video-outline" size={28} color={tokens.color.card} />
                      <Text style={styles.videoLabel}>Video</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Quitar evidencia"
                    onPress={() => removeEvidence(item.key)}
                    style={styles.mediaRemove}
                  >
                    <Icon source="close" size={14} color={tokens.color.card} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            {!evidenceFull && (
              <TouchableOpacity
                style={[styles.captureRow, !category && styles.captureRowIdle]}
                accessibilityRole="button"
                accessibilityLabel="Tomar foto de la evidencia"
                onPress={() => setPhotoSourceOpen(true)}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <View style={styles.captureIcon}>
                  <Icon source="camera-plus-outline" size={20} color={tokens.color.primary} />
                </View>
                <View style={styles.captureText}>
                  <Text style={styles.captureTitle}>{uploading ? 'Subiendo…' : 'Tomar foto'}</Text>
                  <Text style={styles.captureSub}>Cámara o galería</Text>
                </View>
                <Icon source="chevron-right" size={20} color={tokens.color.textHint} />
              </TouchableOpacity>
            )}

            {!evidenceFull && !hasVideo && (
              <TouchableOpacity
                style={[styles.captureRow, styles.captureRowSpaced, !category && styles.captureRowIdle]}
                accessibilityRole="button"
                accessibilityLabel="Grabar video de la evidencia"
                onPress={() => setVideoOpen(true)}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <View style={styles.captureIcon}>
                  <Icon source="video-plus-outline" size={20} color={tokens.color.primary} />
                </View>
                <View style={styles.captureText}>
                  <Text style={styles.captureTitle}>Grabar video</Text>
                  <Text style={styles.captureSub}>Opcional · máximo {MAX_COMPLAINT_VIDEO_SECONDS} s</Text>
                </View>
                <Icon source="chevron-right" size={20} color={tokens.color.textHint} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        <SectionLabel index={3} text="OBSERVACIONES" hint="Opcional" />
        <TextInput
          mode="outlined"
          multiline
          placeholder="Describe lo sucedido brevemente..."
          value={description}
          onChangeText={setDescription}
          maxLength={DESCRIPTION_MAX}
          error={!!descriptionError}
          style={styles.textInput}
          contentStyle={styles.textInputContent}
          outlineColor={tokens.color.border}
          activeOutlineColor={tokens.color.primary}
          outlineStyle={{ borderRadius: 14 }}
          accessibilityLabel="Descripción de la queja"
          right={
            <TextInput.Icon
              icon={dictating ? 'stop-circle-outline' : 'microphone-outline'}
              color={dictating ? '#E53935' : tokens.color.textMuted}
              onPress={toggleDictation}
              accessibilityLabel={dictating ? 'Detener dictado' : 'Dictar descripción'}
            />
          }
        />
        <Text style={styles.fieldHint}>{descriptionError ?? `Mínimo ${DESCRIPTION_MIN} caracteres.`}</Text>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <AppButton label="Enviar queja" onPress={submit} disabled={!canSubmit} loading={sending} />
      </View>

      <PhotoSourceDialog
        visible={photoSourceOpen}
        title="Foto de la evidencia"
        message="Elige cómo quieres agregar la foto."
        onCamera={() => { setPhotoSourceOpen(false); setCameraOpen(true); }}
        onGallery={pickFromGallery}
        onCancel={() => setPhotoSourceOpen(false)}
      />
      <CameraModal
        visible={cameraOpen}
        mode="photo"
        onDismiss={() => setCameraOpen(false)}
        onCapture={(file) => { setCameraOpen(false); void addEvidence(file.uri, 'image'); }}
      />
      <CameraModal
        visible={videoOpen}
        mode="video"
        maxDuration={MAX_COMPLAINT_VIDEO_SECONDS}
        onDismiss={() => setVideoOpen(false)}
        onCapture={(file) => { setVideoOpen(false); void addEvidence(file.uri, 'video'); }}
      />
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
  mediaList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  mediaItem: { position: 'relative' },
  mediaImg: { width: 88, height: 88, borderRadius: tokens.radius.tile, backgroundColor: '#F1F5F9' },
  videoTile: { backgroundColor: tokens.color.heroBg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  videoLabel: { fontSize: 10, fontWeight: '700', color: tokens.color.card },
  mediaRemove: {
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
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    backgroundColor: tokens.color.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    paddingHorizontal: 12,
  },
  captureRowSpaced: { marginTop: 8 },
  captureRowIdle: { opacity: 0.85 },
  captureIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.icon,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureText: { flex: 1 },
  captureTitle: { fontSize: 13, fontWeight: '800', color: tokens.color.textStrong },
  captureSub: { ...tokens.font.hint, marginTop: 2 },
  card: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 12,
  },
  textInput: { backgroundColor: tokens.color.card, minHeight: 120, fontSize: 13, borderRadius: 14 },
  textInputContent: { paddingTop: 10 },
  fieldHint: { ...tokens.font.hint, marginTop: 4, marginLeft: 4 },
  error: { color: tokens.color.danger, marginTop: 12 },
  footer: {
    backgroundColor: tokens.color.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
  },
});
