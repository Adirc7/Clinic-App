const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const GlobalSetting = require('../models/GlobalSetting');
const Holiday = require('../models/Holiday');

// Formats a Date as YYYY-MM-DD in the server's timezone (set TZ=Asia/Colombo when hosting)
const toDateKey = (d) => {
  const date = new Date(d);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
};

const dayRange = (d) => {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

// Attach patient profiles with ONE query instead of one per appointment
const attachPatientProfiles = async (appointments) => {
  const userIds = appointments.map((a) => a.patientId?._id).filter(Boolean);
  const profiles = await Patient.find({ userId: { $in: userIds } }).lean();
  const byUser = Object.fromEntries(profiles.map((p) => [p.userId.toString(), p]));
  return appointments.map((a) => ({
    ...a,
    patientProfile: a.patientId?._id ? byUser[a.patientId._id.toString()] || null : null,
  }));
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Shared booking rules for creating, editing and rescheduling.
 * Returns null when the slot is fine, or { status, message } explaining why not.
 *  - enforceWindow: apply the admin "minimum days in advance" setting (patients)
 *  - checkSchedule: the doctor must work on that weekday
 */
const validateSlot = async ({ doctorId, date, time, excludeId, enforceWindow = true, checkSchedule = true }) => {
  const when = new Date(date);
  if (Number.isNaN(when.getTime())) return { status: 400, message: 'Invalid appointment date.' };

  const { start, end } = dayRange(when);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Never in the past (for anyone)
  if (start < today) return { status: 400, message: 'You cannot choose a date in the past.' };

  if (enforceWindow) {
    const settings = (await GlobalSetting.findOne().lean()) || { allowAnytimeBooking: false, minBookingDays: 3 };
    const earliest = new Date(today);
    if (!settings.allowAnytimeBooking) earliest.setDate(earliest.getDate() + (settings.minBookingDays || 0));
    if (start < earliest) {
      return { status: 400, message: `Appointments must be booked at least ${settings.minBookingDays} days in advance.` };
    }
  }

  const holiday = await Holiday.findOne({ date: toDateKey(when), isActive: true }).lean();
  if (holiday) return { status: 400, message: `The clinic is closed on that day (${holiday.name}).` };

  if (checkSchedule) {
    const doctor = await Doctor.findById(doctorId).select('schedule').lean();
    const days = doctor?.schedule?.days || [];
    if (days.length && !days.some((d) => d.day === DAY_NAMES[when.getDay()])) {
      return { status: 400, message: `The doctor does not work on ${DAY_NAMES[when.getDay()]}s.` };
    }
  }

  const clash = await Appointment.findOne({
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    doctorId,
    time,
    date: { $gte: start, $lt: end },
    status: { $ne: 'Cancelled' },
  }).lean();
  if (clash) return { status: 409, message: 'That time slot is already booked. Please choose another time.' };

  return null;
};

const getDoctorProfileId = async (user) => {
  const doc = await Doctor.findOne({ userId: user._id }).select('_id').lean();
  return doc ? doc._id.toString() : null;
};

// Can this user see / act on this appointment?
const canAccessAppointment = async (user, appointment) => {
  if (user.role === 'admin') return true;
  const patientId = (appointment.patientId?._id || appointment.patientId)?.toString();
  const doctorId = (appointment.doctorId?._id || appointment.doctorId)?.toString();
  if (user.role === 'patient') return patientId === user._id.toString();
  if (user.role === 'doctor') return doctorId === (await getDoctorProfileId(user));
  return false;
};

// @desc    Get appointments (filtered by doctorId or patientId query param)
// @route   GET /api/appointments
// @access  Protected
exports.getAppointments = async (req, res) => {
  try {
    const { doctorId, patientId, status } = req.query;
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    // Non-admins can only ever see their own appointments
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const myDoctorId = await getDoctorProfileId(req.user);
      if (!myDoctorId) return res.json([]);
      filter.doctorId = myDoctorId;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name email specialization profilePhoto consultationFee')
      .populate('patientId', 'name email')
      .populate('billingId', 'status amount isAutoGenerated')
      .sort({ date: -1 })
      .lean();

    res.json(await attachPatientProfiles(appointments));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointments for the logged-in doctor (by their Doctor profile)
// @route   GET /api/appointments/my-appointments
// @access  Doctor
exports.getMyAppointmentsAsDoctor = async (req, res) => {
  try {
    // Find Doctor profile linked to this user account
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found for this account' });
    }

    const appointments = await Appointment.find({ doctorId: doctorProfile._id })
      .populate('patientId', 'name email')
      .sort({ date: -1 })
      .lean();

    res.json(await attachPatientProfiles(appointments));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointments for the logged-in patient
// @route   GET /api/appointments/my-appointments
// @access  Patient
exports.getMyAppointmentsAsPatient = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'name email specialization profilePhoto phone consultationFee')
      .sort({ date: -1 })
      .lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Protected
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!(await canAccessAppointment(req.user, appointment))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Attach patient profile data
    if (appointment.patientId) {
      const profile = await Patient.findOne({ userId: appointment.patientId._id }).lean();
      appointment.patientProfile = profile;
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create appointment (patient books)
// @route   POST /api/appointments
// @access  Patient
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, patientName, patientAge, patientAddress, patientPhone, date, time, description } = req.body;

    if (!doctorId || !patientName || !date || !time) {
      return res.status(400).json({ message: 'Required fields are missing: doctorId, patientName, date, time' });
    }

    // Check if the Patient profile exists (Phase 1.5 fix)
    const patientProfile = await Patient.findOne({ userId: req.user._id, isActive: true });
    if (!patientProfile) {
      return res.status(400).json({ message: 'Please complete your medical profile first before booking an appointment.' });
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found or is not available' });
    }

    const bookingDate = new Date(date);
    const slotError = await validateSlot({ doctorId, date: bookingDate, time });
    if (slotError) return res.status(slotError.status).json({ message: slotError.message });

    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      patientName,
      patientAge,
      patientAddress,
      patientPhone,
      date: bookingDate,
      time,
      description,
      status: 'Pending',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Doctor or Admin
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Admin can update any; doctor can only update their own appointments
    if (req.user.role !== 'admin') {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (
        !doctorProfile ||
        appointment.doctorId.toString() !== doctorProfile._id.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    appointment.status = status;
    await appointment.save();

    // Billing Automation: Auto-generate invoice when marked Completed
    if (status === 'Completed') {
      const existingBilling = await Billing.findOne({ appointmentId: appointment._id });
      if (!existingBilling) {
        // Use this doctor's own consultation fee (admin can still replace it with an itemised bill)
        const doctorForFee = await Doctor.findById(appointment.doctorId).select('consultationFee').lean();
        const fee = Number.isFinite(doctorForFee?.consultationFee) ? doctorForFee.consultationFee : 1500;
        const newBill = await Billing.create({
          appointmentId: appointment._id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          amount: fee,
          consultationFee: fee,
          status: 'Pending',
          isAutoGenerated: true,
        });
        // Flag the appointment so patient notification is triggered
        await Appointment.findByIdAndUpdate(appointment._id, {
          hasBill: true,
          billingId: newBill._id,
        });
      }
    }

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email specialization')
      .populate('patientId', 'name email')
      .lean();

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update appointment details
// @route   PUT /api/appointments/:id
// @access  Doctor or Admin
exports.updateAppointment = async (req, res) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Admin can update any; doctor can only update their own; patient can cancel their own
    if (req.user.role !== 'admin') {
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findOne({ userId: req.user._id });
        if (
          !doctorProfile ||
          appointment.doctorId.toString() !== doctorProfile._id.toString()
        ) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (req.user.role === 'patient') {
        if (appointment.patientId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    const { date, time, description, notes, status, patientName, patientAge, patientAddress, patientPhone } = req.body;

    if (req.user.role === 'patient') {
      // Patients may edit their own Pending/Confirmed bookings and may only cancel (not confirm/complete)
      if (['Completed', 'Cancelled'].includes(appointment.status)) {
        return res.status(400).json({ message: `This appointment is already ${appointment.status.toLowerCase()} and cannot be changed.` });
      }
      if (status && status !== 'Cancelled') {
        return res.status(403).json({ message: 'Patients can only cancel appointments.' });
      }
      if (patientName) appointment.patientName = patientName;
      if (patientAge !== undefined) appointment.patientAge = patientAge;
      if (patientAddress !== undefined) appointment.patientAddress = patientAddress;
      if (patientPhone !== undefined) appointment.patientPhone = patientPhone;
    } else if (notes !== undefined) {
      appointment.notes = notes;
    }

    const newDate = date ? new Date(date) : appointment.date;
    const newTime = time || appointment.time;
    const dateChanged = date && toDateKey(newDate) !== toDateKey(appointment.date);
    const timeChanged = time && newTime !== appointment.time;
    if (dateChanged || timeChanged) {
      // Patients follow the same rules as a new booking; staff may move within the doctor's
      // schedule without the "days in advance" rule. Nobody can move into the past or a taken slot.
      const slotError = await validateSlot({
        doctorId: appointment.doctorId,
        date: newDate,
        time: newTime,
        excludeId: appointment._id,
        enforceWindow: req.user.role === 'patient',
        checkSchedule: req.user.role === 'patient',
      });
      if (slotError) return res.status(slotError.status).json({ message: slotError.message });

      // A patient moving a confirmed booking needs the doctor to confirm the new time again
      if (req.user.role === 'patient' && appointment.status === 'Confirmed') {
        appointment.status = 'Pending';
      }
    }

    if (date) appointment.date = newDate;
    if (time) appointment.time = time;
    if (description !== undefined) appointment.description = description;
    if (status) appointment.status = status;

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Patient (own) or Admin
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Admin, patient who made the appointment, or the assigned doctor can delete
    let hasAccess = false;
    
    if (req.user.role === 'admin') {
      hasAccess = true;
    } else if (req.user.role === 'patient' && appointment.patientId.toString() === req.user._id.toString()) {
      hasAccess = true;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (doctorProfile && appointment.doctorId.toString() === doctorProfile._id.toString()) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Patients and doctors can't erase records — "delete" becomes a cancellation.
    if (req.user.role !== 'admin') {
      if (['Completed', 'Cancelled'].includes(appointment.status)) {
        return res.status(400).json({ message: `This appointment is already ${appointment.status.toLowerCase()}.` });
      }
      if (req.user.role === 'patient') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(appointment.date) < today) {
          return res.status(400).json({ message: 'Past appointments cannot be cancelled.' });
        }
      }
      appointment.status = 'Cancelled';
      await appointment.save();
      await Billing.updateMany(
        { appointmentId: appointment._id, status: 'Pending' },
        { $set: { isActive: false, status: 'Cancelled' } }
      );
      return res.json({ message: 'Appointment cancelled', appointment });
    }

    await Appointment.findByIdAndDelete(req.params.id);
    // Don't leave orphaned unpaid bills behind
    await Billing.updateMany(
      { appointmentId: appointment._id, status: { $ne: 'Paid' } },
      { $set: { isActive: false, status: 'Cancelled' } }
    );

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Doctor requests to reschedule a confirmed appointment
// @route   POST /api/appointments/:id/request-reschedule
// @access  Doctor
exports.requestReschedule = async (req, res) => {
  try {
    const { rescheduleDate, rescheduleTime, reason } = req.body;
    
    if (!rescheduleDate || !rescheduleTime || !reason) {
      return res.status(400).json({ message: 'Please provide new date, time, and reason.' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify it's the doctor's appointment
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed appointments can be rescheduled.' });
    }

    // Check if the appointment is today (doctor cannot reschedule on the day of the appointment)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      return res.status(400).json({ message: 'Cannot request a reschedule on the same day as the appointment.' });
    }

    const slotError = await validateSlot({
      doctorId: appointment.doctorId,
      date: rescheduleDate,
      time: rescheduleTime,
      excludeId: appointment._id,
      enforceWindow: false,
      checkSchedule: false,
    });
    if (slotError) return res.status(slotError.status).json({ message: slotError.message });

    appointment.rescheduleRequested = true;
    appointment.rescheduleRequestedDate = new Date(rescheduleDate);
    appointment.rescheduleRequestedTime = rescheduleTime;
    appointment.rescheduleReason = reason;

    await appointment.save();

    res.json({ message: 'Reschedule request submitted to Admin', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin gets all reschedule requests
// @route   GET /api/appointments/reschedule-requests
// @access  Admin
exports.getRescheduleRequests = async (req, res) => {
  try {
    const requests = await Appointment.find({ rescheduleRequested: true })
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .sort({ date: 1 })
      .lean();

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin approves a reschedule request
// @route   POST /api/appointments/:id/approve-reschedule
// @access  Admin
exports.approveReschedule = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment || !appointment.rescheduleRequested) {
      return res.status(404).json({ message: 'Pending reschedule request not found for this appointment' });
    }

    // Re-check now: another patient may have booked that slot after the doctor asked
    const slotError = await validateSlot({
      doctorId: appointment.doctorId,
      date: appointment.rescheduleRequestedDate,
      time: appointment.rescheduleRequestedTime,
      excludeId: appointment._id,
      enforceWindow: false,
      checkSchedule: false,
    });
    if (slotError) {
      return res.status(slotError.status).json({
        message: `Can't approve: ${slotError.message} Reject this request or ask the doctor for another time.`,
      });
    }

    // Update the actual date and time to the requested ones
    appointment.date = appointment.rescheduleRequestedDate;
    appointment.time = appointment.rescheduleRequestedTime;
    
    // Set status flag for patient UI
    appointment.isRescheduled = true;
    appointment.rescheduleNote = `Rescheduled by Doctor: ${appointment.rescheduleReason}`;

    // Reset request flags
    appointment.rescheduleRequested = false;
    appointment.rescheduleRequestedDate = undefined;
    appointment.rescheduleRequestedTime = undefined;
    appointment.rescheduleReason = undefined;

    await appointment.save();

    res.json({ message: 'Reschedule approved successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin rejects a reschedule request
// @route   POST /api/appointments/:id/reject-reschedule
// @access  Admin
exports.rejectReschedule = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment || !appointment.rescheduleRequested) {
      return res.status(404).json({ message: 'Pending reschedule request not found for this appointment' });
    }

    // Just reset the request flags, keep original date/time
    appointment.rescheduleRequested = false;
    appointment.rescheduleRequestedDate = undefined;
    appointment.rescheduleRequestedTime = undefined;
    appointment.rescheduleReason = undefined;

    await appointment.save();

    res.json({ message: 'Reschedule rejected successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
