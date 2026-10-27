import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import { Button, Card, EmptyState, GradientHeader, StatusBadge } from '../../components/ui';
import { colors, doctorName, radius } from '../../theme';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PatientBillingScreen({ navigation, route }) {
  const appointmentId = route?.params?.appointmentId;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      if (appointmentId) {
        const res = await axiosInstance.get(`/billing/by-appointment/${appointmentId}`);
        setInvoices(res.data ? [res.data] : []);
      } else {
        const res = await axiosInstance.get('/billing/my-billing');
        setInvoices(res.data || []);
      }
    } catch (error) {
      if (error.response?.status === 404) setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchData();
    return navigation.addListener('focus', fetchData);
  }, [navigation, fetchData]);

  const handlePay = (inv) => {
    Alert.alert('Confirm payment', `Pay ${money(inv.amount)} for your consultation?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay now',
        onPress: async () => {
          try {
            setPaying(true);
            await axiosInstance.put(`/billing/${inv._id}/status`, { status: 'Paid', paymentMethod: 'Online' });
            setSelected(null);
            Alert.alert('✅ Payment successful', 'Your bill has been marked as paid.');
            fetchData();
          } catch (error) {
            Alert.alert('Payment failed', getErrorMessage(error, 'Please try again or pay at reception.'));
          } finally {
            setPaying(false);
          }
        },
      },
    ]);
  };

  const outstanding = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue');
  const outstandingTotal = outstanding.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const paidTotal = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const lines = (inv) =>
    [
      ['Consultation fee', inv.consultationFee],
      ['Service charge', inv.serviceCharge],
      ['Treatment charge', inv.treatmentCharge],
      ...(inv.items || []).map((it) => [it.description, it.amount]),
      ['Medicines', inv.medicineFee],
      ['Other charges', inv.otherCharges],
    ].filter(([, v]) => Number(v) > 0);

  return (
    <View style={styles.screen}>
      <GradientHeader style={{ paddingBottom: 24 }}>
        {appointmentId ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{appointmentId ? 'Visit bill' : 'Bills & payments'}</Text>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sumLabel}>Outstanding</Text>
            <Text style={styles.sumValue}>{money(outstandingTotal)}</Text>
            <Text style={styles.sumHint}>{outstanding.length} unpaid bill{outstanding.length === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.sumDivider} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={styles.sumLabel}>Paid so far</Text>
            <Text style={[styles.sumValue, { fontSize: 18 }]}>{money(paidTotal)}</Text>
          </View>
        </View>
      </GradientHeader>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {invoices.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={appointmentId ? 'No bill yet' : 'No bills yet'}
              message={appointmentId ? 'The bill for this visit will appear here once the clinic creates it.' : 'Bills appear here after your visits.'}
            />
          ) : (
            invoices.map((inv) => {
              const pending = inv.status === 'Pending' || inv.status === 'Overdue';
              return (
                <Card key={inv._id} style={styles.card} onPress={() => setSelected(inv)}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: pending ? colors.warningSoft : colors.successSoft }]}>
                      <Ionicons name={pending ? 'receipt' : 'checkmark-done'} size={20} color={pending ? colors.warning : colors.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{inv.doctorId?.name ? doctorName(inv.doctorId.name) : 'Consultation'}</Text>
                      <Text style={styles.cardSub}>{inv.doctorId?.specialization || 'Consultation'} · {fmtDate(inv.date || inv.createdAt)}</Text>
                    </View>
                    <StatusBadge status={inv.status} />
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.amount}>{money(inv.amount)}</Text>
                    {pending ? (
                      <Button title="Pay now" small icon="card-outline" onPress={() => handlePay(inv)} loading={paying} style={{ paddingHorizontal: 4 }} />
                    ) : (
                      <Text style={styles.paidOn}>{inv.paidAt ? `Paid ${fmtDate(inv.paidAt)}` : 'Paid'}{inv.paymentMethod ? ` · ${inv.paymentMethod}` : ''}</Text>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── RECEIPT SHEET ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.receiptHead}>
                  <Text style={styles.receiptBrand}>MediCare Clinic</Text>
                  <Text style={styles.receiptNo}>Invoice #{selected._id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.receiptTotal}>{money(selected.amount)}</Text>
                  <StatusBadge status={selected.status} style={{ alignSelf: 'center', marginTop: 8 }} />
                </View>

                <View style={styles.receiptMeta}>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>Doctor</Text><Text style={styles.metaValue}>{selected.doctorId?.name ? doctorName(selected.doctorId.name) : '—'}</Text></View>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>Visit date</Text><Text style={styles.metaValue}>{selected.appointmentId?.date ? fmtDate(selected.appointmentId.date) : fmtDate(selected.createdAt)}</Text></View>
                  {selected.paidAt ? <View style={styles.metaRow}><Text style={styles.metaLabel}>Paid on</Text><Text style={styles.metaValue}>{fmtDate(selected.paidAt)}{selected.paymentMethod ? ` · ${selected.paymentMethod}` : ''}</Text></View> : null}
                </View>

                <Text style={styles.breakTitle}>Breakdown</Text>
                {lines(selected).map(([label, value], i) => (
                  <View key={`${label}-${i}`} style={styles.lineRow}>
                    <Text style={styles.lineLabel}>{label}</Text>
                    <Text style={styles.lineValue}>{money(value)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{money(selected.amount)}</Text>
                </View>

                {(selected.status === 'Pending' || selected.status === 'Overdue') && (
                  <Button title={`Pay ${money(selected.amount)}`} icon="card-outline" onPress={() => handlePay(selected)} loading={paying} style={{ marginTop: 18 }} />
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, padding: 16, marginTop: 16 },
  sumLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  sumValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  sumHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  sumDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)' },

  list: { padding: 20, paddingBottom: 120 },
  card: { marginBottom: 12, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  cardSub: { fontSize: 12, color: colors.body, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  amount: { fontSize: 18, fontWeight: '800', color: colors.ink },
  paidOn: { fontSize: 12, color: colors.success, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34, maxHeight: '88%' },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  receiptHead: { alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, borderStyle: 'dashed', marginBottom: 14 },
  receiptBrand: { fontSize: 13, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  receiptNo: { fontSize: 12, color: colors.muted, marginTop: 2 },
  receiptTotal: { fontSize: 32, fontWeight: '800', color: colors.ink, marginTop: 10, letterSpacing: -0.5 },
  receiptMeta: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, gap: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, color: colors.body },
  metaValue: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  breakTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 18, marginBottom: 6 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineLabel: { fontSize: 14, color: colors.body, flex: 1, marginRight: 10 },
  lineValue: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: colors.ink },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
});
