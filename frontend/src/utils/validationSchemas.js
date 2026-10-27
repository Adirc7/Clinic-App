import * as Yup from 'yup';

// Accepts: 07XXXXXXXX, +947XXXXXXXX, or any 10-digit number
const phoneRegex = /^(\+94|0)?[0-9]{9,11}$/;
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const bloodGroupRegex = /^(A|B|AB|O)[+-]$/i;

// ─── Auth ───────────────────────────────────────────────────────────────────
export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const registerSchema = Yup.object({
  name: Yup.string()
    .min(3, 'Full name must be at least 3 characters')
    .max(60, 'Name is too long')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .matches(/[@$!%*?&]/, 'Must contain at least one special character (@$!%*?&)')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

// ─── Patient Profile ─────────────────────────────────────────────────────────
export const patientProfileSchema = Yup.object({
  dateOfBirth: Yup.string()
    .matches(dateRegex, 'Use format YYYY-MM-DD (e.g. 1990-05-15)')
    .required('Date of birth is required'),
  gender: Yup.string()
    .oneOf(['Male', 'Female', 'Other'], 'Please select a gender')
    .required('Gender is required'),
  bloodGroup: Yup.string()
    .test('blood-group', 'Use format A+, A-, B+, B-, AB+, AB-, O+ or O-', val => {
      if (!val || val.trim() === '') return true; // optional
      return bloodGroupRegex.test(val.trim());
    }),
  address: Yup.string().optional(),
  emergencyContactName: Yup.string().optional(),
  emergencyContactPhone: Yup.string()
    .test('phone', 'Enter a valid phone number', val => {
      if (!val || val.trim() === '') return true; // optional
      return phoneRegex.test(val.trim());
    }),
  emergencyContactRelation: Yup.string().optional(),
});

// ─── Appointment Booking ─────────────────────────────────────────────────────
export const appointmentBookingSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(1, 'Last name is required')
    .required('Last name is required'),
  phone: Yup.string()
    .test('phone', 'Enter a valid phone number (e.g. 0771234567)', val => {
      if (!val || val.trim() === '') return false; // required
      return phoneRegex.test(val.trim());
    })
    .required('Contact number is required'),
  address: Yup.string()
    .min(3, 'Please enter your address')
    .required('Home address is required'),
  reason: Yup.string()
    .min(5, 'Please describe your reason (at least 5 characters)')
    .required('Reason for visit is required'),
});

// ─── Doctor (Admin creates doctor) ───────────────────────────────────────────
export const doctorSchema = Yup.object({
  name: Yup.string()
    .min(3, 'Doctor name must be at least 3 characters')
    .required('Doctor name is required'),
  specialization: Yup.string()
    .min(3, 'Specialization must be at least 3 characters')
    .required('Specialization is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: Yup.string()
    .test('phone', 'Enter a valid phone number', val => {
      if (!val || val.trim() === '') return true; // optional
      return phoneRegex.test(val.trim());
    }),
  experience: Yup.string().optional(),
  qualifications: Yup.string().optional(),
  fee: Yup.number()
    .min(0, 'Fee must be a positive number')
    .optional().nullable(),
});

// ─── Billing ─────────────────────────────────────────────────────────────────
export const billingSchema = Yup.object({
  consultationFee: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Consultation fee cannot be negative')
    .required('Consultation fee is required'),
  medicineFee: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Medicine fee cannot be negative')
    .optional().nullable(),
  otherCharges: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Other charges cannot be negative')
    .optional().nullable(),
});

// ─── Prescription ─────────────────────────────────────────────────────────────
export const prescriptionSchema = Yup.object({
  medications: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().required('Medicine name is required'),
        dosage: Yup.string().required('Dosage is required'),
        frequency: Yup.string().required('Frequency is required'),
        duration: Yup.string().required('Duration is required'),
      })
    )
    .min(1, 'At least one medication is required'),
  instructions: Yup.string().optional(),
});
