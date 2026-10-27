import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { doctorName } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { toDateKey, addDays } from '../../utils/date';

export default function DoctorDetailScreen({ route, navigation, currentUser }) {
  const { doctor, editingAppointment } = route.params;
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
          dotColor: '#0DB591',
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
          selectedColor: '#0DB591',
        };
      } else {
        marks[selectedStr] = {
          selected: true,
          selectedColor: '#0DB591',
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Detail</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Avatar name={doctor.name} photo={doctor.profilePhoto} size={70} radius={12} style={styles.profileImage} />
          <View style={styles.profileInfo}>
            <Text style={styles.doctorName}>
              {doctorName(doctor.name)}
            </Text>
            <Text style={styles.specialization}>{doctor.specialization || 'General Practice'}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                   <Ionicons name="star" size={12} color="#0DB591" />
                </View>
                <Text style={styles.statText}>{doctor.averageRating || '5.0'}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                   <Ionicons name="location" size={12} color="#0DB591" />
                </View>
                <Text style={styles.statText}>800m away</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutContent}>
            {doctor.experience && (
              <View style={styles.aboutItem}>
                <Ionicons name="briefcase" size={16} color="#0DB591" />
                <Text style={styles.aboutText}>{doctor.experience}</Text>
              </View>
            )}
            {doctor.qualifications && (
              <View style={styles.aboutItem}>
                <Ionicons name="school" size={16} color="#0DB591" />
                <Text style={styles.aboutText}>{doctor.qualifications}</Text>
              </View>
            )}
            {doctor.phone && (
              <View style={styles.aboutItem}>
                <Ionicons name="call" size={16} color="#0DB591" />
                <Text style={styles.aboutText}>{doctor.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Availability Section */}
        {doctor.schedule?.days && doctor.schedule.days.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Hours</Text>
              <View style={styles.availableBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.availableText}>Available Now</Text>
              </View>
            </View>
            <View style={styles.availabilityGrid}>
              {doctor.schedule.days.map((slot, index) => (
                <View key={index} style={styles.availabilityItem}>
                  <Text style={styles.dayName}>{slot.day}</Text>
                  <Text style={styles.dayTime}>{slot.startTime} - {slot.endTime}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Booking Advices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Advices</Text>
          <View style={styles.adviceBox}>
            <View style={styles.adviceItem}>
              <Ionicons name="information-circle-outline" size={18} color="#0DB591" />
              <Text style={styles.adviceText}>Please arrive 15 minutes before your scheduled time.</Text>
            </View>
            <View style={styles.adviceItem}>
              <Ionicons name="time-outline" size={18} color="#0DB591" />
              <Text style={styles.adviceText}>
                {settings.allowAnytimeBooking 
                  ? "Appointments can be booked anytime before treatment." 
                  : `Appointments can only be rescheduled or deleted ${settings.minBookingDays} days in advance.`}
              </Text>
            </View>
            <View style={styles.adviceItem}>
              <Ionicons name="calendar-outline" size={18} color="#0DB591" />
              <Text style={styles.adviceText}>Select only the highlighted days when the doctor is available.</Text>
            </View>
          </View>
        </View>

        {/* Date Section - Professional Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Appointment Date</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={{
                ...markedDates,
                ...holidays.reduce((acc, h) => ({
                  ...acc,
                  [h.date]: { disabled: true, disableTouchEvent: true, marked: true, dotColor: '#FF3B30', textColor: '#D1D1D1' }
                }), {}),
                [selectedDate ? `${selectedDate.year}-${(selectedDate.month + 1).toString().padStart(2, '0')}-${selectedDate.date.toString().padStart(2, '0')}` : '']: { selected: true, selectedColor: '#0DB591' }
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
                textSectionTitleColor: '#1A4B44',
                selectedDayBackgroundColor: '#0DB591',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#0DB591',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#0DB591',
                selectedDotColor: '#ffffff',
                arrowColor: '#0DB591',
                monthTextColor: '#1A4B44',
                indicatorColor: '#0DB591',
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
              <View style={[styles.legendDot, { backgroundColor: '#0DB591' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#d9e1e8' }]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>

        {/* Time Section */}
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
        
        <View style={{height: 160}} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bookButton, booking && { opacity: 0.6 }]}
          onPress={handleOpenForm}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.bookButtonText}>
              {editingAppointment ? 'Update Appointment' : 'Book Appointment'}
            </Text>
          )}
        </TouchableOpacity>
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
                <Ionicons name="calendar-outline" size={20} color="#0DB591" />
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

              <TouchableOpacity style={styles.bookActionBtn} onPress={submitBookingForm} disabled={booking}>
                {booking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.bookActionBtnText}>Book Appointment</Text>}
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setFormVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#FAFAFA',
  },
  iconButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statIconContainer: {
    backgroundColor: '#E8F5F1',
    padding: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: 'gray',
    lineHeight: 22,
  },
  readMore: {
    color: '#0DB591',
    fontWeight: 'bold',
  },
  datesContainer: {
    marginBottom: 25,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    width: 60,
    height: 75,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dateCardSelected: {
    backgroundColor: '#0DB591',
    borderColor: '#0DB591',
  },
  dateDay: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 5,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  textSelected: {
    color: '#FFF',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    width: '31%',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  timeCardSelected: {
    backgroundColor: '#0DB591',
    borderColor: '#0DB591',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  noTimeText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 85 : 65, // Avoid overlapping with tab navigator
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -3 },
  },
  chatButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#E8F5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#0DB591',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutContent: {
    gap: 12,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  availabilityItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F0F8F5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F3F0',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A4B44',
    marginBottom: 4,
  },
  dayTime: {
    fontSize: 12,
    color: '#0DB591',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  modalHeaderInfo: {
    backgroundColor: '#F0F8F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F3F0',
  },
  modalDoctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A4B44',
  },
  modalDoctorSpec: {
    fontSize: 14,
    color: '#0DB591',
    marginBottom: 5,
  },
  modalDateTime: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  datePickerBtn: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genderBtnActive: {
    backgroundColor: '#E8F5F1',
    borderColor: '#0DB591',
  },
  genderBtnText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  genderBtnTextActive: {
    color: '#0DB591',
    fontWeight: 'bold',
  },
  bookActionBtn: {
    backgroundColor: '#0DB591',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  bookActionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    backgroundColor: '#FFF',
    borderRadius: 20,
  },

  // ── New Enhancements
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  availableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  availableText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  adviceBox: { backgroundColor: '#F0F9FF', padding: 15, borderRadius: 16, gap: 12, borderLeftWidth: 4, borderLeftColor: '#0DB591' },
  adviceItem: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  adviceText: { fontSize: 13, color: '#0369A1', flex: 1, lineHeight: 18 },
  dateCardDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  textDisabled: { color: '#CCC' },
  availableDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#0DB591' },
  calendarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 10,
  },
  calendar: {
    borderRadius: 16,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -5,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
});
