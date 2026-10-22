import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  Image,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Icon,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_SETTINGS } from '../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../screens/check/components/CameraModal';
import { useDispatch } from 'react-redux';
import { showToast } from '../../core/store/slices/toast.slice';
import { isSpeechAvailable, startSpeech, stopSpeech } from '../service/speech.service';
import { uploadFile } from '../service/upload.service';
import { getCatalog } from '../service/catalog.service';
import Geolocation from '@react-native-community/geolocation';
import { AppButton } from './AppButton';

/* ======================================================
   TYPES
====================================================== */

interface CatalogItem {
  id: number;
  name: string;
  value: string;
  color?: string;
  icon?: string;
  type?: string;
  categoryId?: number;
}

interface MediaItem {
  id: string;
  uri: string;
  type: 'video' | 'photo';
  uploading: boolean;
  error: boolean;
  url?: string;
}

export interface ReportMediaPayload {
  type: 'VIDEO' | 'IMAGE';
  url: string;
}

export interface ReportFormState {
  title: string;
  categoryId: number | null;
  typeId: number | null;
  description: string;
  media: ReportMediaPayload[];
  latitude?: number;
  longitude?: number;
}

export interface ReportFormCatalogConfig {
  categoryKey: string;
  typeKey: string;
  filterByType?: string;
  autoSelectFirst?: boolean;
}

export interface ReportFormConfig {
  title: string;
  accent: string;
  uploadFolder: string;
  catalogs: ReportFormCatalogConfig;
  labels: {
    category: string;
    type: string;
    submitButton: string;
  };
  successMessage: string;
  placeholder?: string;
}

export interface ReportFormProps {
  config: ReportFormConfig;
  onSubmit: (state: ReportFormState) => Promise<{ success: boolean }>;
}

/* ======================================================
   COMPONENT
====================================================== */

