import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../core/store/hooks';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import { RootState } from '../../../core/store/redux.config';
import {
  getResidentById,
  getResidentContacts,
  ResidentContact,
  ResidentUser,
} from '../../residents/service/resident.service';
import {
  getPaginatedInvitations,
  Invitation,
} from '../../invitations/service/invitation.service';
import { getMyBalance } from '../../payments/service/payment.service';
import { tokens } from '../../../shared/theme/tokens';
import { formatMoney } from '../../../shared/utils/money';

const PRIMARY = tokens.color.primary;
const BRAND = '#12A36F';
const INK = tokens.color.textStrong;
const MUTED = tokens.color.textMuted;
const SOFT = tokens.color.textHint;
const LINE = tokens.color.border;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En espera',
  ENTERED: 'Dentro',
  EXITED: 'Completado',
  CANCELLED: 'Revocado',
  EXPIRED: 'Expirado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#B45309',
  ENTERED: tokens.color.primary,
  EXITED: tokens.color.textMuted,
  CANCELLED: tokens.color.dangerStrong,
  EXPIRED: tokens.color.dangerStrong,
};

export const ResidentHomeScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector((state: RootState) => state.userState);
  const can = useCan();
  const [resident, setResident] = useState<ResidentUser | null>(null);
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const residentId = Number(user.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [residentRes, contactsRes, invitationsRes] = await Promise.all([
        getResidentById(residentId),
        getResidentContacts(residentId),
        getPaginatedInvitations({ page: 1, limit: 5, filters: {} }),
      ]);
      if (residentRes.success) setResident(residentRes.data);
      if (contactsRes.success && contactsRes.data) setContacts(contactsRes.data);
      if (invitationsRes.success) {
        const rows = (invitationsRes.data as any)?.rows;
        setInvitations(Array.isArray(rows) ? rows : []);
      }
    } finally {
      setLoading(false);
    }
    // El saldo no bloquea el home: se pinta cuando llega (y se refresca con el pull).
    getMyBalance()
      .then((summary) => setBalance(summary.balance))
      .catch(() => setBalance(null));
  }, [residentId]);

  useEffect(() => {
    if (residentId) void load();
  }, [load, residentId]);

  const property = resident?.property;
  const firstName =
    (resident?.residentProfile?.firstName || resident?.name || user.fullName || 'Residente')
      .trim()
      .split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  const go = (stack: string, screen: string, params?: any) =>
    navigation.navigate(stack, { screen, params });

  const actions = [
    {
      label: 'Mi perfil',
      detail: 'Tus datos',
      permission: P.RESIDENT_SELF,
      icon: 'account-circle-outline',
      onPress: () => navigation.navigate('PROFILE_SCREEN'),
    },
    {
      label: 'Contactos',
      detail: `${contacts.length} registrados`,
      permission: P.RESIDENT_SELF,
      icon: 'book-account-outline',
      onPress: () => go('RESIDENTS_STACK', 'RESIDENT_CONTACTS', { residentId }),
    },
    {
      label: 'Generar pase',
      detail: 'Para tus visitas',
      permission: P.INVITATION_CREATE,
      icon: 'qrcode-plus',
      onPress: () =>
        go('INVITATIONS_STACK', 'INVITATION_FORM', {
          propertyId: property?.id,
          residentId,
        }),
    },
    {
      label: 'Mis pases',
      detail: 'Historial y QR',
      permission: P.INVITATION_VIEW,
      icon: 'ticket-confirmation-outline',
      onPress: () => go('INVITATIONS_STACK', 'INVITATIONS_MAIN'),
    },
    {
      label: 'Mis pagos',
      detail:
        balance == null
          ? 'Saldo y cargos'
          : balance > 0
            ? `${formatMoney(balance)} pendiente`
            : balance < 0
              ? `${formatMoney(Math.abs(balance))} a favor`
              : 'Al día',
      permission: P.PAYMENT_VIEW,
      icon: 'wallet-outline',
      onPress: () => go('PAYMENTS_STACK', 'PAYMENTS_MAIN'),
    },
    {
      label: 'Mis quejas',
      detail: 'Buzón de quejas',
      permission: P.COMPLAINT_VIEW,
      icon: 'message-alert-outline',
      onPress: () => go('COMPLAINTS_STACK', 'COMPLAINTS_MAIN'),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} colors={[PRIMARY]} tintColor={PRIMARY} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{firstName}</Text>
        <Text style={styles.heroHint}>Aquí están tus accesos y los pases de tu propiedad.</Text>

        <View style={styles.propertyPill}>
          <Icon source="home-city-outline" size={15} color={tokens.color.heroAccent} />
          <Text style={styles.propertyText} numberOfLines={1}>
            {property ? `${property.identifier} · ${property.name}` : 'Sin propiedad asignada'}
          </Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        {actions.filter(action => can(action.permission)).map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={action.onPress}
          >
            <View style={styles.actionIcon}>
              <Icon source={action.icon} size={22} color={PRIMARY} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionDetail}>{action.detail}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>MIS PASES</Text>
          <Text style={styles.sectionTitle}>Últimos accesos</Text>
        </View>
        <TouchableOpacity onPress={() => go('INVITATIONS_STACK', 'INVITATIONS_MAIN')}>
          <Text style={styles.link}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {invitations.length === 0 ? (
          <View style={styles.empty}>
            <Icon source="qrcode" size={28} color={SOFT} />
            <Text style={styles.emptyTitle}>Aún no tienes pases</Text>
            <Text style={styles.emptyText}>Genera uno para que tus visitas puedan entrar.</Text>
          </View>
        ) : (
          invitations.slice(0, 4).map((invitation, index) => (
            <TouchableOpacity
              key={invitation.id}
              style={[styles.passRow, index < invitations.slice(0, 4).length - 1 && styles.passBorder]}
              onPress={() => go('INVITATIONS_STACK', 'INVITATION_DETAIL', { invitation })}
            >
              <View style={styles.passIcon}>
                <Icon source="qrcode" size={18} color={PRIMARY} />
              </View>
              <View style={styles.passCopy}>
                <Text style={styles.passName} numberOfLines={1}>
                  {invitation.guestName}
                </Text>
                <Text style={styles.passMeta} numberOfLines={1}>
                  {new Date(invitation.validFrom).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                  })}
                  {' · '}
                  {invitation.code}
                </Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLOR[invitation.status]}14` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[invitation.status] }]}>
                  {STATUS_LABEL[invitation.status] ?? invitation.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Icon source="shield-check-outline" size={18} color={PRIMARY} />
        </View>
        <View style={styles.tipCopy}>
          <Text style={styles.tipTitle}>Tus pases son personales</Text>
          <Text style={styles.tipText}>
            Comparte el QR solo con la visita. Puedes revocarlo desde “Mis pases”.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 110 },
  hero: {
    backgroundColor: tokens.color.heroDeep,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -60,
    top: -80,
    backgroundColor: tokens.color.heroBg,
  },
  greeting: { color: tokens.color.heroAccent, fontSize: 12, fontWeight: '700' },
  name: { color: tokens.color.card, fontSize: 26, fontWeight: '900', marginTop: 2 },
  heroHint: { color: tokens.color.heroMuted, fontSize: 12, fontWeight: '600', marginTop: 6, maxWidth: 270 },
  propertyPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.1)',
  },
  propertyText: { color: tokens.color.heroSoft, fontSize: 11, fontWeight: '700', maxWidth: 230 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    rowGap: 10,
  },
  actionCard: {
    width: '48.5%',
    backgroundColor: tokens.color.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { marginTop: 10, fontSize: 13, fontWeight: '800', color: INK },
  actionDetail: { marginTop: 2, fontSize: 10, fontWeight: '600', color: MUTED },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 9, fontWeight: '900', color: SOFT, letterSpacing: 1.1 },
  sectionTitle: { marginTop: 2, fontSize: 17, fontWeight: '900', color: INK },
  link: { fontSize: 11, fontWeight: '800', color: PRIMARY },
  listCard: {
    backgroundColor: tokens.color.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  passBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  passIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passCopy: { flex: 1, minWidth: 0 },
  passName: { fontSize: 13, fontWeight: '800', color: INK },
  passMeta: { marginTop: 2, fontSize: 10, color: MUTED },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 8.5, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 24, gap: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: INK },
  emptyText: { fontSize: 11, color: SOFT, textAlign: 'center' },
  tipCard: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7F0DF',
    backgroundColor: tokens.color.primarySoft,
    padding: 14,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: tokens.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCopy: { flex: 1 },
  tipTitle: { fontSize: 12, fontWeight: '800', color: PRIMARY },
  tipText: { marginTop: 2, fontSize: 10.5, fontWeight: '600', color: '#3F6654' },
});
