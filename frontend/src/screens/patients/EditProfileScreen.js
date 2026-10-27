import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosInstance, { buildServerUrl, getErrorMessage } from '../../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen({ navigation, route, onProfileCreated }) {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await axiosInstance.get('/patients/profile');
        if (res.data) {
          setIsUpdate(true);
          setGender(res.data.gender || 'Male');
          setBloodGroup(res.data.bloodGroup || '');
          setAddress(res.data.address || '');
          if (res.data.dateOfBirth) {
            setDateOfBirth(res.data.dateOfBirth.split('T')[0]);
          }
          if (res.data.emergencyContact) {
            setEmergencyName(res.data.emergencyContact.name || '');
            setEmergencyPhone(res.data.emergencyContact.phone || '');
            setEmergencyRelation(res.data.emergencyContact.relationship || '');
          }
          if (res.data.profilePhoto) {
            setProfilePhoto(buildServerUrl(res.data.profilePhoto));
          }
        }
      } catch (_err) {
        setIsUpdate(false);
      }
    };
    checkProfile();
  }, []);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required.';
    if (!gender) newErrors.gender = 'Gender is required.';
    
    if (bloodGroup && !/^(A|B|AB|O)[+-]$/i.test(bloodGroup)) {
      newErrors.bloodGroup = 'Invalid blood group format (e.g. O+, A-)';
    }

    if (!address || address.trim().length < 5) {
      newErrors.address = 'Address is required (min 5 characters).';
    }

    if (!emergencyName || emergencyName.trim().length < 2) {
      newErrors.emergencyName = 'Emergency contact name is required.';
    }

    if (!emergencyPhone || !/^\d{10}$/.test(emergencyPhone)) {
      newErrors.emergencyPhone = 'Valid 10-digit phone number is required.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setCustomAlert({
        visible: true,
        title: 'Form Incomplete',
        message: 'Please correct the highlighted errors before saving.',
        type: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('dateOfBirth', dateOfBirth);
      formData.append('gender', gender);
      formData.append('bloodGroup', bloodGroup.trim().toUpperCase());
      formData.append('address', address);
      formData.append('emergencyContact', JSON.stringify({
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelation
      }));

      if (profilePhoto && !profilePhoto.startsWith('http')) {
        let filename = profilePhoto.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image`;
        formData.append('profilePhoto', { uri: profilePhoto, name: filename, type });
      }

      if (isUpdate) {
        await axiosInstance.put('/patients/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post('/patients/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setCustomAlert({
        visible: true,
        title: 'Profile Updated! ✨',
        message: 'Your medical profile has been saved successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      setCustomAlert({
        visible: true,
        title: 'Save Failed',
        message: getErrorMessage(error, 'We encountered an error while saving your profile.'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Profile</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={24} color="#0DB591" />
          <Text style={styles.noticeText}>
            {isUpdate ? 'Keep your medical records up to date for better care.' : 'Please complete your profile to enable appointment booking.'}
          </Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity onPress={handlePickImage} style={styles.imagePlaceholder}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <Ionicons name="camera" size={32} color="#A3B5B3" />
            )}
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to upload profile photo</Text>
        </View>

        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput
          style={[styles.input, isUpdate && styles.inputDisabled, errors.dateOfBirth && styles.inputError]}
          placeholder="YYYY-MM-DD"
          value={dateOfBirth}
          onChangeText={(val) => { setDateOfBirth(val); setErrors({...errors, dateOfBirth: null}); }}
          editable={!isUpdate}
        />
        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

        <Text style={styles.label}>Gender *</Text>
        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => !isUpdate && setGender(g)}
              disabled={isUpdate}
            >
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Blood Group</Text>
        <TextInput
          style={[styles.input, errors.bloodGroup && styles.inputError]}
          placeholder="e.g. O+"
          value={bloodGroup}
          onChangeText={(val) => { setBloodGroup(val); setErrors({...errors, bloodGroup: null}); }}
        />
        {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}

        <Text style={styles.label}>Residential Address</Text>
        <TextInput
          style={[styles.input, errors.address && styles.inputError]}
          placeholder="Full address"
          value={address}
          onChangeText={(val) => { setAddress(val); setErrors({...errors, address: null}); }}
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        
        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={[styles.input, errors.emergencyName && styles.inputError]}
          placeholder="Name"
          value={emergencyName}
          onChangeText={(val) => { setEmergencyName(val); setErrors({...errors, emergencyName: null}); }}
        />
        {errors.emergencyName && <Text style={styles.errorText}>{errors.emergencyName}</Text>}

        <View style={{ flexDirection: 'row', gap: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.emergencyPhone && styles.inputError]}
              placeholder="10 digits"
              value={emergencyPhone}
              onChangeText={(val) => { setEmergencyPhone(val); setErrors({...errors, emergencyPhone: null}); }}
              keyboardType="phone-pad"
            />
            {errors.emergencyPhone && <Text style={styles.errorText}>{errors.emergencyPhone}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Relation</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Spouse"
              value={emergencyRelation}
              onChangeText={setEmergencyRelation}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>{isUpdate ? 'Update Profile' : 'Complete Registration'}</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── CUSTOM ALERT ── */}
      <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={() => setCustomAlert({ ...customAlert, visible: false })}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIcon, { backgroundColor: customAlert.type === 'success' ? '#E8F5F1' : customAlert.type === 'error' ? '#FFEBEE' : '#FFF3E0' }]}>
              <Ionicons 
                name={customAlert.type === 'success' ? "checkmark-circle" : customAlert.type === 'error' ? "close-circle" : "warning"} 
                size={34} 
                color={customAlert.type === 'success' ? "#0DB591" : customAlert.type === 'error' ? "#E53935" : "#FF9800"} 
              />
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMsg}>{customAlert.message}</Text>
            <TouchableOpacity 
              style={[styles.alertBtn, { backgroundColor: customAlert.type === 'success' ? '#0DB591' : customAlert.type === 'error' ? '#E53935' : '#FF9800' }]} 
              onPress={() => {
                setCustomAlert({ ...customAlert, visible: false });
                if (customAlert.type === 'success') {
                  if (onProfileCreated) onProfileCreated();
                  else navigation.goBack();
                }
              }}
            >
              <Text style={styles.alertBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EFF3F6' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A2B4A' },
  form: { padding: 20 },
  notice: {
    flexDirection: 'row',
    backgroundColor: '#E8F8F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  noticeText: { color: '#0E6E5D', flex: 1, fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E8F0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputError: {
    borderColor: '#E53935',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2B4A',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionDivider: { height: 1, backgroundColor: '#EFF3F6', marginVertical: 20 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E8F0',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  genderBtnActive: { backgroundColor: '#0DB591', borderColor: '#0DB591' },
  genderText: { color: '#666', fontWeight: '600' },
  genderTextActive: { color: '#FFF' },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0DB591',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imageHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#0DB591',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Custom Alert Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 25, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
  alertIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#1A2B4A', marginBottom: 8, textAlign: 'center' },
  alertMsg: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  alertBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  alertBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
