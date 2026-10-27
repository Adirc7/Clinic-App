import React, { useState, useMemo, useEffect, useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { Button, GradientHeader } from '../../components/ui';
import { colors, doctorName, radius, shadow } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { toDateKey, addDays } from '../../utils/date';

export default function DoctorDetailScreen({ route, navigation, currentUser }) {
  const { doctor, editingAppointment } = route.params;
  // Height of the patient tab bar (undefined when shown outside the tabs)
  const tabBarHeight = useContext(BottomTabBarHeightContext) || 0;
  const [selectedDate, setSelectedDate] = useState(editingAppointment ? {
    fullDate: new Date(editingAppointment.date),
    day: new Date(editingAppointment.date).toLocaleDateString('en-US', { weekday: 'short' }),
    fullDayName: new Date(editingAppointment.date).toLocaleDateString('en-US', { weekday: 'long' }),
    date: new Date(editingAppointment.date).getDate(),
    month: new Date(editingAppointment.date).getMonth(),
    year: new Date(editingAppointment.date).getFullYear(),
  } : null);
  const [selectedTime, setSelectedTime] = useState(editingAppointment?.time || null);
  const [markedDates, setMarkedDates] = useState({});
  const [booking, setBooking] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    firstName: editingAppointment?.patientName ? editingAppointment.patientName.split(' ')[0] : (currentUser?.name ? currentUser.name.split(' ')[0] : ''),
    lastName: editingAppointment?.patientName && editingAppointment.patientName.split(' ').length > 1 ? editingAppointment.patientName.split(' ').slice(1).join(' ') : (currentUser?.name && currentUser.name.split(' ').length > 1 ? currentUser.name.split(' ').slice(1).join(' ') : ''),
    dob: editingAppointment?.patientAge ? new Date(editingAppointment.patientAge) : new Date(),
    gender: editingAppointment?.description?.includes('Gender: Female') ? 'Female' : 'Male',
    address: editingAppointment?.patientAddress || '',
    phone: editingAppointment?.patientPhone || '',
    reason: editingAppointment?.description?.split('Reason: ')[1] || '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [settings, setSettings] = useState({ allowAnytimeBooking: false, minBookingDays: 3 });
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, holidayRes] = await Promise.all([
          axiosInstance.get('/settings'),
          axiosInstance.get('/holidays')
        ]);
        setSettings(settingsRes.data);
        setHolidays(holidayRes.data || []);
      } catch (error) {
        console.log('Fetch error:', error);
      }
    };
    fetchData();
  }, []);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || formData.dob;
    setShowDatePicker(false);
    setFormData({ ...formData, dob: currentDate });
  };

  const handleOpenForm = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select a date and time before booking.');
      return;
    }

    if (currentUser?.role === 'patient') {
      try {
        await axiosInstance.get('/patients/profile');
      } catch (error) {
        if (error.response?.status === 404) {
          Alert.alert(
            'Profile Required',
            'You need to complete your medical profile before booking an appointment.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Complete Profile', 
                onPress: () => navigation.navigate('EditProfile') 
              }
            ]
          );
          return;
        } else {
          Alert.alert('Error', 'Failed to verify your profile. Please try again.');
          return;
        }
      }
    }

    setFormVisible(true);
  };

  const validateForm = () => {
    let newErrors = {};
    const phoneRegex = /^[0-9]{10}$/;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit number';
    }

    if (formData.dob >= today) {
      newErrors.dob = 'DOB must be in the past';
    }

    if (!formData.reason.trim()) newErrors.reason = 'Reason for visit is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitBookingForm = async () => {
    if (!validateForm()) return;

    try {
      setBooking(true);
      const bookingDate = new Date(
        selectedDate.year,
        selectedDate.month,
        selectedDate.date
      );

      const patientName = `${formData.firstName} ${formData.lastName}`.trim();
      const ageStr = toDateKey(formData.dob);
      const desc = `Gender: ${formData.gender}\nReason: ${formData.reason}`;

      if (editingAppointment) {
        await axiosInstance.put(`/appointments/${editingAppointment._id}`, {
          patientName: patientName,
          patientAge: ageStr,
          patientAddress: formData.address,
          patientPhone: formData.phone,
          date: bookingDate.toISOString(),
          time: selectedTime,
          description: desc,
        });
        Alert.alert(
          'Update Confirmed! ✅',
          'Your appointment has been successfully updated.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        await axiosInstance.post('/appointments', {
          doctorId: doctor._id,
          patientName: patientName,
          patientAge: ageStr,
          patientAddress: formData.address,
          patientPhone: formData.phone,
          date: bookingDate.toISOString(),
          time: selectedTime,
          description: desc,
        });
        Alert.alert(
          'Booking Confirmed! ✅',
          `Your appointment with ${doctor.name} is booked for ${selectedDate.day} at ${selectedTime}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      setFormVisible(false);
    } catch (error) {
      console.error('Booking error:', error);
      let msg = 'Failed to book appointment.';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        msg = error.response.data.errors[0].message;
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      
      Alert.alert('Booking Failed', msg);
    } finally {
      setBooking(false);
    }
  };



  // Calculate marked dates for the calendar
  useEffect(() => {
    const marks = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Booking window comes from the admin settings (same rule the server enforces)
    const minDate = addDays(settings.allowAnytimeBooking ? 0 : settings.minBookingDays || 0);
    const maxDate = addDays(17);

    const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Iterate through the range
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateString = toDateKey(d);
      const dayName = longDays[d.getDay()];
      const isAvailable = doctor.schedule?.days?.some(day => day.day === dayName);

      if (isAvailable) {
        marks[dateString] = {
          marked: true,
          dotColor: colors.primary,
          disabled: false,
        };
      } else {
        marks[dateString] = {
          disabled: true,
          disableTouchEvent: true,
          textColor: '#d9e1e8'
        };
      }
    }

    // Highlight selected date
    if (selectedDate) {
      const selectedStr = toDateKey(selectedDate.fullDate);
      if (marks[selectedStr]) {
        marks[selectedStr] = {
          ...marks[selectedStr],
          selected: true,
          selectedColor: colors.primary,
        };
      } else {
        marks[selectedStr] = {
          selected: true,
          selectedColor: colors.primary,
        };
      }
    }

    setMarkedDates(marks);
  }, [doctor.schedule, selectedDate, settings]);

  const availableTimes = useMemo(() => {
    if (!selectedDate || !doctor.schedule?.days) return [];
    
    // Find if doctor works on this day of week
    const daySchedule = doctor.schedule.days.find(d => d.day === selectedDate.fullDayName);
    if (!daySchedule) return [];

    const parseTime = (timeStr) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours, 10);
      if (hours === 12) {
        hours = modifier === 'PM' ? 12 : 0;
      } else if (modifier === 'PM') {
        hours += 12;
      }
      return { hours, minutes: parseInt(minutes, 10) };
    };

    const formatTime = (hours, minutes) => {
      const modifier = hours >= 12 ? 'PM' : 'AM';
      let formattedHours = hours % 12;
      formattedHours = formattedHours === 0 ? 12 : formattedHours;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const hourStr = formattedHours < 10 ? `0${formattedHours}` : formattedHours;
      return `${hourStr}:${formattedMinutes} ${modifier}`;
    };

    const start = parseTime(daySchedule.startTime);
    const end = parseTime(daySchedule.endTime);
    
    const slots = [];
    let currentHours = start.hours;
    let currentMinutes = start.minutes;
    
    while (currentHours < end.hours || (currentHours === end.hours && currentMinutes < end.minutes)) {
      slots.push(formatTime(currentHours, currentMinutes));
      currentHours += 1; // 1 hour slots
    }
    
    return slots;
  }, [selectedDate, doctor.schedule]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <GradientHeader style={{ paddingBottom: 70 }}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>{editingAppointment ? 'Update appointment' : 'Doctor profile'}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.profileSection}>
            <Avatar name={doctor.name} photo={doctor.profilePhoto} size={84} radius={26} style={styles.profileImage} />
            <View style={styles.profileInfo}>
              <Text style={styles.doctorName} numberOfLines={2}>{doctorName(doctor.name)}</Text>
              <Text style={styles.specialization}>{doctor.specialization || 'General Practice'}</Text>
              <View style={styles.verified}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.verifiedText}>Verified specialist</Text>
              </View>
            </View>
          </View>
        </GradientHeader>

        {/* Stats card overlapping the hero */}
        <View style={styles.statsRow}>
          {[
            { icon: 'star', color: '#F59E0B', value: doctor.averageRating || '5.0', label: 'Rating' },
            { icon: 'chatbubble-ellipses', color: colors.info, value: String(doctor.totalReviews || 0), label: 'Reviews' },
            { icon: 'briefcase', color: colors.primary, value: (doctor.experience || '—').replace(/\s*years?/i, ' yrs'), label: 'Experience' },
          ].map((st) => (
            <View key={st.label} style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: st.color + '1A' }]}>
                <Ionicons name={st.icon} size={16} color={st.color} />
              </View>
              <Text style={styles.statText} numberOfLines={1}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.body}>
          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.aboutContent}>
              {doctor.qualifications ? (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIcon}><Ionicons name="school-outline" size={16} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aboutLabel}>Qualifications</Text>
                    <Text style={styles.aboutText}>{doctor.qualifications}</Text>
                  </View>
                </View>
              ) : null}
              {doctor.phone ? (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIcon}><Ionicons name="call-outline" size={16} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aboutLabel}>Contact</Text>
                    <Text style={styles.aboutText}>{doctor.phone}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Weekly availability */}
          {doctor.schedule?.days && doctor.schedule.days.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Weekly hours</Text>
                <View style={styles.availableBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.availableText}>Accepting bookings</Text>
                </View>
              </View>
              <View style={styles.availabilityGrid}>
                {doctor.schedule.days.map((slot, index) => (
                  <View key={index} style={styles.availabilityItem}>
                    <Text style={styles.dayName}>{slot.day.slice(0, 3)}</Text>
                    <Text style={styles.dayTime}>{slot.startTime.replace(' ', '')}{'\n'}{slot.endTime.replace(' ', '')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Booking tips */}
          <View style={styles.adviceBox}>
            <View style={styles.adviceItem}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.adviceText}>Please arrive 15 minutes before your scheduled time.</Text>
            </View>
            <View style={styles.adviceItem}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={styles.adviceText}>
                {settings.allowAnytimeBooking
                  ? 'Appointments can be booked any day the doctor is available.'
                  : `Appointments must be booked at least ${settings.minBookingDays} days in advance.`}
              </Text>
            </View>
          </View>

        {/* Date Section - Professional Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a date</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={{
                ...markedDates,
                ...holidays.reduce((acc, h) => ({
                  ...acc,
                  [h.date]: { disabled: true, disableTouchEvent: true, marked: true, dotColor: '#FF3B30', textColor: '#D1D1D1' }
                }), {}),
                [selectedDate ? `${selectedDate.year}-${(selectedDate.month + 1).toString().padStart(2, '0')}-${selectedDate.date.toString().padStart(2, '0')}` : '']: { selected: true, selectedColor: colors.primary }
              }}
              minDate={toDateKey(addDays(settings.allowAnytimeBooking ? 0 : settings.minBookingDays || 0))}
              maxDate={toDateKey(addDays(17))}
              onDayPress={day => {
                const dateObj = new Date(day.year, day.month - 1, day.day);
                const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                
                setSelectedDate({
                  fullDate: dateObj,
                  day: shortDays[dateObj.getDay()],
                  fullDayName: longDays[dateObj.getDay()],
                  date: dateObj.getDate(),
                  month: dateObj.getMonth(),
                  year: dateObj.getFullYear(),
                });
                setSelectedTime(null);
              }}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: colors.ink,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: colors.primary,
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                monthTextColor: colors.ink,
                indicatorColor: colors.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14
              }}
              style={styles.calendar}
            />
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#d9e1e8' }]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>

        {/* Time Section */}
        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Choose a time</Text>
        <View style={styles.timeContainer}>
          {!selectedDate ? (
            <Text style={styles.noTimeText}>Please select a date to see available times.</Text>
          ) : availableTimes.length === 0 ? (
            <Text style={styles.noTimeText}>Doctor is not available on {selectedDate.fullDayName}s.</Text>
          ) : (
            availableTimes.map((time, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.timeCard, selectedTime === time && styles.timeCardSelected]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.timeText, selectedTime === time && styles.textSelected]}>{time}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        
        </View>
        <View style={{ height: 170 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: tabBarHeight + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>{selectedDate ? `${selectedDate.day}, ${selectedDate.date}` : 'No date selected'}</Text>
          <Text style={styles.bottomValue}>{selectedTime || 'Pick a time slot'}</Text>
        </View>
        <Button
          title={editingAppointment ? 'Update' : 'Book now'}
          icon="calendar"
          onPress={handleOpenForm}
          loading={booking}
          disabled={!selectedDate || !selectedTime}
          style={{ minWidth: 150 }}
        />
      </View>

      {/* Booking Form Modal */}
      <Modal
        visible={formVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFormVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalDoctorName}>
                {doctorName(doctor.name)}
              </Text>
              <Text style={styles.modalDoctorSpec}>{doctor.specialization}</Text>
              {selectedDate && selectedTime && (
                <Text style={styles.modalDateTime}>
                  {selectedDate.fullDayName}, {selectedDate.date} {selectedTime}
                </Text>
              )}
            </View>

            <Text style={styles.modalTitle}>Patient Details</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>First Name <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    style={[styles.input, errors.firstName && styles.inputError]}
                    placeholder="First Name"
                    value={formData.firstName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, firstName: text });
                      if (errors.firstName) setErrors(prev => ({ ...prev, firstName: null }));
                    }}
                  />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Last Name <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    style={[styles.input, errors.lastName && styles.inputError]}
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, lastName: text });
                      if (errors.lastName) setErrors(prev => ({ ...prev, lastName: null }));
                    }}
                  />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
              </View>

              <Text style={styles.label}>Date of Birth <Text style={{color: 'red'}}>*</Text></Text>
              <TouchableOpacity 
                style={[styles.datePickerBtn, errors.dob && styles.inputError]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>{toDateKey(formData.dob)}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              {errors.dob && <Text style={[styles.errorText, { marginTop: -10, marginBottom: 10 }]}>{errors.dob}</Text>}
              {showDatePicker && (
                <DateTimePicker
                  value={formData.dob}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, formData.gender === 'Male' && styles.genderBtnActive]}
                  onPress={() => setFormData({ ...formData, gender: 'Male' })}
                >
                  <Text style={[styles.genderBtnText, formData.gender === 'Male' && styles.genderBtnTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, formData.gender === 'Female' && styles.genderBtnActive]}
                  onPress={() => setFormData({ ...formData, gender: 'Female' })}
                >
                  <Text style={[styles.genderBtnText, formData.gender === 'Female' && styles.genderBtnTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Contact Number <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="e.g. 0712345678"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
                }}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

              <Text style={styles.label}>Home Address <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                placeholder="Home Address"
                value={formData.address}
                onChangeText={(text) => {
                  setFormData({ ...formData, address: text });
                  if (errors.address) setErrors(prev => ({ ...prev, address: null }));
                }}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

              <Text style={styles.label}>Reason for Visit <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.reason && styles.inputError]}
                placeholder="Type your reason here..."
                multiline
                numberOfLines={4}
                value={formData.reason}
                onChangeText={(text) => {
                  setFormData({ ...formData, reason: text });
                  if (errors.reason) setErrors(prev => ({ ...prev, reason: null }));
                }}
              />
              {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}

              <Button
                title={editingAppointment ? 'Confirm update' : 'Confirm booking'}
                icon="checkmark-circle"
                onPress={submitBookingForm}
                loading={booking}
                style={{ marginTop: 8 }}
              />
            </ScrollView>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setFormVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  body: { paddingHorizontal: 20 },

  // hero
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.45)' },
  profileInfo: { flex: 1, marginLeft: 16 },
  doctorName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  specialization: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 3, fontWeight: '600' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -44, borderRadius: radius.lg, paddingVertical: 14, ...shadow.card },
  statItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statIconContainer: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statText: { fontSize: 16, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 1 },

  // sections
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  aboutContent: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 14, ...shadow.soft },
  aboutItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aboutIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  aboutLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', letterSpacing: 0.3 },
  aboutText: { fontSize: 14, color: colors.ink, fontWeight: '600', marginTop: 1 },

  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginBottom: 12 },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  availableText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  availabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availabilityItem: { width: '31.5%', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  dayName: { fontSize: 13, fontWeight: '800', color: colors.primary },
  dayTime: { fontSize: 11, color: colors.body, textAlign: 'center', marginTop: 3, lineHeight: 15 },

  adviceBox: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 14, gap: 10, marginTop: 24 },
  adviceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  adviceText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },

  calendarContainer: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, overflow: 'hidden', ...shadow.soft },
  calendar: { borderRadius: radius.lg },
  calendarLegend: { flexDirection: 'row', gap: 18, marginTop: 10, marginBottom: 20, marginLeft: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.body },

  timeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeCard: { width: '31%', height: 46, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  timeCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.button },
  timeText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  textSelected: { color: '#fff' },
  noTimeText: { fontSize: 13, color: colors.body, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, width: '100%', textAlign: 'center' },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 14,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow.card,
  },
  bottomLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  bottomValue: { fontSize: 16, color: colors.ink, fontWeight: '800', marginTop: 2 },

  // booking modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 22, maxHeight: '92%' },
  modalHeaderInfo: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 14, marginBottom: 16, marginRight: 44 },
  modalDoctorName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  modalDoctorSpec: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
  modalDateTime: { fontSize: 13, color: colors.ink, fontWeight: '700', marginTop: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  closeModalBtn: { position: 'absolute', top: 20, right: 18, width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: colors.body, marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, height: 50, paddingHorizontal: 14, fontSize: 14, color: colors.ink, marginBottom: 14, outlineWidth: 0 },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFF7F7' },
  errorText: { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, height: 50, paddingHorizontal: 14, marginBottom: 14 },
  datePickerText: { fontSize: 14, color: colors.ink },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  genderBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderBtnText: { fontSize: 14, fontWeight: '700', color: colors.body },
  genderBtnTextActive: { color: '#fff' },
});
