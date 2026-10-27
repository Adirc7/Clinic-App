import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

const QUICK_FEEDBACK_OPTIONS = [
  { id: 'friendly_doctor', label: 'Friendly doctor', icon: 'account-heart-outline' },
  { id: 'clear_explanations', label: 'Clear explanations', icon: 'message-text-outline' },
  { id: 'easy_booking', label: 'Easy booking', icon: 'calendar-check-outline' },
  { id: 'long_waiting', label: 'Long waiting time', icon: 'clock-alert-outline' },
  { id: 'hard_to_find', label: 'Hard to find doctor', icon: 'map-marker-question-outline' },
];

const SmallStarRating = ({ rating, setRating, size = 22 }) => {
  return (
    <View style={styles.smallStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={styles.starWrap}>
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? '#FFB300' : '#E0E6ED'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function RatingScreen({ navigation, route }) {
  const { doctorId, doctorName } = route.params || {};

  const [overallRating, setOverallRating] = useState(0);
  const [doctorRatings, setDoctorRatings] = useState({
    professionalism: 0,
    communication: 0,
    treatmentQuality: 0,
  });
  const [clinicRatings, setClinicRatings] = useState({
    cleanliness: 0,
    waitingTime: 0,
    staffFriendliness: 0,
  });

  const [quickFeedback, setQuickFeedback] = useState([]);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const getOverallHint = () => {
    switch (overallRating) {
      case 1: return 'Poor Experience';
      case 2: return 'Fair Experience';
      case 3: return 'Good Experience';
      case 4: return 'Very Good Experience';
      case 5: return 'Excellent Experience';
      default: return 'Tap a star to rate';
    }
  };

  const toggleQuickFeedback = (id) => {
    if (quickFeedback.includes(id)) {
      setQuickFeedback(quickFeedback.filter((item) => item !== id));
    } else {
      setQuickFeedback([...quickFeedback, id]);
    }
  };

  const updateDoctorRating = (key, value) => {
    setDoctorRatings({ ...doctorRatings, [key]: value });
  };

  const updateClinicRating = (key, value) => {
    setClinicRatings({ ...clinicRatings, [key]: value });
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating to continue.');
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post('/reviews', {
        doctorId,
        overallRating,
        doctorRatings,
        clinicRatings,
        quickFeedback,
        comment,
        isAnonymous,
      });

      Alert.alert(
        'Thank You!',
        'Your feedback helps us deliver better healthcare.\nWould you like to book your next appointment?',
        [
          { text: 'Not Now', style: 'cancel', onPress: () => navigation.goBack() },
          { 
            text: 'Book Again', 
            onPress: () => {
              navigation.goBack();
              navigation.navigate('Doctors');
            } 
          },
        ]
      );
    } catch (error) {
      Alert.alert('Submission Failed', getErrorMessage(error, 'We could not submit your rating right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F2A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="heart-pulse" size={32} color="#0C6875" />
            </View>
            <Text style={styles.heroTitle}>How was your visit?</Text>
            <Text style={styles.heroSub}>
              Your honest feedback ensures we provide the highest quality of care.
            </Text>
          </View>

          {/* Overall Rating Card */}
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.cardTitleCenter}>Overall Experience</Text>
            <View style={styles.mainStarsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setOverallRating(star)} activeOpacity={0.6}>
                  <Ionicons
                    name={star <= overallRating ? 'star' : 'star-outline'}
                    size={42}
                    color={star <= overallRating ? '#FFB300' : '#D1D9E6'}
                    style={styles.mainStar}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.ratingHint, overallRating > 0 && styles.ratingHintActive]}>
              {getOverallHint()}
            </Text>
          </View>

          {/* Quick Feedback Chips */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="flash-outline" size={18} color="#0F2A2E" />
              <Text style={styles.cardTitle}>Quick Feedback</Text>
            </View>
            <View style={styles.chipsWrap}>
              {QUICK_FEEDBACK_OPTIONS.map((option) => {
                const isSelected = quickFeedback.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.7}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleQuickFeedback(option.id)}
                  >
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={16} 
                      color={isSelected ? '#FFF' : '#64748B'} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Specific Ratings */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="analytics-outline" size={18} color="#0F2A2E" />
              <Text style={styles.cardTitle}>Detailed Ratings</Text>
            </View>

            {doctorId && (
              <View style={styles.ratingGroup}>
                <Text style={styles.groupLabel}>Dr. {doctorName}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Professionalism</Text>
                  <SmallStarRating rating={doctorRatings.professionalism} setRating={(v) => updateDoctorRating('professionalism', v)} />
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Communication</Text>
                  <SmallStarRating rating={doctorRatings.communication} setRating={(v) => updateDoctorRating('communication', v)} />
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Treatment Quality</Text>
                  <SmallStarRating rating={doctorRatings.treatmentQuality} setRating={(v) => updateDoctorRating('treatmentQuality', v)} />
                </View>
              </View>
            )}

            <View style={styles.ratingGroup}>
              <Text style={styles.groupLabel}>Clinic Facilities</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Cleanliness</Text>
                <SmallStarRating rating={clinicRatings.cleanliness} setRating={(v) => updateClinicRating('cleanliness', v)} />
              </View>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Waiting Time</Text>
                <SmallStarRating rating={clinicRatings.waitingTime} setRating={(v) => updateClinicRating('waitingTime', v)} />
              </View>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Staff Friendliness</Text>
                <SmallStarRating rating={clinicRatings.staffFriendliness} setRating={(v) => updateClinicRating('staffFriendliness', v)} />
              </View>
            </View>
          </View>

          {/* Written Review */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#0F2A2E" />
              <Text style={styles.cardTitle}>Additional Comments</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Tell us more about your experience (Optional)"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={styles.toggleRow} 
              activeOpacity={0.7}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
                {isAnonymous && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Submit Anonymously</Text>
                <Text style={styles.toggleDesc}>Your name will be hidden from the clinic staff</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#0C6875" />
            <Text style={styles.securityText}>
              Your data is encrypted and securely processed.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2A2E',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E7F1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  highlightCard: {
    paddingVertical: 28,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2A2E',
  },
  cardTitleCenter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2A2E',
    textAlign: 'center',
    marginBottom: 20,
  },
  mainStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mainStar: {
    textShadowColor: 'rgba(255, 179, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  ratingHintActive: {
    color: '#0C6875',
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  chipActive: {
    backgroundColor: '#0C6875',
    borderColor: '#0C6875',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFF',
  },
  ratingGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  smallStarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starWrap: {
    padding: 2,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#334155',
    minHeight: 120,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#0C6875',
    borderColor: '#0C6875',
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  submitBtn: {
    backgroundColor: '#0C6875',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C6875',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
