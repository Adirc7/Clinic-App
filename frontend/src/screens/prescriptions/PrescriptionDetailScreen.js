import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorName } from '../../theme';
import axiosInstance from '../../api/axiosInstance';

export default function PrescriptionDetailScreen({ route, navigation }) {
  const { appointmentId } = route.params;
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        const res = await axiosInstance.get(`/prescriptions/appointment/${appointmentId}`);
        setPrescription(res.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Prescription fetch error:', error);
        }
        setPrescription(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPrescription();
  }, [appointmentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0DB591" />
      </SafeAreaView>
    );
  }

  if (!prescription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A4B44" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescription</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={60} color="#CCC" />
          <Text style={styles.emptyText}>No prescription found for this appointment yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Prescription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <View style={styles.paperHeader}>
            <Text style={styles.clinicName}>HealthCare Clinic</Text>
            <Text style={styles.docName}>
              {prescription.doctorId?.name ? doctorName(prescription.doctorId.name) : 'Doctor'}
            </Text>
            <Text style={styles.docSpec}>{prescription.doctorId?.specialization}</Text>
            <View style={styles.divider} />
            <Text style={styles.patientInfo}>Patient: {prescription.patientId?.name}</Text>
            <Text style={styles.idInfo}>Appointment ID: {prescription.appointmentId?._id || prescription.appointmentId}</Text>
            <Text style={styles.idInfo}>Doctor ID: {prescription.doctorId?._id}</Text>
            {prescription.diagnosis && (
              <Text style={styles.patientInfo}>Diagnosis: {prescription.diagnosis}</Text>
            )}
            <Text style={styles.dateText}>Date: {new Date(prescription.createdAt).toLocaleDateString()}</Text>
          </View>

          <View style={styles.rxSymbol}>
            <Text style={styles.rxText}>Rx</Text>
          </View>

          {prescription.medications.map((med, index) => (
            <View key={index} style={styles.medRow}>
              <Text style={styles.medName}>
                {index + 1}. {med.name}
              </Text>
              <Text style={styles.medDetails}>
                {med.dosage}  |  {med.frequency}  |  {med.duration}
              </Text>
            </View>
          ))}

          {prescription.instructions ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.instLabel}>Doctor&apos;s Advice:</Text>
              <Text style={styles.instText}>{prescription.instructions}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Digitally Signed by {prescription.doctorId?.name ? doctorName(prescription.doctorId.name) : 'Doctor'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A4B44' },
  backBtn: { padding: 5 },
  emptyText: { color: '#666', marginTop: 15, fontSize: 16 },
  scroll: { padding: 20 },
  paper: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  paperHeader: { alignItems: 'center', marginBottom: 20 },
  clinicName: { fontSize: 20, fontWeight: 'bold', color: '#0DB591', marginBottom: 5 },
  docName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  docSpec: { fontSize: 14, color: '#666' },
  divider: { height: 1, backgroundColor: '#E0E0E0', width: '100%', marginVertical: 15 },
  patientInfo: { fontSize: 14, fontWeight: '600', color: '#333', alignSelf: 'flex-start' },
  idInfo: { fontSize: 12, color: '#0DB591', alignSelf: 'flex-start', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  dateText: { fontSize: 13, color: '#666', alignSelf: 'flex-start', marginTop: 5 },
  rxSymbol: { marginBottom: 20 },
  rxText: { fontSize: 28, fontWeight: 'bold', color: '#1A4B44', fontStyle: 'italic' },
  medRow: { marginBottom: 15 },
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  medDetails: { fontSize: 14, color: '#666', marginLeft: 15 },
  instructionsBox: { marginTop: 20, padding: 15, backgroundColor: '#F9F9F9', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  instLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  instText: { fontSize: 14, color: '#555', lineHeight: 20 },
  footer: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, alignItems: 'flex-end' },
  footerText: { fontSize: 12, color: '#999', fontStyle: 'italic' }
});
