import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Switch, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getCatalog } from '../../../shared/service/catalog.service';
import { createUniformCheck } from '../service/uniform.service';

interface CatalogItem {
  id: number;
  name: string;
  value: string;
}

interface ChecklistState {
  pantalon: boolean;
  botas: boolean;
  cinturon: boolean;
  camisa: boolean;
  pluma: boolean;
  gorra: boolean;
  unas: boolean;
  orejas: boolean;
  desodorante: boolean;
  afeitado: boolean;
  peinado: boolean;
}

const CHECKLIST_ITEMS: { key: keyof ChecklistState; label: string }[] = [
  { key: 'pantalon', label: 'Pantalón' },
  { key: 'botas', label: 'Botas' },
  { key: 'cinturon', label: 'Cinturón' },
  { key: 'camisa', label: 'Camisa' },
  { key: 'pluma', label: 'Pluma' },
  { key: 'gorra', label: 'Gorra (solo recorrido)' },
  { key: 'unas', label: 'Aseo: uñas' },
  { key: 'orejas', label: 'Aseo: orejas' },
  { key: 'desodorante', label: 'Aseo: desodorante / pulcro' },
  { key: 'afeitado', label: 'Afeitado' },
  { key: 'peinado', label: 'Peinado' },
];

const DEFAULT_CHECKLIST: ChecklistState = {
  pantalon: false,
  botas: false,
  cinturon: false,
  camisa: false,
  pluma: false,
  gorra: false,
  unas: false,
  orejas: false,
  desodorante: false,
  afeitado: false,
  peinado: false,
};

/**
 * "4.3 Uniforme" — checklist de uniformidad y aseo por elemento, capturado
 * por el jefe operativo (rol SHIFT) para un guardia.
 */
export const UniformChecklistScreen = () => {
  const navigation = useNavigation<any>();
  const [guards, setGuards] = useState<CatalogItem[]>([]);
  const [guardId, setGuardId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>(DEFAULT_CHECKLIST);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCatalog('guard').then(res => {
      if (res.success && res.data) setGuards(res.data);
    });
  }, []);

  const toggleAll = (value: boolean) => {
    setChecklist(
      CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: value }), {} as ChecklistState),
    );
  };

  const handleSubmit = async () => {
    if (!guardId) {
      Alert.alert('Falta información', 'Selecciona al guardia a evaluar.');
      return;
    }

    setLoading(true);
    try {
      const res = await createUniformCheck({ guardId, ...checklist, notes: notes || undefined });
      if (res.success) {
        Alert.alert('Listo', 'Checklist de uniforme registrado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.messages?.[0] || 'No se pudo guardar el checklist.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.messages?.[0] || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>1. GUARDIA</Text>
      <View style={styles.chipRow}>
        {guards.map(g => (
          <Chip
            key={g.id}
            selected={guardId === g.id}
            onPress={() => setGuardId(g.id)}
            style={[styles.chip, guardId === g.id && styles.chipSelected]}
            textStyle={guardId === g.id ? styles.chipTextSelected : undefined}
            mode="outlined"
          >
            {g.value || g.name}
          </Chip>
        ))}
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>2. CHECKLIST</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button compact mode="text" onPress={() => toggleAll(true)} textColor="#065911">
            Todo bien
          </Button>
          <Button compact mode="text" onPress={() => toggleAll(false)} textColor="#9E9E9E">
            Limpiar
          </Button>
        </View>
      </View>

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

      <Text style={styles.label}>3. NOTAS</Text>
      <TextInput
        mode="outlined"
        multiline
        numberOfLines={3}
        placeholder="Observaciones adicionales..."
        value={notes}
        onChangeText={setNotes}
        style={styles.textArea}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitBtn}
        contentStyle={{ height: 54 }}
        buttonColor="#065911"
      >
        GUARDAR CHECKLIST
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('UNIFORM_LIST')}
        textColor="#065911"
        style={{ marginTop: 8 }}
      >
        Ver historial por guardia
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderRadius: 10, borderColor: '#EEEEEE' },
  chipSelected: { backgroundColor: '#0657111A', borderColor: '#065911' },
  chipTextSelected: { color: '#065911', fontWeight: '700' },
  checklistCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 4 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  checklistLabel: { fontSize: 13, color: '#333', fontWeight: '600', flex: 1, marginRight: 8 },
  textArea: { backgroundColor: 'white', minHeight: 80 },
  submitBtn: { marginTop: 28, borderRadius: 14 },
});
