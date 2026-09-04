import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getCatalog } from '../../../shared/service/catalog.service';
import { createShiftHandover, ShiftType } from '../service/shiftHandover.service';

interface CatalogItem {
  id: number;
  name: string;
  value: string;
}

interface ElementRow {
  guardId: number;
  guardLabel: string;
  entryTime: string;
  punctual: boolean;
  observations: string;
}

const CHECKLIST_ITEMS: { key: keyof ChecklistState; label: string }[] = [
  { key: 'checklistPhones', label: 'Teléfonos' },
  { key: 'checklistTablet', label: 'Tablet' },
  { key: 'checklistRadios', label: 'Radios' },
  { key: 'checklistKeys', label: 'Llaves' },
  { key: 'checklistLogbook', label: 'Bitácora' },
  { key: 'checklistConsignas', label: 'Consignas' },
];

interface ChecklistState {
  checklistPhones: boolean;
  checklistTablet: boolean;
  checklistRadios: boolean;
  checklistKeys: boolean;
  checklistLogbook: boolean;
  checklistConsignas: boolean;
}

const defaultShiftType = (): ShiftType => {
  const hour = new Date().getHours();
  // Reminders fire ~07:00 (report the night shift) and ~19:00 (report the
  // day shift), so guess accordingly to save the jefe operativo a tap.
  return hour >= 14 ? 'MATUTINO' : 'NOCTURNO';
};

/**
 * "4.2 Entrega de turno" — formulario para que el jefe operativo (rol SHIFT)
 * registre el cambio de turno: caseta (credenciales/tarjetones/novedades),
 * registro por elemento (guardias), checklist de verificación y
 * confirmación de que se reportaron las novedades a la administración.
 */
