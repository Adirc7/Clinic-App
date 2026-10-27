import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';

const SPECIALIZATION_OPTIONS = [
  { label: 'General', value: 'General' },
  { label: 'Cardiologist', value: 'Cardiologist' },
  { label: 'Dentist', value: 'Dentist' },
  { label: 'Dermatologist', value: 'Dermatologist' },
  { label: 'Pediatrician', value: 'Pediatrician' },
  { label: 'Neurologist', value: 'Neurologist' },
  { label: 'Orthopedist', value: 'Orthopedist' },
  { label: 'Psychologist', value: 'Psychologist' },
  { label: 'Nutritionist', value: 'Nutritionist' },
  { label: 'ENT Specialist', value: 'ENT Specialist' },
];

const TIME_OPTIONS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EditDoctorScreen({ route, navigation }) {
  const doctor = route.params?.doctor;
  const isNewDoctor = !doctor;

  const [formData, setFormData] = useState({
    name: doctor?.name || '',
    email: doctor?.email || '',
    phone: doctor?.phone || '',
    specialization: doctor?.specialization || '',
    experience: doctor?.experience || '',
    qualifications: doctor?.qualifications || '',
    availabilityDays: doctor?.schedule?.days || [], // Array of day objects
    password: '', // Only for new doctors
  });

  const [errors, setErrors] = useState({});
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSpecializationModal, setShowSpecializationModal] = useState(false);
  const [showTimePickerFor, setShowTimePickerFor] = useState(null); // 'startTime' or 'endTime' for a specific day

  const isValid = useMemo(() => {
    const onlyDigits = formData.phone.replace(/\D/g, '');
    const hasRequiredFields =
      formData.name.trim().length >= 2 &&
      formData.email.includes('@') &&
      onlyDigits.length === 10 &&
      formData.specialization.trim().length > 0 &&
      formData.experience.trim().length > 0 &&
      formData.qualifications.trim().length > 0 &&
      formData.availabilityDays.length > 0;

    if (isNewDoctor) {
      return hasRequiredFields && formData.password.length >= 6;
    }
    return hasRequiredFields;
  }, [formData, isNewDoctor]);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setErrors((prev) => ({ ...prev, image: null }));
    }
  };

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      valid = false;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Invalid email format';
      valid = false;
    }

    const onlyDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim() || onlyDigits.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
      valid = false;
    }

    if (!formData.specialization.trim()) {
      newErrors.specialization = 'Specialization is required';
      valid = false;
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Experience is required';
      valid = false;
    }

    if (!formData.qualifications.trim()) {
      newErrors.qualifications = 'Qualifications are required';
      valid = false;
    }

    if (formData.availabilityDays.length === 0) {
      newErrors.availability = 'At least one availability slot is required';
      valid = false;
    }

    if (isNewDoctor && !formData.password.trim()) {
      newErrors.password = 'Password is required for new doctor accounts';
      valid = false;
    } else if (isNewDoctor && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      if (isNewDoctor) {
        // Create user account first — capture the new userId
        const userRes = await axiosInstance.post('/auth/create-doctor', {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        const newUserId = userRes.data?.user?.id;

        // Create doctor profile, linking to the new user account
        const data = new FormData();
        if (newUserId) data.append('userId', newUserId);
        data.append('name', formData.name.trim());
        data.append('email', formData.email.trim().toLowerCase());
        data.append('phone', formData.phone.trim());
        data.append('specialization', formData.specialization.trim());
        data.append('experience', formData.experience.trim());
        data.append('qualifications', formData.qualifications.trim());
        data.append(
          'schedule',
          JSON.stringify({
            days: formData.availabilityDays,
          })
        );

        if (image) {
          let filename = image.split('/').pop();
          let match = /\.(\w+)$/.exec(filename);
          let type = match ? `image/${match[1]}` : `image`;
          data.append('profilePhoto', {
            uri: image,
            name: filename,
            type,
          });
        }

        await axiosInstance.post('/doctors', data);

        Alert.alert('Success', 'Doctor account and profile created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Update existing doctor profile
        const data = new FormData();
        data.append('name', formData.name.trim());
        data.append('phone', formData.phone.trim());
        data.append('specialization', formData.specialization.trim());
        data.append('experience', formData.experience.trim());
        data.append('qualifications', formData.qualifications.trim());
        data.append(
          'schedule',
          JSON.stringify({
            days: formData.availabilityDays,
          })
        );

        if (image) {
          let filename = image.split('/').pop();
          let match = /\.(\w+)$/.exec(filename);
          let type = match ? `image/${match[1]}` : `image`;
          data.append('profilePhoto', {
            uri: image,
            name: filename,
            type,
          });
        }

        await axiosInstance.put(`/doctors/${doctor._id}`, data);

        Alert.alert('Success', 'Doctor profile updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Save error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.details?.join(', ') || '';
      const fullErrorMsg = errorDetails ? `${errorMsg}\n\n${errorDetails}` : errorMsg;
      Alert.alert('Error', `Failed to save: ${fullErrorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailabilitySlot = () => {
    setFormData(prev => ({
      ...prev,
      availabilityDays: [
        ...prev.availabilityDays,
        { day: 'Monday', startTime: '09:00 AM', endTime: '05:00 PM' }
      ]
    }));
  };

  const handleRemoveAvailabilitySlot = (index) => {
    setFormData(prev => ({
      ...prev,
      availabilityDays: prev.availabilityDays.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateAvailabilitySlot = (index, field, value) => {
    const updated = [...formData.availabilityDays];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, availabilityDays: updated }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNewDoctor ? 'Create Doctor' : 'Edit Doctor'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoPickerBox}
            onPress={handlePickImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.photoImage} />
            ) : doctor?.profilePhoto ? (
              <Image
                source={{ uri: buildServerUrl(doctor.profilePhoto) }}
                style={styles.photoImage}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#0DB591" />
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* New Doctor Info Section */}
        {isNewDoctor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <Text style={styles.sectionSubtitle}>
              Create login credentials for the doctor
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="doctor@clinic.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  setErrors({ ...errors, email: null });
                }}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Temporary Password *</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Min 6 characters"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => {
                  setFormData({ ...formData, password: text });
                  setErrors({ ...errors, password: null });
                }}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
          </View>
        )}

        {/* Doctor Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Dr. John Doe"
              value={formData.name}
              editable={isNewDoctor}
              onChangeText={(text) => {
                setFormData({ ...formData, name: text });
                setErrors({ ...errors, name: null });
              }}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => {
                setFormData({ ...formData, phone: text });
                setErrors({ ...errors, phone: null });
              }}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialization *</Text>
            <TouchableOpacity 
              style={[styles.input, errors.specialization && styles.inputError]}
              onPress={() => setShowSpecializationModal(true)}
            >
              <Text style={formData.specialization ? styles.selectedSpecText : styles.placeholderText}>
                {formData.specialization || 'Select a specialization'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {errors.specialization && (
              <Text style={styles.errorText}>{errors.specialization}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Experience *</Text>
            <TextInput
              style={[styles.input, errors.experience && styles.inputError]}
              placeholder="e.g., 10 years in cardiology"
              value={formData.experience}
              onChangeText={(text) => {
                setFormData({ ...formData, experience: text });
                setErrors({ ...errors, experience: null });
              }}
              multiline
              numberOfLines={2}
            />
            {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Qualifications *</Text>
            <TextInput
              style={[styles.input, errors.qualifications && styles.inputError]}
              placeholder="e.g., MD, Board Certified"
              value={formData.qualifications}
              onChangeText={(text) => {
                setFormData({ ...formData, qualifications: text });
                setErrors({ ...errors, qualifications: null });
              }}
              multiline
              numberOfLines={2}
            />
            {errors.qualifications && (
              <Text style={styles.errorText}>{errors.qualifications}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Availability Schedule *</Text>
            <Text style={styles.helperText}>Add your working days and times</Text>
            
            {formData.availabilityDays.length > 0 && (
              <View style={styles.availabilityList}>
                {formData.availabilityDays.map((slot, index) => (
                  <View key={index} style={styles.availabilitySlot}>
                    <TouchableOpacity
                      style={styles.availabilityDay}
                      onPress={() => {
                        const updated = [...formData.availabilityDays];
                        const currentIndex = DAYS_OF_WEEK.indexOf(slot.day);
                        const nextDay = DAYS_OF_WEEK[(currentIndex + 1) % DAYS_OF_WEEK.length];
                        updated[index].day = nextDay;
                        setFormData(prev => ({ ...prev, availabilityDays: updated }));
                      }}
                    >
                      <Text style={styles.dayText}>{slot.day}</Text>
                      <Ionicons name="chevron-down" size={16} color="#0DB591" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.availabilityTime}
                      onPress={() => setShowTimePickerFor({ type: 'startTime', index })}
                    >
                      <Ionicons name="time" size={16} color="#0DB591" />
                      <Text style={styles.timeText}>{slot.startTime}</Text>
                    </TouchableOpacity>

                    <Text style={styles.timeSeparator}>to</Text>

                    <TouchableOpacity
                      style={styles.availabilityTime}
                      onPress={() => setShowTimePickerFor({ type: 'endTime', index })}
                    >
                      <Ionicons name="time" size={16} color="#0DB591" />
                      <Text style={styles.timeText}>{slot.endTime}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveAvailabilitySlot(index)}
                    >
                      <Ionicons name="close" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={styles.addSlotButton}
              onPress={handleAddAvailabilitySlot}
            >
              <Ionicons name="add-circle" size={20} color="#0DB591" />
              <Text style={styles.addSlotText}>Add Time Slot</Text>
            </TouchableOpacity>

            {errors.availability && (
              <Text style={styles.errorText}>{errors.availability}</Text>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
          disabled={!isValid || loading}
          onPress={handleSave}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isNewDoctor ? 'Create Doctor' : 'Update Doctor'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Specialization Modal */}
      <Modal visible={showSpecializationModal} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Specialization</Text>
            <TouchableOpacity onPress={() => setShowSpecializationModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SPECIALIZATION_OPTIONS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  formData.specialization === item.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, specialization: item.value });
                  setErrors({ ...errors, specialization: null });
                  setShowSpecializationModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    formData.specialization === item.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={!!showTimePickerFor} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity onPress={() => setShowTimePickerFor(null)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = 
                showTimePickerFor?.type === 'startTime'
                  ? formData.availabilityDays[showTimePickerFor.index]?.startTime === item
                  : formData.availabilityDays[showTimePickerFor?.index]?.endTime === item;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    if (showTimePickerFor) {
                      handleUpdateAvailabilitySlot(
                        showTimePickerFor.index,
                        showTimePickerFor.type,
                        item
                      );
                      setShowTimePickerFor(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A4B44',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPickerBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0DB591',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 12,
    color: '#0DB591',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A4B44',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#A3B5B3',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A4B44',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F3F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A4B44',
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#0DB591',
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
  // New styles for specialization and availability
  selectedSpecText: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  placeholderText: {
    flex: 1,
    color: '#999',
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    marginBottom: 12,
  },
  availabilityList: {
    marginVertical: 12,
    gap: 10,
  },
  availabilitySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F3F0',
    gap: 8,
  },
  availabilityDay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F0F8F5',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A4B44',
  },
  availabilityTime: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F0F8F5',
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0DB591',
  },
  timeSeparator: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0DB591',
    borderRadius: 10,
    marginTop: 12,
  },
  addSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0DB591',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A4B44',
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F8F5',
  },
  modalOptionSelected: {
    backgroundColor: '#F0F8F5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: '#0DB591',
  },
});
