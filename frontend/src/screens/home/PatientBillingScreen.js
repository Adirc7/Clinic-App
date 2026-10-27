import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorName } from '../../theme';
import axiosInstance from '../../api/axiosInstance';

export default function PatientBillingScreen({ navigation, route }) {
  const appointmentId = route?.params?.appointmentId;

  const [invoice, setInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (appointmentId) {
        // Fetch specific bill for this appointment
        const res = await axiosInstance.get(`/billing/by-appointment/${appointmentId}`);
        setInvoice(res.data);
      } else {
        // Fetch all patient bills (fallback)
        const res = await axiosInstance.get('/billing/my-billing');
        setInvoices(res.data || []);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setInvoice(null);
      } else {
        console.error('Billing fetch error:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePay = (inv) => {
    Alert.alert(
      'Confirm Payment',
      `Pay Rs. ${inv.amount} for your consultation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              setPaying(true);
              await axiosInstance.put(`/billing/${inv._id}/status`, { status: 'Paid', paymentMethod: 'Online' });
              Alert.alert('✅ Payment Successful', 'Your bill has been marked as paid.');
              fetchData();
            } catch (_) {
              Alert.alert('Error', 'Payment failed. Please try again or pay at reception.');
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const InvoiceCard = ({ inv }) => (
    <TouchableOpacity style={s.invoiceCard} onPress={() => { setSelectedInvoice(inv); setModalVisible(true); }}>
      {/* Header */}
      <View style={s.invoiceHeader}>
        <View style={s.invoiceTitleBlock}>
          <Text style={s.invoiceTitle}>Consultation Invoice</Text>
          <Text style={s.invoiceDate}>
            {new Date(inv.date || inv.createdAt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[s.statusBadge, inv.status === 'Paid' ? s.badgePaid : s.badgePending]}>
          <Text style={[s.statusText, inv.status === 'Paid' ? s.textPaid : s.textPending]}>
            {inv.status}
          </Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <View style={s.docMiniInfo}>
          <Ionicons name="person" size={14} color="#0DB591" />
          <Text style={s.docMiniName}>
            {inv.doctorId?.name ? doctorName(inv.doctorId.name) : 'Doctor'}
          </Text>
        </View>
        <Text style={s.summaryAmount}>Rs. {inv.amount}</Text>
      </View>
      
      <View style={s.viewDetailsAction}>
        <Text style={s.viewDetailsText}>Tap to view details</Text>
        <Ionicons name="chevron-forward" size={14} color="#999" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0A6B5B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Bill</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0DB591" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#0DB591']} />}
        >
          {appointmentId ? (
            invoice ? (
              <InvoiceCard inv={invoice} />
            ) : (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={52} color="#D1D1D1" />
                <Text style={s.emptyTitle}>No Bill Yet</Text>
                <Text style={s.emptyText}>No invoice has been generated for this appointment yet. It will appear here once created by the admin.</Text>
              </View>
            )
          ) : (
            invoices.length > 0 ? (
              invoices.map(inv => <InvoiceCard key={inv._id} inv={inv} />)
            ) : (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={52} color="#D1D1D1" />
                <Text style={s.emptyTitle}>No Invoices</Text>
                <Text style={s.emptyText}>You have no billing records yet.</Text>
              </View>
            )
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── BILL DETAILS MODAL ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Invoice Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.modalBody}>
                  {/* Doctor & Date */}
                  <View style={s.modalInfoSection}>
                    <Text style={s.modalDocName}>
                      {selectedInvoice.doctorId?.name ? doctorName(selectedInvoice.doctorId.name) : 'Doctor'}
                    </Text>
                    <Text style={s.modalDocSpec}>{selectedInvoice.doctorId?.specialization}</Text>
                    <Text style={s.modalDate}>
                      {new Date(selectedInvoice.date || selectedInvoice.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>

                  {/* Appointment & Patient IDs */}
                  <View style={s.modalIdBlock}>
                    <View style={s.modalIdItem}>
                      <Text style={s.modalIdLabel}>Appointment ID:</Text>
                      <Text style={s.modalIdValue}>{selectedInvoice.appointmentId?._id || selectedInvoice.appointmentId}</Text>
                    </View>
                    <View style={s.modalIdItem}>
                      <Text style={s.modalIdLabel}>Patient ID:</Text>
                      <Text style={s.modalIdValue}>{selectedInvoice.patientId?._id || selectedInvoice.patientId}</Text>
                    </View>
                  </View>

                  <View style={s.modalDivider} />

                  {/* Breakdown */}
                  <Text style={s.breakdownTitle}>Service Breakdown</Text>
                  
                  <View style={s.feeRow}>
                    <Text style={s.feeLabel}>Consultation Fee</Text>
                    <Text style={s.feeValue}>Rs. {selectedInvoice.consultationFee || 1500}</Text>
                  </View>

                  {selectedInvoice.serviceCharge > 0 && (
                    <View style={s.feeRow}>
                      <Text style={s.feeLabel}>Service Charge</Text>
                      <Text style={s.feeValue}>Rs. {selectedInvoice.serviceCharge}</Text>
                    </View>
                  )}

                  {selectedInvoice.treatmentCharge > 0 && (
                    <View style={s.feeRow}>
                      <Text style={s.feeLabel}>Treatment Charge</Text>
                      <Text style={s.feeValue}>Rs. {selectedInvoice.treatmentCharge}</Text>
                    </View>
                  )}

                  {selectedInvoice.items && selectedInvoice.items.length > 0 && selectedInvoice.items.map((item, idx) => (
                    <View key={idx} style={s.feeRow}>
                      <Text style={s.feeLabel}>{item.description}</Text>
                      <Text style={s.feeValue}>Rs. {item.amount}</Text>
                    </View>
                  ))}

                  {selectedInvoice.medicineFee > 0 && (
                    <View style={s.feeRow}>
                      <Text style={s.feeLabel}>Medicine Charges</Text>
                      <Text style={s.feeValue}>Rs. {selectedInvoice.medicineFee}</Text>
                    </View>
                  )}

                  {selectedInvoice.otherCharges > 0 && (
                    <View style={s.feeRow}>
                      <Text style={s.feeLabel}>Other Charges</Text>
                      <Text style={s.feeValue}>Rs. {selectedInvoice.otherCharges}</Text>
                    </View>
                  )}

                  <View style={s.modalTotalRow}>
                    <Text style={s.modalTotalLabel}>Total Amount</Text>
                    <Text style={s.modalTotalValue}>Rs. {selectedInvoice.amount}</Text>
                  </View>

                  {/* Payment Status */}
                  <View style={[s.modalStatusBadge, selectedInvoice.status === 'Paid' ? s.badgePaid : s.badgePending]}>
                    <Ionicons 
                      name={selectedInvoice.status === 'Paid' ? "checkmark-circle" : "time-outline"} 
                      size={16} 
                      color={selectedInvoice.status === 'Paid' ? "#2E7D32" : "#E65100"} 
                    />
                    <Text style={[s.modalStatusText, selectedInvoice.status === 'Paid' ? s.textPaid : s.textPending]}>
                      Status: {selectedInvoice.status}
                    </Text>
                  </View>

                  {selectedInvoice.status === 'Pending' && (
                    <TouchableOpacity 
                      style={[s.modalPayBtn, paying && { opacity: 0.7 }]} 
                      onPress={() => {
                        setModalVisible(false);
                        handlePay(selectedInvoice);
                      }}
                      disabled={paying}
                    >
                      {paying ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={s.modalPayBtnText}>Proceed to Payment</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0FAF7', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0A2E2A' },
  scroll: { padding: 16 },

  invoiceCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, borderLeftWidth: 4, borderLeftColor: '#0DB591' },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  invoiceTitleBlock: { flex: 1 },
  invoiceTitle: { fontSize: 16, fontWeight: '800', color: '#0A2E2A' },
  invoiceDate: { fontSize: 12, color: '#888', marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePending: { backgroundColor: '#FFF3E0' },
  badgePaid: { backgroundColor: '#E8F5E9' },
  statusText: { fontSize: 12, fontWeight: '700' },
  textPending: { color: '#E65100' },
  textPaid: { color: '#2E7D32' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#999', width: 90 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  breakdownTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeLabel: { fontSize: 13, color: '#555' },
  feeValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#0A2E2A' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#0DB591' },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0DB591', borderRadius: 14, paddingVertical: 14, marginTop: 16, gap: 8, elevation: 3, shadowColor: '#0DB591', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  paidBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 12, marginTop: 14, gap: 8 },
  paidBannerText: { color: '#2E7D32', fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  docMiniInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docMiniName: { fontSize: 13, color: '#555', fontWeight: '500' },
  summaryAmount: { fontSize: 15, fontWeight: '800', color: '#0DB591' },
  viewDetailsAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, gap: 4, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
  viewDetailsText: { fontSize: 11, color: '#999', fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0A2E2A' },
  modalBody: { paddingBottom: 20 },
  modalInfoSection: { marginBottom: 16 },
  modalDocName: { fontSize: 18, fontWeight: '800', color: '#0A2E2A' },
  modalDocSpec: { fontSize: 14, color: '#888', marginTop: 2 },
  modalDate: { fontSize: 13, color: '#999', marginTop: 6 },
  modalIdBlock: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 12, gap: 6 },
  modalIdItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalIdLabel: { fontSize: 11, fontWeight: '600', color: '#999', textTransform: 'uppercase' },
  modalIdValue: { fontSize: 11, fontWeight: '700', color: '#666', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  modalDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#f0f0f0', borderStyle: 'dashed' },
  modalTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0A2E2A' },
  modalTotalValue: { fontSize: 22, fontWeight: '900', color: '#0DB591' },
  modalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 20, justifyContent: 'center' },
  modalStatusText: { fontSize: 14, fontWeight: '700' },
  modalPayBtn: { backgroundColor: '#0DB591', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  modalPayBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