export const ShiftHandoverFormScreen = () => {
  const navigation = useNavigation<any>();
  const [shiftType, setShiftType] = useState<ShiftType>(defaultShiftType());
  const [credentialsCount, setCredentialsCount] = useState('');
  const [tarjetonesCount, setTarjetonesCount] = useState('');
  const [novedades, setNovedades] = useState('');
  const [checklist, setChecklist] = useState<ChecklistState>({
    checklistPhones: false,
    checklistTablet: false,
    checklistRadios: false,
    checklistKeys: false,
    checklistLogbook: false,
    checklistConsignas: false,
  });
  const [reportedToAdmin, setReportedToAdmin] = useState(false);

  const [guards, setGuards] = useState<CatalogItem[]>([]);
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [pickerGuardId, setPickerGuardId] = useState<number | null>(null);
  const [pickerEntryTime, setPickerEntryTime] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCatalog('guard').then(res => {
      if (res.success && res.data) setGuards(res.data);
    });
  }, []);

  const handleAddElement = () => {
    if (!pickerGuardId) {
      Alert.alert('Falta información', 'Selecciona un guardia.');
      return;
    }
    if (!pickerEntryTime.trim()) {
      Alert.alert('Falta información', 'Indica la hora de entrada (ej. 07:00).');
      return;
    }
    const guard = guards.find(g => g.id === pickerGuardId);
    setElements(prev => [
      ...prev,
      {
        guardId: pickerGuardId,
        guardLabel: guard?.value || guard?.name || '—',
        entryTime: pickerEntryTime.trim(),
        punctual: true,
        observations: '',
      },
    ]);
    setPickerGuardId(null);
    setPickerEntryTime('');
  };

  const handleRemoveElement = (index: number) => {
    setElements(prev => prev.filter((_, i) => i !== index));
  };

  const handleTogglePunctual = (index: number) => {
    setElements(prev =>
      prev.map((el, i) => (i === index ? { ...el, punctual: !el.punctual } : el)),
    );
  };

  const handleSubmit = async () => {
    if (!reportedToAdmin) {
      Alert.alert(
        'Falta confirmación',
        'Debes confirmar que se reportaron las novedades a la administración.',
      );
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await createShiftHandover({
        shiftType,
        handoverDate: today,
        credentialsCount: credentialsCount ? Number(credentialsCount) : undefined,
        tarjetonesCount: tarjetonesCount ? Number(tarjetonesCount) : undefined,
        novedades: novedades || undefined,
        ...checklist,
        reportedToAdmin,
        elements: elements.map(el => ({
          guardId: el.guardId,
          entryTime: el.entryTime,
          punctual: el.punctual,
          observations: el.observations || undefined,
        })),
      });

      if (res.success) {
        Alert.alert('Listo', 'Reporte de entrega de turno enviado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.messages?.[0] || 'No se pudo enviar el reporte.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.messages?.[0] || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>1. TURNO</Text>
      <View style={styles.chipRow}>
        {(['NOCTURNO', 'MATUTINO'] as ShiftType[]).map(type => (
          <Chip
            key={type}
            selected={shiftType === type}
            onPress={() => setShiftType(type)}
            style={[styles.chip, shiftType === type && styles.chipSelected]}
            textStyle={shiftType === type ? styles.chipTextSelected : undefined}
            mode="outlined"
          >
            {type === 'NOCTURNO' ? 'Nocturno' : 'Matutino'}
          </Chip>
        ))}
      </View>

      <Text style={styles.label}>2. CASETA</Text>
      <View style={styles.row2}>
        <TextInput
          mode="outlined"
          label="No. de credenciales"
          keyboardType="numeric"
          value={credentialsCount}
          onChangeText={setCredentialsCount}
          style={styles.halfInput}
        />
        <TextInput
          mode="outlined"
          label="No. de tarjetones"
          keyboardType="numeric"
          value={tarjetonesCount}
          onChangeText={setTarjetonesCount}
          style={styles.halfInput}
        />
      </View>
      <TextInput
        mode="outlined"
        label="Novedades"
        multiline
        numberOfLines={3}
        value={novedades}
        onChangeText={setNovedades}
        style={styles.textArea}
      />

      <Text style={styles.label}>3. REGISTRO POR ELEMENTO</Text>
      <Surface style={styles.pickerCard} elevation={0}>
        <Text style={styles.pickerHint}>Selecciona al guardia:</Text>
        <View style={styles.chipRow}>
          {guards.map(g => (
            <Chip
              key={g.id}
              selected={pickerGuardId === g.id}
              onPress={() => setPickerGuardId(g.id)}
              style={[styles.chip, pickerGuardId === g.id && styles.chipSelected]}
              textStyle={pickerGuardId === g.id ? styles.chipTextSelected : undefined}
              mode="outlined"
            >
              {g.value || g.name}
            </Chip>
          ))}
        </View>
        <View style={styles.row2}>
          <TextInput
            mode="outlined"
            label="Hora de entrada (HH:MM)"
            value={pickerEntryTime}
            onChangeText={setPickerEntryTime}
            style={styles.halfInput}
            placeholder="07:00"
          />
          <Button mode="contained" onPress={handleAddElement} style={styles.addBtn}>
            Agregar
          </Button>
        </View>
      </Surface>

      {elements.map((el, index) => (
        <Surface key={`${el.guardId}-${index}`} style={styles.elementRow} elevation={1}>
          <View style={{ flex: 1 }}>
            <Text style={styles.elementName}>{el.guardLabel}</Text>
            <Text style={styles.elementMeta}>Entrada: {el.entryTime}</Text>
          </View>
          <View style={styles.elementActions}>
            <View style={styles.punctualToggle}>
              <Text style={styles.punctualLabel}>Puntual</Text>
              <Switch value={el.punctual} onValueChange={() => handleTogglePunctual(index)} />
            </View>
            <IconButton icon="trash-can-outline" iconColor="#E53935" onPress={() => handleRemoveElement(index)} />
          </View>
        </Surface>
      ))}

      <Text style={styles.label}>4. VERIFICACIÓN DE ENTREGA DE TURNO</Text>
      <Surface style={styles.checklistCard} elevation={0}>
        {CHECKLIST_ITEMS.map(item => (
          <View key={item.key} style={styles.checklistRow}>
            <Text style={styles.checklistLabel}>{item.label}</Text>
            <Switch
              value={checklist[item.key]}
              onValueChange={v => setChecklist(prev => ({ ...prev, [item.key]: v }))}
            />
          </View>
        ))}
      </Surface>

      <Text style={styles.label}>5. CONFIRMACIÓN</Text>
      <Surface style={styles.confirmCard} elevation={0}>
        <View style={styles.confirmRow}>
          <Icon source="shield-check-outline" size={22} color="#065911" />
          <Text style={styles.confirmText}>
            Se reportaron las novedades a la administración
          </Text>
          <Switch value={reportedToAdmin} onValueChange={setReportedToAdmin} />
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitBtn}
        contentStyle={{ height: 54 }}
        buttonColor="#065911"
      >
        ENVIAR REPORTE DE TURNO
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('SHIFT_HANDOVER_LIST')}
        textColor="#065911"
        style={{ marginTop: 8 }}
      >
        Ver historial de entregas de turno
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 60 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9E9E9E',
    marginBottom: 12,
    marginTop: 18,
    letterSpacing: 1.2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 10, borderColor: '#EEEEEE' },
  chipSelected: { backgroundColor: '#0657111A', borderColor: '#065911' },
  chipTextSelected: { color: '#065911', fontWeight: '700' },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfInput: { flex: 1, backgroundColor: 'white' },
  textArea: { backgroundColor: 'white', minHeight: 80 },
  pickerCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 12, marginBottom: 12 },
  pickerHint: { fontSize: 12, color: '#757575', marginBottom: 6 },
  addBtn: { justifyContent: 'center', borderRadius: 10 },
  elementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  elementName: { fontWeight: '700', fontSize: 14, color: '#333' },
  elementMeta: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  elementActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  punctualToggle: { alignItems: 'center' },
  punctualLabel: { fontSize: 9, color: '#9E9E9E', fontWeight: '700' },
  checklistCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 4 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  checklistLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  confirmCard: { backgroundColor: '#F1F8F1', borderRadius: 14, padding: 14 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmText: { flex: 1, fontSize: 13, color: '#333', fontWeight: '600' },
  submitBtn: { marginTop: 28, borderRadius: 14 },
});
