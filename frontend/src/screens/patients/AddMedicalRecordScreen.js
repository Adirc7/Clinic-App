import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DateField from '../../components/DateField';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

export default function AddMedicalRecordScreen({ navigation, route }) {
  const { onRecordAdded, patientId } = route.params || {};
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedDoctor, setRelatedDoctor] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.log('Error picking file:', err);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !file) {
      Alert.alert('Validation Error', 'Title and File are required fields.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('recordDate', recordDate.toISOString());
      if (relatedDoctor) {
        formData.append('relatedDoctor', relatedDoctor);
      }
      
      if (patientId) {
        formData.append('patientId', patientId);
      }
      
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      await axiosInstance.post('/medical-records', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Medical record uploaded successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (onRecordAdded) onRecordAdded();
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', getErrorMessage(error, 'Failed to upload document'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Record</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Record Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Blood Test Report"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Record <Text style={styles.required}>*</Text></Text>
          <DateField value={recordDate} onChange={setRecordDate} maximumDate={new Date()} iconLeft style={[styles.datePickerBtn, { marginBottom: 0 }]} textStyle={styles.datePickerText} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Related Doctor (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Smith"
            value={relatedDoctor}
            onChangeText={setRelatedDoctor}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Document File (PDF/Image) <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity 
            style={styles.uploadBox} 
            onPress={handlePickFile}
          >
            {file ? (
              <View style={styles.fileSelected}>
                <Ionicons name="document-text" size={40} color="#0C6875" />
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.changeFileText}>Tap to change file</Text>
              </View>
            ) : (
              <View style={styles.fileEmpty}>
                <Ionicons name="cloud-upload-outline" size={40} color="#999" />
                <Text style={styles.uploadPrompt}>Tap to select a file</Text>
                <Text style={styles.uploadSubtext}>Supported: JPG, PNG, PDF (Max 10MB)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Upload Medical Record</Text>
          )}
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EFF3F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B4A' },
  content: { flex: 1, padding: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  required: { color: '#FF3B30' },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E8F0', borderRadius: 12, padding: 14, gap: 10 },
  datePickerText: { fontSize: 15, color: '#333' },
  uploadBox: { borderWidth: 2, borderColor: '#E0E8F0', borderStyle: 'dashed', borderRadius: 16, backgroundColor: '#FAFCFF', padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  fileSelected: { alignItems: 'center', gap: 8 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center', marginTop: 8 },
  changeFileText: { fontSize: 12, color: '#0C6875', marginTop: 4 },
  fileEmpty: { alignItems: 'center', gap: 8 },
  uploadPrompt: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 8 },
  uploadSubtext: { fontSize: 12, color: '#999' },
  submitBtn: { backgroundColor: '#0C6875', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
