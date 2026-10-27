import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorName } from '../../theme';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

export default function AddPrescriptionScreen({ route, navigation }) {
  const { appointment } = route.params;
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedication = (index) => {
    const newMeds = [...medications];
    newMeds.splice(index, 1);
    setMedications(newMeds);
  };

  const updateMedication = (index, field, value) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;
    setMedications(newMeds);
  };

  const validate = () => {
    let newErrors = {};
    if (!diagnosis.trim()) newErrors.diagnosis = 'Diagnosis is required';
    
    const medsIncomplete = medications.some(m => !m.name || !m.dosage || !m.frequency || !m.duration);
    if (medsIncomplete) newErrors.medications = 'Please fill all medication fields completely';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await axiosInstance.post('/prescriptions', {
        appointmentId: appointment._id,
        diagnosis,
        medications,
        instructions
      });
      Alert.alert('Success', 'Prescription created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to create prescription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F2A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write Prescription</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Patient: <Text style={styles.infoValue}>{appointment.patientName || appointment.patientId?.name || 'Unknown'}</Text></Text>
          <Text style={styles.infoLabel}>Doctor: <Text style={styles.infoValue}>{appointment.doctorId?.name ? doctorName(appointment.doctorId.name) : 'Doctor'}</Text></Text>
          <Text style={styles.infoLabel}>Date: <Text style={styles.infoValue}>{new Date(appointment.date).toLocaleDateString()} at {appointment.time}</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>Diagnosis <Text style={{color: 'red'}}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.diagnosis && styles.inputError, { marginBottom: errors.diagnosis ? 5 : 10 }]}
          placeholder="Enter diagnosis (e.g., Viral Fever)"
          value={diagnosis}
          onChangeText={(text) => {
            setDiagnosis(text);
            if (errors.diagnosis) setErrors(prev => ({ ...prev, diagnosis: null }));
          }}
        />
        {errors.diagnosis && <Text style={styles.errorText}>{errors.diagnosis}</Text>}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medications</Text>
          <TouchableOpacity onPress={handleAddMedication} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#0C6875" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {errors.medications && <Text style={[styles.errorText, { marginBottom: 15 }]}>{errors.medications}</Text>}

        {medications.map((med, index) => (
          <View key={index} style={styles.medCard}>
            <View style={styles.medHeader}>
              <Text style={styles.medIndex}>Medication {index + 1}</Text>
              {medications.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveMedication(index)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Medicine Name (e.g. Paracetamol)"
              value={med.name}
              onChangeText={(text) => updateMedication(index, 'name', text)}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Dosage (e.g. 500mg)"
                value={med.dosage}
                onChangeText={(text) => updateMedication(index, 'dosage', text)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Frequency (e.g. 1-0-1)"
                value={med.frequency}
                onChangeText={(text) => updateMedication(index, 'frequency', text)}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Duration (e.g. 5 days)"
              value={med.duration}
              onChangeText={(text) => updateMedication(index, 'duration', text)}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any dietary or lifestyle advice..."
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Prescription</Text>
          )}
        </TouchableOpacity>
        <View style={{height: 40}}/>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F2A2E' },
  backBtn: { padding: 5 },
  scroll: { padding: 20 },
  infoBox: {
    backgroundColor: '#E7F1F2',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  infoValue: { fontWeight: 'bold', color: '#0F2A2E' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F2A2E' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#0C6875' },
  addBtnText: { color: '#0C6875', fontWeight: '600', marginLeft: 4 },
  medCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  medIndex: { fontWeight: 'bold', color: '#666' },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#0C6875', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#FF3B30', fontSize: 12 },
  inputError: { borderColor: '#FF3B30' },
});
