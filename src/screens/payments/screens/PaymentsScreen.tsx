import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import { AppButton } from '../../../shared/components/AppButton';
import { Skeleton } from '../../../shared/components/Skeleton';
import { tokens } from '../../../shared/theme/tokens';
import { formatDateOnly } from '../../../shared/utils/date';
import { formatMoney } from '../../../shared/utils/money';
import {
  CHARGE_CATEGORY_LABELS,
  CHARGE_STATUS_LABELS,
  ChargeStatus,
  getMyPayments,
  getMyPaymentReceipt,
  MyCharge,
  MyFinance,
  MyPayment,
  PAYMENT_METHOD_LABELS,
} from '../service/payment.service';

type Tab = 'charges' | 'payments';

const statusTone = (status: ChargeStatus) => {
  switch (status) {
    case 'PAID':
      return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'PARTIAL':
      return { color: tokens.color.warning, background: tokens.color.warningSoft };
    case 'CANCELLED':
      return { color: tokens.color.textMuted, background: tokens.color.screen };
    default:
      return { color: tokens.color.warning, background: tokens.color.warningSoft };
  }
};

const chargeIcon = (category: MyCharge['category']) => {
  if (category === 'CUOTA') return 'calendar-month-outline';
  if (category === 'MANTENIMIENTO') return 'wrench-outline';
  if (category === 'RECARGO') return 'alert-circle-outline';
  return 'receipt-text-outline';
};

