import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../../api/axiosInstance';

export default function AddDoctorScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    qualifications: '',
    availability: '',
  });
  
  const [errors, setErrors] = useState({});
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required';
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
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required';
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
    
    if (!formData.availability.trim()) {
      newErrors.availability = 'Availability is required';
      valid = false;
    }

    if (!image) {
      newErrors.image = 'Profile Image is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('email', formData.email.trim().toLowerCase());
      data.append('phone', formData.phone.trim());
      data.append('specialization', formData.specialization.trim());
      data.append('experience', formData.experience.trim());
      data.append('qualifications', formData.qualifications.trim());
      
      // Formatting availability to match backend schema format if necessary.
      // Easiest is to stringify as JSON or send as string depending on backend.
      // Sending as JSON string so backend schedule parser can handle it if expecting schedule.
      data.append('schedule', JSON.stringify({ "Availability": [formData.availability.trim()] }));

      if (image) {
        let localUri = image;
        let filename = localUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image`;
        
        data.append('profilePhoto', { uri: localUri, name: filename, type });
      }

      await axiosInstance.post('/doctors', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Doctor profile added successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack() // Navigate back to Manage Doctors
        }
      ]);
    } catch (error) {
      console.error('Add Doctor Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message;
      Alert.alert('Error', `Failed to add doctor: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Doctor Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Doctor Details</Text>
          <Text style={styles.cardSubtitle}>Fill out the professional profile information below.</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.name && styles.inputWrapError]}>
              <Ionicons name="person-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Full Name"
                placeholderTextColor="#A3B5B3"
                value={formData.name} 
                onChangeText={(text) => {
                  setFormData({...formData, name: text});
                  if (errors.name) setErrors({...errors, name: null});
                }} 
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.email && styles.inputWrapError]}>
              <Ionicons name="mail-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Email Address"
                placeholderTextColor="#A3B5B3"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email} 
                onChangeText={(text) => {
                  setFormData({...formData, email: text});
                  if (errors.email) setErrors({...errors, email: null});
                }} 
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.phone && styles.inputWrapError]}>
              <Ionicons name="call-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Phone Number"
                placeholderTextColor="#A3B5B3"
                keyboardType="phone-pad"
                value={formData.phone} 
                onChangeText={(text) => {
                  setFormData({...formData, phone: text});
                  if (errors.phone) setErrors({...errors, phone: null});
                }} 
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Specialization */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.specialization && styles.inputWrapError]}>
              <Ionicons name="medkit-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Specialization (e.g., Cardiologist)"
                placeholderTextColor="#A3B5B3"
                value={formData.specialization} 
                onChangeText={(text) => {
                  setFormData({...formData, specialization: text});
                  if (errors.specialization) setErrors({...errors, specialization: null});
                }} 
              />
            </View>
            {errors.specialization && <Text style={styles.errorText}>{errors.specialization}</Text>}
          </View>

          {/* Experience */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.experience && styles.inputWrapError]}>
              <Ionicons name="briefcase-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Experience (Years)"
                placeholderTextColor="#A3B5B3"
                keyboardType="numeric"
                value={formData.experience} 
                onChangeText={(text) => {
                  setFormData({...formData, experience: text});
                  if (errors.experience) setErrors({...errors, experience: null});
                }} 
              />
            </View>
            {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
          </View>

          {/* Qualifications */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.qualifications && styles.inputWrapError]}>
              <Ionicons name="school-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Qualifications (e.g., MBBS, MD)"
                placeholderTextColor="#A3B5B3"
                value={formData.qualifications} 
                onChangeText={(text) => {
                  setFormData({...formData, qualifications: text});
                  if (errors.qualifications) setErrors({...errors, qualifications: null});
                }} 
              />
            </View>
            {errors.qualifications && <Text style={styles.errorText}>{errors.qualifications}</Text>}
          </View>

          {/* Availability */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrap, errors.availability && styles.inputWrapError]}>
              <Ionicons name="time-outline" size={18} color="#87A2A0" />
              <TextInput 
                style={styles.input} 
                placeholder="Availability (e.g., Mon-Fri 9AM-5PM)"
                placeholderTextColor="#A3B5B3"
                value={formData.availability} 
                onChangeText={(text) => {
                  setFormData({...formData, availability: text});
                  if (errors.availability) setErrors({...errors, availability: null});
                }} 
              />
            </View>
            {errors.availability && <Text style={styles.errorText}>{errors.availability}</Text>}
          </View>

          {/* Profile Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.imageLabel}>Profile Photo</Text>
            <TouchableOpacity 
              style={[styles.imagePicker, errors.image && styles.imagePickerError]} 
              onPress={handlePickImage}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.uploadIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#0DB591" />
                  </View>
                  <Text style={styles.imagePlaceholderText}>Tap to select an image</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Add Doctor</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A4B44',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A4B44',
  },
  cardSubtitle: {
    color: '#5F7A77',
    marginTop: 4,
    marginBottom: 20,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#DCEBE8',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#FBFEFD',
  },
  inputWrapError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDEDEC',
  },
  input: {
    flex: 1,
    color: '#123F39',
    fontSize: 14,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A4B44',
    marginBottom: 10,
    marginLeft: 4,
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#DCEBE8',
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBFEFD',
    overflow: 'hidden',
  },
  imagePickerError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDEDEC',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePlaceholderText: {
    color: '#87A2A0',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#0DB591',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
