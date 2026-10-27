import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';
import * as WebBrowser from 'expo-web-browser';

export default function DoctorPatientRecordsScreen({ route, navigation }) {
  const { patientId, patientName } = route.params;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/medical-records/patient/${patientId}`);
      setRecords(res.data || []);
    } catch (error) {
      console.error('Fetch records error:', error);
      Alert.alert('Error', 'Failed to load patient medical records.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleViewDocument = async (url) => {
    try {
      await WebBrowser.openBrowserAsync(buildServerUrl(url));
    } catch (_error) {
      Alert.alert('Error', 'Unable to open document');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{patientName}&apos;s Records</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ padding: 16 }}>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={60} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>No Records Available</Text>
              <Text style={styles.emptySubtitle}>This patient has not uploaded any medical records yet.</Text>
            </View>
          ) : (
            records.map((record) => (
              <View key={record._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Ionicons 
                      name={record.fileType?.includes('pdf') ? "document-text" : "image"} 
                      size={24} 
                      color={record.fileType?.includes('pdf') ? "#E74C3C" : "#3498DB"} 
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{record.title}</Text>
                  </View>
                </View>

                {record.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{record.description}</Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.metaInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.metaText}>{new Date(record.recordDate).toLocaleDateString()}</Text>
                  </View>
                  {record.relatedDoctor && (
                    <View style={styles.metaInfo}>
                      <Ionicons name="person-outline" size={14} color="#666" />
                      <Text style={styles.metaText}>{record.relatedDoctor}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.viewBtn}
                  onPress={() => handleViewDocument(record.fileUrl)}
                >
                  <Text style={styles.viewBtnText}>View Document</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0DB591" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Action Button for Doctor to Upload Records */}
      {!loading && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('AddMedicalRecord', { 
            patientId, 
            onRecordAdded: fetchRecords 
          })}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EFF3F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2B4A', flex: 1, textAlign: 'center', marginRight: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2B4A', flex: 1 },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F8F5', paddingVertical: 12, borderRadius: 8 },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: '#0DB591' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0DB591',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0DB591',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  }
});