const ChargeCard = ({ charge }: { charge: MyCharge }) => {
  const tone = statusTone(charge.status);
  const cancelled = charge.status === 'CANCELLED';

  return (
    <View style={[styles.card, cancelled && styles.cardMuted]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Icon source={chargeIcon(charge.category) as any} size={20} color={tokens.color.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>{charge.concept}</Text>
          <Text style={styles.cardMeta}>
            {CHARGE_CATEGORY_LABELS[charge.category]} · vence {formatDateOnly(charge.dueDate)}
          </Text>
        </View>
        <Text style={[styles.cardAmount, cancelled && styles.mutedText]}>
          {formatMoney(charge.amount)}
        </Text>
      </View>

      <View style={styles.cardBottom}>
        <View style={[styles.chip, { backgroundColor: tone.background }]}>
          <View style={[styles.chipDot, { backgroundColor: tone.color }]} />
          <Text style={[styles.chipText, { color: tone.color }]}>{CHARGE_STATUS_LABELS[charge.status]}</Text>
        </View>

        {charge.overdue && <Text style={styles.overdue}>Vencido</Text>}
        {charge.status === 'PAID' && <Text style={styles.paidText}>Liquidado</Text>}
        {charge.status === 'PARTIAL' && (
          <Text style={styles.paidText}>Pagado {formatMoney(charge.paidAmount)}</Text>
        )}
        {charge.outstanding > 0 && !cancelled && (
          <Text style={styles.outstanding}>Saldo {formatMoney(charge.outstanding)}</Text>
        )}
      </View>
    </View>
  );
};

const PaymentCard = ({ payment, onReceipt }: { payment: MyPayment; onReceipt: (payment: MyPayment) => void }) => {
  const voided = !!payment.voidedAt;
  const totalForResident = payment.appliedAmount + payment.credit;

  return (
    <View style={[styles.card, voided && styles.cardMuted]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Icon source="wallet-outline" size={20} color={tokens.color.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {PAYMENT_METHOD_LABELS[payment.method]}
            {payment.reference ? ` · ${payment.reference}` : ''}
          </Text>
          <Text style={styles.cardMeta}>
            {formatDateOnly(payment.paidAt)}
            {payment.property ? ` · ${payment.property.identifier}` : ''}
            {payment.folio ? ` · Folio ${String(payment.folio).padStart(6, '0')}` : ''}
          </Text>
        </View>
        <Text style={[styles.cardAmount, voided && styles.mutedText]}>
          {formatMoney(totalForResident)}
        </Text>
      </View>

      <View style={styles.cardBottom}>
        <View style={[styles.chip, { backgroundColor: voided ? tokens.color.dangerSoft : tokens.color.primarySoft }]}>
          <View style={[styles.chipDot, { backgroundColor: voided ? tokens.color.dangerStrong : tokens.color.primary }]} />
          <Text style={[styles.chipText, { color: voided ? tokens.color.dangerStrong : tokens.color.primary }]}>
            {voided ? 'Reversado' : 'Registrado'}
          </Text>
        </View>

        {payment.appliedAmount > 0 && (
          <Text style={styles.paidText}>Aplicado {formatMoney(payment.appliedAmount)}</Text>
        )}
        {payment.credit > 0 && (
          <Text style={styles.creditText}>A favor {formatMoney(payment.credit)}</Text>
        )}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Ver recibo del pago ${payment.folio ? String(payment.folio).padStart(6, '0') : payment.id}`}
        onPress={() => onReceipt(payment)}
        style={styles.receiptAction}
      >
        <Icon source="file-pdf-box" size={17} color={tokens.color.primary} />
        <Text style={styles.receiptActionText}>Recibo</Text>
        <Icon source="chevron-right" size={16} color={tokens.color.textHint} />
      </TouchableOpacity>
    </View>
  );
};

const ReceiptRow = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <View style={styles.receiptRow}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text style={[styles.receiptValue, strong && styles.receiptValueStrong]} numberOfLines={1}>{value}</Text>
  </View>
);

export const PaymentsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const can = useCan();

  const [data, setData] = useState<MyFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('charges');
  const [receiptPayment, setReceiptPayment] = useState<MyPayment | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMyPayments();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openReceipt = (payment: MyPayment) => {
    setReceiptError(null);
    setReceiptPayment(payment);
  };

  const closeReceipt = () => {
    if (receiptBusy) return;
    setReceiptPayment(null);
    setReceiptError(null);
  };

  const shareReceipt = async () => {
    if (!receiptPayment || receiptBusy) return;
    setReceiptBusy(true);
    setReceiptError(null);
    try {
      const file = await getMyPaymentReceipt(receiptPayment.id, receiptPayment.folio);
      const { default: Share } = await import('react-native-share');
      await Share.open({
        url: `data:application/pdf;base64,${file.base64}`,
        type: 'application/pdf',
        filename: file.filename,
        failOnCancel: false,
      });
    } catch (err: any) {
      const message = String(err?.message ?? '');
      if (/cancel|did not share/i.test(message)) return;
      setReceiptError(message || 'No se pudo compartir el recibo');
    } finally {
      setReceiptBusy(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Skeleton height={176} radius={24} />
        <Skeleton height={48} radius={14} style={{ marginTop: 16 }} />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} height={96} radius={16} style={{ marginTop: 10 }} />
        ))}
      </ScrollView>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Icon source="wallet-outline" size={30} color={tokens.color.dangerStrong} />
        </View>
        <Text style={styles.errorTitle}>No pudimos cargar tus pagos</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton
          label="Reintentar"
          onPress={() => {
            setLoading(true);
            void load();
          }}
        />
      </View>
    );
  }

  const summary = data?.summary;
  const charges = data?.charges ?? [];
  const payments = data?.payments ?? [];
  const balance = summary?.balance ?? 0;
  const owed = balance > 0;
  const hasCredit = balance < 0;
  const heroLabel = owed ? 'SALDO PENDIENTE' : hasCredit ? 'SALDO A FAVOR' : 'ESTADO DE CUENTA';
  const heroHint = owed
    ? `${summary?.pendingCharges ?? 0} ${summary?.pendingCharges === 1 ? 'cargo pendiente' : 'cargos pendientes'}. Puedes pagar en administración.`
    : hasCredit
      ? 'La administración lo aplicará a tus próximos cargos.'
      : 'No tienes saldo pendiente.';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          colors={[tokens.color.primary]}
          tintColor={tokens.color.primary}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>{heroLabel}</Text>
        <Text style={styles.heroAmount}>{formatMoney(Math.abs(balance))}</Text>
        <Text style={styles.heroHint}>{heroHint}</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>CARGOS</Text>
            <Text style={styles.heroStatValue}>{formatMoney(summary?.totalCharges ?? 0)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>PAGADO</Text>
            <Text style={styles.heroStatValue}>{formatMoney(summary?.totalPaid ?? 0)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>CRÉDITO</Text>
            <Text style={styles.heroStatValue}>{formatMoney(summary?.credit ?? 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { value: 'charges' as Tab, label: `Cargos (${charges.length})` },
            { value: 'payments' as Tab, label: `Pagos (${payments.length})` },
          ]
        ).map((option) => {
          const active = tab === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => setTab(option.value)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'charges' ? (
        charges.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon source="receipt-text-outline" size={28} color={tokens.color.primary} />
            </View>
            <Text style={styles.emptyTitle}>No tienes cargos registrados</Text>
            <Text style={styles.muted}>
              Cuando la administración registre una cuota o un cargo, lo verás aquí.
            </Text>
          </View>
        ) : (
          charges.map((charge) => <ChargeCard key={charge.id} charge={charge} />)
        )
      ) : payments.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon source="wallet-outline" size={28} color={tokens.color.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aún no hay pagos</Text>
          <Text style={styles.muted}>
            Los pagos se registran en administración y aparecerán aquí.
          </Text>
        </View>
      ) : (
        payments.map((payment) => <PaymentCard key={payment.id} payment={payment} onReceipt={openReceipt} />)
      )}

      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Icon source="information-outline" size={18} color={tokens.color.primary} />
        </View>
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>Pagos en ventanilla</Text>
          <Text style={styles.noteText}>
            La administración registra los pagos. Si un cargo no es tuyo, levanta una queja.
          </Text>
        </View>
      </View>

      {can(P.COMPLAINT_CREATE) && (
        <AppButton
          label="Levantar una queja"
          icon="message-alert-outline"
          variant="outline"
          onPress={() => navigation.navigate('COMPLAINTS_STACK', { screen: 'COMPLAINTS_MAIN' })}
        />
      )}

      {error ? <Text style={styles.refreshError}>{error}</Text> : null}

      <Portal>
        <Modal visible={!!receiptPayment} onDismiss={closeReceipt} contentContainerStyle={styles.receiptModal}>
          {receiptPayment ? (
            <>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptIcon}>
                  <Icon source="file-pdf-box" size={22} color={tokens.color.primary} />
                </View>
                <View style={styles.receiptHeaderCopy}>
                  <Text style={styles.receiptEyebrow}>RECIBO DE PAGO</Text>
                  <Text style={styles.receiptTitle}>
                    {receiptPayment.folio ? `Folio ${String(receiptPayment.folio).padStart(6, '0')}` : 'Pago registrado'}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar recibo"
                  onPress={closeReceipt}
                  disabled={receiptBusy}
                  style={styles.receiptClose}
                >
                  <Icon source="close" size={20} color={tokens.color.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.receiptDivider} />
              <ReceiptRow label="Fecha" value={formatDateOnly(receiptPayment.paidAt)} />
              {receiptPayment.property ? (
                <ReceiptRow label="Propiedad" value={receiptPayment.property.identifier} />
              ) : null}
              <ReceiptRow label="Método" value={PAYMENT_METHOD_LABELS[receiptPayment.method]} />
              {receiptPayment.reference ? <ReceiptRow label="Referencia" value={receiptPayment.reference} /> : null}
              <ReceiptRow label="Total recibido" value={formatMoney(receiptPayment.amount)} strong />
              <ReceiptRow label="Aplicado" value={formatMoney(receiptPayment.appliedAmount)} />
              {receiptPayment.credit > 0 ? (
                <ReceiptRow label="Saldo a favor" value={formatMoney(receiptPayment.credit)} />
              ) : null}
              <ReceiptRow label="Estado" value={receiptPayment.voidedAt ? 'Reversado' : 'Vigente'} />

              {receiptError ? (
                <View style={styles.receiptErrorBox}>
                  <Icon source="alert-circle-outline" size={16} color={tokens.color.dangerStrong} />
                  <Text style={styles.receiptErrorText}>{receiptError}</Text>
                </View>
              ) : null}

              <Text style={styles.receiptHint}>
                El PDF incluye folio, fecha, propiedad y el detalle de los cargos aplicados.
              </Text>
              <View style={styles.receiptActions}>
                <AppButton
                  label={receiptBusy ? 'Preparando PDF…' : 'Compartir PDF'}
                  icon="share-variant-outline"
                  loading={receiptBusy}
                  onPress={() => void shareReceipt()}
                />
                <AppButton label="Cerrar" variant="outline" onPress={closeReceipt} disabled={receiptBusy} />
              </View>
            </>
          ) : null}
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: tokens.color.screen,
  },
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
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: tokens.color.heroAccent,
  },
  heroAmount: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '900',
    color: tokens.color.card,
    letterSpacing: -0.8,
  },
  heroHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.heroMuted,
    maxWidth: 290,
  },
  heroStats: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: { flex: 1 },
  heroStatLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: tokens.color.heroMuted,
  },
  heroStatValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: tokens.color.heroSoft,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 8,
  },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 10 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
  },
  tabActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  tabText: { fontSize: 13, fontWeight: '800', color: tokens.color.textMuted },
  tabTextActive: { color: tokens.color.card },
  card: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 12,
    marginBottom: 10,
  },
  cardMuted: { backgroundColor: tokens.color.screen },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.icon,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: tokens.color.textStrong },
  cardMeta: { marginTop: 2, fontSize: 10, color: tokens.color.textMuted },
  cardAmount: { fontSize: 14, fontWeight: '900', color: tokens.color.textStrong },
  receiptAction: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: tokens.color.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
  },
  receiptActionText: { fontSize: 11, fontWeight: '800', color: tokens.color.primary, flex: 1 },
  receiptModal: {
    backgroundColor: tokens.color.card,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
  },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptHeaderCopy: { flex: 1 },
  receiptEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: tokens.color.primary },
  receiptTitle: { marginTop: 2, fontSize: 17, fontWeight: '900', color: tokens.color.textStrong },
  receiptClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDivider: { height: 1, backgroundColor: tokens.color.border, marginVertical: 14 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  receiptLabel: { fontSize: 11, fontWeight: '600', color: tokens.color.textMuted },
  receiptValue: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '700', color: tokens.color.textStrong },
  receiptValueStrong: { fontSize: 14, fontWeight: '900' },
  receiptErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.color.dangerSoft,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  receiptErrorText: { flex: 1, fontSize: 11, fontWeight: '700', color: tokens.color.dangerStrong },
  receiptHint: { marginTop: 12, fontSize: 10, color: tokens.color.textMuted, lineHeight: 15 },
  receiptActions: { gap: 8, marginTop: 14 },
  cardBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  paidText: { fontSize: 10, fontWeight: '600', color: tokens.color.textMuted },
  overdue: { fontSize: 10, fontWeight: '800', color: tokens.color.dangerStrong },
  outstanding: { fontSize: 10, fontWeight: '800', color: tokens.color.primary },
  creditText: { fontSize: 10, fontWeight: '800', color: tokens.color.primary },
  mutedText: { color: tokens.color.textMuted },
  muted: { fontSize: 12, color: tokens.color.textMuted, textAlign: 'center' },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: tokens.color.textStrong },
  noteCard: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.primarySoft,
    padding: 12,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: tokens.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCopy: { flex: 1 },
  noteTitle: { fontSize: 12, fontWeight: '800', color: tokens.color.primary },
  noteText: { marginTop: 2, fontSize: 10.5, fontWeight: '600', color: tokens.color.textBody },
  refreshError: { marginTop: 10, fontSize: 11, color: tokens.color.dangerStrong, textAlign: 'center' },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: tokens.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
});
