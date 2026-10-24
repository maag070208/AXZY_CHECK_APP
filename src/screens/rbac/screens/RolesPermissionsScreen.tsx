import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Icon, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import {
  getRbacMatrix,
  RbacMatrix,
  updateRolePermissions,
} from '../service/rbac.service';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Guardias',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
};

const RESOURCE_LABELS: Record<string, string> = {
  round: 'Rondas',
  assignment: 'Asignaciones',
  assignments: 'Asignaciones',
  kardex: 'Kardex',
  incident: 'Incidencias',
  incidents: 'Incidencias',
  maintenance: 'Mantenimiento',
  club: 'Casa Club',
  location: 'Ubicaciones',
  locations: 'Ubicaciones',
  recurring: 'Rutas',
  access: 'Accesos y caseta',
  chat: 'Chat',
  dashboard: 'Dashboard',
  'shift-handover': 'Entrega de turno',
  uniform: 'Uniforme',
  catalogs: 'Catálogos',
  schedules: 'Horarios',
  users: 'Usuarios',
  properties: 'Propiedades',
  residents: 'Residentes',
  resident: 'Residente',
  invitation: 'Invitaciones',
  documents: 'Documentos',
  settings: 'Ajustes',
  occupancy: 'Ocupación',
};

const resourceOf = (code: string) => code.split('.')[0] ?? 'otros';
const resourceLabel = (key: string) => RESOURCE_LABELS[key] ?? key;

const sameSet = (a: Set<string>, b: string[]) =>
  a.size === b.length && b.every(code => a.has(code));

export const RolesPermissionsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const can = useCan();
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null);
  const [role, setRole] = useState('ADMIN');
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRbacMatrix();
      if (!res.success || !res.data || !Array.isArray(res.data.roles)) {
        setError(res.messages?.[0] ?? 'No se pudo cargar la matriz');
        return;
      }
      setMatrix(res.data);
      const current = res.data.roles.find(r => r.name === role) ?? res.data.roles[0];
      if (current) {
        setRole(current.name);
        setDraft(new Set(current.permissions));
      }
    } catch {
      setError('No se pudo cargar la matriz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = matrix?.roles.find(r => r.name === role) ?? null;
  const dirty = !!selected && !sameSet(draft, selected.permissions);
  const groups = useMemo(() => {
    const map = new Map<string, { code: string; description: string }[]>();
    for (const permission of matrix?.permissions ?? []) {
      const key = resourceOf(permission.code);
      const list = map.get(key) ?? [];
      list.push(permission);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) =>
      resourceLabel(a[0]).localeCompare(resourceLabel(b[0])),
    );
  }, [matrix]);

  const selectRole = (name: string) => {
    if (dirty || saving) return;
    const target = matrix?.roles.find(r => r.name === name);
    if (!target) return;
    setRole(name);
    setDraft(new Set(target.permissions));
  };

  const toggle = (code: string) => {
    if (role === 'ADMIN' && code === 'users.manage') return;
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await updateRolePermissions(role, [...draft]);
      if (!res.success || !res.data) {
        dispatch(showToast({ message: res.messages?.[0] ?? 'No se pudo guardar', type: 'error' }));
        return;
      }
      setMatrix(res.data);
      const saved = res.data.roles.find(r => r.name === role);
      if (saved) setDraft(new Set(saved.permissions));
      dispatch(showToast({ message: 'Permisos actualizados', type: 'success' }));
    } catch {
      dispatch(showToast({ message: 'No se pudo guardar', type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Roles y permisos" />
      {!can(P.USERS_MANAGE) ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No tienes permisos para administrar roles.</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#065911" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Button mode="outlined" onPress={() => void load()}>Reintentar</Button>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesRow}>
            {(matrix?.roles ?? []).map(item => (
              <TouchableOpacity
                key={item.name}
                onPress={() => selectRole(item.name)}
                style={[styles.roleChip, item.name === role && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, item.name === role && styles.roleChipTextActive]}>
                  {ROLE_LABELS[item.name] ?? item.name} · {item.name === role ? draft.size : item.permissions.length}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {groups.map(([resource, permissions]) => (
            <View key={resource} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{resourceLabel(resource).toUpperCase()}</Text>
                <Text style={styles.groupCount}>
                  {permissions.filter(p => draft.has(p.code)).length}/{permissions.length}
                </Text>
              </View>
              {permissions.map(permission => {
                const locked = role === 'ADMIN' && permission.code === 'users.manage';
                return (
                  <TouchableOpacity
                    key={permission.code}
                    disabled={locked}
                    onPress={() => toggle(permission.code)}
                    style={styles.permissionRow}
                  >
                    <Checkbox
                      status={draft.has(permission.code) ? 'checked' : 'unchecked'}
                      disabled={locked}
                      color="#065911"
                    />
                    <View style={styles.permissionCopy}>
                      <Text style={styles.permissionText}>{permission.description}</Text>
                      <Text style={styles.permissionCode}>{permission.code}</Text>
                    </View>
                    {locked ? <Icon source="lock" size={16} color="#94A3B8" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <Button
            mode="contained"
            onPress={() => void save()}
            disabled={!dirty || saving}
            loading={saving}
            style={styles.save}
            buttonColor="#065911"
          >
            Guardar cambios
          </Button>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F9F6' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#64748B', fontSize: 13 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginBottom: 12, gap: 8 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  rolesRow: { gap: 8, paddingBottom: 12 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9' },
  roleChipActive: { backgroundColor: '#065911', borderColor: '#065911' },
  roleChipText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  roleChipTextActive: { color: '#FFFFFF' },
  group: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6EEE9', marginBottom: 12, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F8FAFC' },
  groupTitle: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
  groupCount: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  permissionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionText: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  permissionCode: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  save: { marginTop: 8, borderRadius: 12 },
});
