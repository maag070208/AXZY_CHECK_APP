import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
  Button,
  Chip,
  IconButton,
  Surface,
  Icon,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { APP_SETTINGS } from '../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../screens/check/components/CameraModal';
import { useDispatch } from 'react-redux';
import { showToast } from '../../core/store/slices/toast.slice';
import { uploadFile } from '../service/upload.service';
import { getCatalog } from '../service/catalog.service';
import Geolocation from '@react-native-community/geolocation';

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
        <Surface style={styles.header} elevation={1}>
          <IconButton
            icon="chevron-left"
            size={30}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={{ width: 48 }} />
        </Surface>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>1. {config.labels.type}</Text>
          <View style={styles.typeWrapper}>
            {visibleTypes.map(type => (
              <Chip
                key={type.id}
                selected={typeId === type.id}
                onPress={() => handleSelectType(type)}
                style={[
                  styles.typeChip,
                  typeId === type.id && {
                    backgroundColor: `${accent}1A`,
                    borderColor: accent,
                  },
                ]}
                textStyle={[
                  styles.typeChipText,
                  typeId === type.id && { color: accent },
                ]}
                showSelectedCheck={false}
                mode="outlined"
              >
                {type.value}
              </Chip>
            ))}
            {visibleTypes.length === 0 && (
              <Text style={styles.emptyTypes}>
                No hay tipos disponibles para este reporte.
              </Text>
            )}
          </View>

          <Text style={styles.label}>2. EVIDENCIA</Text>
          <View style={styles.photoActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.bigCaptureBtn,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: accent,
                  borderWidth: 2,
                },
              ]}
              onPress={() => {
                setCameraMode('photo');
                setCameraVisible(true);
              }}
            >
              <Icon source="camera" size={32} color={accent} />
              <Text style={[styles.bigCaptureText, { color: accent }]}>FOTO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.bigCaptureBtn, { backgroundColor: '#455A64' }]}
              onPress={() => {
                setCameraMode('video');
                setCameraVisible(true);
              }}
            >
              <Icon source="video" size={32} color="white" />
              <Text style={styles.bigCaptureText}>VIDEO</Text>
            </TouchableOpacity>
          </View>

          {media.length > 0 && (
            <ScrollView
              horizontal
              style={styles.mediaList}
              showsHorizontalScrollIndicator={false}
            >
              {media.map((item, index) => (
                <View key={item.id} style={styles.mediaItem}>
                  <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                  {item.type === 'video' && (
                    <View style={styles.videoIconOverlay}>
                      <Icon source="play-circle" color="white" size={30} />
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
                        size={28}
                        onPress={() => retryUpload(index)}
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      />
                    </View>
                  )}
                  <IconButton
                    icon="close-circle"
                    size={22}
                    containerColor="white"
                    iconColor="#E53935"
                    style={styles.deleteMedia}
                    onPress={() => removeMedia(index)}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>3. OBSERVACIONES ADICIONALES</Text>
          <TextInput
            mode="outlined"
            multiline
            placeholder={config.placeholder || 'Describe lo sucedido brevemente...'}
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            outlineColor="#E0E0E0"
            activeOutlineColor={accent}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[
              styles.mainSubmitBtn,
              { backgroundColor: canSubmit ? accent : '#BDBDBD' },
            ]}
            contentStyle={{ height: 60 }}
            loading={loading}
            disabled={loading || !canSubmit}
          >
            <Text style={styles.submitBtnText}>
              {isUploading ? 'SUBIENDO...' : config.labels.submitButton}
            </Text>
          </Button>
        </ScrollView>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  content: { padding: 16, paddingBottom: 60 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9E9E9E',
    marginBottom: 12,
    marginTop: 15,
    letterSpacing: 1.2,
  },

  typeWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: { borderRadius: 10, borderColor: '#EEEEEE' },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  emptyTypes: { color: '#9E9E9E', fontSize: 12 },

  photoActionRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  bigCaptureBtn: {
    flex: 1,
    height: 90,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  bigCaptureText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 6,
  },

  mediaList: { marginBottom: 20, paddingVertical: 5 },
  mediaItem: { marginRight: 15, position: 'relative' },
  mediaImg: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  videoIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  deleteMedia: { position: 'absolute', top: -12, right: -12, margin: 0 },
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

  textInput: { backgroundColor: 'white', minHeight: 100, fontSize: 15 },
  mainSubmitBtn: { marginTop: 30, borderRadius: 12, elevation: 4 },
  submitBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },

  dialogTitle: {
    marginTop: 20,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  dialogSub: { marginTop: 8, color: '#999', fontSize: 12 },
});