export const ReportForm: React.FC<ReportFormProps> = ({ config, onSubmit }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [allTypes, setAllTypes] = useState<CatalogItem[]>([]);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [dictating, setDictating] = useState(false);
  const dictationBase = useRef('');

  const scrollRef = useRef<ScrollView>(null);
  const photoScale = useRef(new Animated.Value(1)).current;
  const [evidenceY, setEvidenceY] = useState(0);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const toggleDictation = async () => {
    if (dictating) {
      stopSpeech();
      return;
    }

    if (!isSpeechAvailable) {
      dispatch(
        showToast({
          message: 'El dictado no está disponible. Compila la app para activarlo.',
          type: 'error',
        }),
      );
      return;
    }

    const base = description.trim();
    dictationBase.current = base;
    setDictating(true);

    try {
      const spoken = await startSpeech(partial => {
        const next = `${base ? `${base} ` : ''}${partial}`.trim();
        setDescription(next);
      });
      const finalText = `${base ? `${base} ` : ''}${spoken}`.trim();
      if (finalText) setDescription(finalText);
    } catch (error: any) {
      dispatch(
        showToast({
          message: error?.message || 'No se pudo dictar. Intenta de nuevo.',
          type: 'error',
        }),
      );
    } finally {
      setDictating(false);
    }
  };

  const pulsePhoto = () => {
    photoScale.setValue(1);
    Animated.sequence([
      Animated.timing(photoScale, { toValue: 1.03, duration: 140, useNativeDriver: true }),
      Animated.timing(photoScale, { toValue: 0.99, duration: 120, useNativeDriver: true }),
      Animated.timing(photoScale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const scrollToEvidence = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(evidenceY - 12, 0),
        animated: true,
      });
      pulsePhoto();
    }, 150);
  };

  const { accent } = config;

  useFocusEffect(
    useCallback(() => {
      const fetchCatalogs = async () => {
        try {
          const [catRes, typeRes] = await Promise.all([
            getCatalog(config.catalogs.categoryKey),
            getCatalog(config.catalogs.typeKey),
          ]);

          if (catRes.success && catRes.data) {
            let cats = catRes.data;
            if (config.catalogs.filterByType) {
              cats = cats.filter(
                (c: CatalogItem) => c.type === config.catalogs.filterByType,
              );
            }
            // Category selection is no longer exposed to the user (see ReportForm
            // simplification): `categories` is only kept to resolve which types
            // belong to this screen and to derive `categoryId` once a type is chosen.
            setCategories(cats);
          }

          if (typeRes.success && typeRes.data) {
            setAllTypes(typeRes.data);
          }
        } catch (e) {
          console.error('Error fetching report catalogs:', e);
        }
      };

      Geolocation.requestAuthorization();
      fetchCatalogs();

      return () => {
        setCategoryId(null);
        setTypeId(null);
        setDescription('');
        setMedia([]);
        setLoading(false);
      };
    }, []),
  );

  const handleCapture = async (file: {
    uri: string;
    type: 'video' | 'photo';
  }) => {
    const tempId = Date.now().toString();
    const newItem: MediaItem = {
      id: tempId,
      uri: file.uri,
      type: file.type,
      uploading: true,
      error: false,
    };

    setMedia(prev => [...prev, newItem]);

    try {
      const res = await uploadFile(
        file.uri,
        file.type === 'video' ? 'video' : 'image',
        config.uploadFolder,
      );

      setMedia(prev =>
        prev.map(item => {
          if (item.id === tempId) {
            if (res.success && res.url) {
              return { ...item, url: res.url, uploading: false };
            }
            return { ...item, uploading: false, error: true };
          }
          return item;
        }),
      );

      if (res.success) {
        dispatch(
          showToast({ message: 'Evidencia subida correctamente', type: 'success' }),
        );
      } else {
        dispatch(showToast({ message: 'Error al subir archivo', type: 'error' }));
      }
    } catch (e) {
      setMedia(prev =>
        prev.map(item => {
          if (item.id === tempId) {
            return { ...item, uploading: false, error: true };
          }
          return item;
        }),
      );
    }
  };

  const retryUpload = async (index: number) => {
    const item = media[index];
    if (!item.error || item.uploading) return;

    setMedia(prev => {
      const newMedia = [...prev];
      newMedia[index] = { ...newMedia[index], error: false, uploading: true };
      return newMedia;
    });

    try {
      const res = await uploadFile(
        item.uri,
        item.type === 'video' ? 'video' : 'image',
        config.uploadFolder,
      );

      setMedia(prev => {
        const newMedia = [...prev];
        if (res.success && res.url) {
          newMedia[index] = {
            ...newMedia[index],
            url: res.url,
            uploading: false,
          };
        } else {
          newMedia[index] = {
            ...newMedia[index],
            uploading: false,
            error: true,
          };
        }
        return newMedia;
      });

      if (res.success) {
        dispatch(
          showToast({
            message: 'Evidencia subida correctamente',
            type: 'success',
          }),
        );
      } else {
        dispatch(showToast({ message: 'Error al reintentar', type: 'error' }));
      }
    } catch (e) {
      setMedia(prev => {
        const newMedia = [...prev];
        newMedia[index] = { ...newMedia[index], uploading: false, error: true };
        return newMedia;
      });
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const doSubmit = async (latitude?: number, longitude?: number) => {
    const selectedType = allTypes.find(t => t.id === typeId);
    const state: ReportFormState = {
      title: selectedType?.value || config.title,
      categoryId,
      typeId,
      description,
      media: media
        .filter(m => m.url)
        .map(m => ({
          type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
          url: m.url as string,
        })),
      latitude,
      longitude,
    };

    const res = await onSubmit(state);
    setLoading(false);

    if (res.success) {
      dispatch(
        showToast({ message: config.successMessage, type: 'success' }),
      );
      navigation.goBack();
    } else {
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    }
  };

  const handleSubmit = async () => {
    if (!typeId) {
      Alert.alert('Falta información', 'Selecciona el tipo de problema primero.');
      return;
    }

    const pending = media.some(m => m.uploading);
    if (pending) {
      Alert.alert('Espera', 'Hay archivos subiéndose, por favor espera.');
      return;
    }

    const failed = media.some(m => m.error);
    if (failed) {
      Alert.alert(
        'Error',
        'Algunos archivos fallaron al subir. Elimínalos o intenta de nuevo.',
      );
      return;
    }

    setLoading(true);

    Geolocation.getCurrentPosition(
      async position => {
        await doSubmit(position.coords.latitude, position.coords.longitude);
      },
      async () => {
        await doSubmit();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
    );
  };

  // All types whose category belongs to this screen's catalog (Incidencia /
  // Mantenimiento / Casa Club), regardless of category — the category picker
  // step was removed from the UI. `categoryId` is derived automatically from
  // the selected type and still sent to the API under the hood.
  const visibleCategoryIds = categories.map(c => c.id);
  const visibleTypes = allTypes.filter(t =>
    visibleCategoryIds.includes(t.categoryId as number),
  );

  const handleSelectType = (type: CatalogItem) => {
    setTypeId(type.id);
    if (type.categoryId != null) {
      setCategoryId(type.categoryId);
    }
    scrollToEvidence();
  };

  const isUploading = media.some(m => m.uploading);
  const canSubmit = Boolean(typeId) && !isUploading;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Icon source="chevron-left" size={24} color="#065911" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.labelRow}>
            <Text style={styles.label}>1. {config.labels.type}</Text>
            <Text style={styles.labelHint}>Elige una opción</Text>
          </View>
          <View style={styles.typeGrid}>
            {visibleTypes.map(type => {
              const active = typeId === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectType(type)}
                  style={[
                    styles.typeTile,
                    active && {
                      borderColor: accent,
                      backgroundColor: `${accent}0D`,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View
                    style={[
                      styles.typeRadio,
                      active && { borderColor: accent },
                    ]}
                  >
                    {active ? (
                      <View style={[styles.typeRadioDot, { backgroundColor: accent }]} />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.typeTileText, active && { color: accent }]}
                    numberOfLines={2}
                  >
                    {type.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {visibleTypes.length === 0 && (
              <Text style={styles.emptyTypes}>No hay tipos disponibles para este reporte.</Text>
            )}
          </View>

          <View onLayout={event => setEvidenceY(event.nativeEvent.layout.y)}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>2. EVIDENCIA</Text>
              <Text style={styles.labelHint}>Foto o video</Text>
            </View>
            <View style={styles.captureStack}>
            <Animated.View style={{ transform: [{ scale: photoScale }] }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.captureRow}
                onPress={() => {
                  setCameraMode('photo');
                  setCameraVisible(true);
                }}
              >
                <View style={styles.captureIcon}>
                  <Icon source="camera-plus-outline" size={20} color="#065911" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.captureTitle}>Tomar foto</Text>
                  <Text style={styles.captureSub}>Abre la cámara</Text>
                </View>
                <Icon source="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.captureRow}
              onPress={() => {
                setCameraMode('video');
                setCameraVisible(true);
              }}
            >
              <View style={styles.captureIcon}>
                <Icon source="video-plus-outline" size={20} color="#065911" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.captureTitle}>Grabar video</Text>
                <Text style={styles.captureSub}>Opcional</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
            </View>
          </View>

          {media.length > 0 && (
            <ScrollView horizontal style={styles.mediaList} showsHorizontalScrollIndicator={false}>
              {media.map((item, index) => (
                <View key={item.id} style={styles.mediaItem}>
                  <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                  {item.type === 'video' && (
                    <View style={styles.videoIconOverlay}>
                      <Icon source="play-circle" color="white" size={28} />
                    </View>
                  )}
                  {item.uploading && (
                    <View style={styles.loaderOverlay}>
                      <ActivityIndicator size="small" color="white" />
                    </View>
                  )}
                  {item.error && (
                    <View style={styles.errorOverlay}>
                      <IconButton
                        icon="refresh"
                        iconColor="white"
                        size={26}
                        onPress={() => retryUpload(index)}
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      />
                    </View>
                  )}
                  <IconButton
                    icon="close-circle"
                    size={20}
                    containerColor="white"
                    iconColor="#E53935"
                    style={styles.deleteMedia}
                    onPress={() => removeMedia(index)}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.labelRow}>
            <Text style={styles.label}>3. OBSERVACIONES ADICIONALES</Text>
            <Text style={styles.labelHint}>Opcional</Text>
          </View>
          <TextInput
            mode="outlined"
            multiline
            placeholder={config.placeholder || 'Describe lo sucedido brevemente...'}
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            contentStyle={styles.textInputContent}
            outlineColor="#E6EEE9"
            activeOutlineColor={accent}
            outlineStyle={{ borderRadius: 14 }}
            right={
              <TextInput.Icon
                icon={dictating ? 'stop-circle-outline' : 'microphone-outline'}
                color={dictating ? '#E53935' : '#64748B'}
                onPress={toggleDictation}
              />
            }
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <AppButton
            label={isUploading ? 'Subiendo evidencias...' : config.labels.submitButton}
            icon="send-outline"
            size="md"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !canSubmit}
            style={styles.submit}
          />
        </View>
      </KeyboardAvoidingView>

      <CameraModal
        visible={cameraVisible}
        mode={cameraMode}
        onDismiss={() => setCameraVisible(false)}
        onCapture={handleCapture}
        maxDuration={APP_SETTINGS.INCIDENT_VIDEO_DURATION_LIMIT}
      />

      <Portal>
        <Dialog
          visible={isUploading || loading}
          dismissable={false}
          style={{ backgroundColor: 'white', borderRadius: 20 }}
        >
          <Dialog.Content style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={styles.dialogTitle}>
              {isUploading ? 'Subiendo evidencia...' : 'Enviando reporte...'}
            </Text>
            <Text style={styles.dialogSub}>Por favor espera un momento</Text>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
};

/* ======================================================
   STYLES
====================================================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEE9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  labelHint: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 4,
  },
  typeTile: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadioDot: { width: 8, height: 8, borderRadius: 4 },
  typeTileText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569', lineHeight: 15 },
  emptyTypes: { color: '#94A3B8', fontSize: 12 },
  captureStack: { gap: 8, marginBottom: 6 },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  captureIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  captureSub: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  mediaList: { marginTop: 10, marginBottom: 4 },
  mediaItem: { marginRight: 12, position: 'relative' },
  mediaImg: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  videoIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  deleteMedia: { position: 'absolute', top: -10, right: -10, margin: 0 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.2)',
    borderRadius: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    fontSize: 13,
    borderRadius: 14,
  },
  textInputContent: {
    paddingTop: 10,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
  },
  submit: { width: '100%', height: 50 },
  dialogTitle: {
    marginTop: 20,
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  dialogSub: { marginTop: 4, fontSize: 12, color: '#64748B' },
});
