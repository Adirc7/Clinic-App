const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

exports.createPrescription = async (req, res) => {
  try {
    const { appointmentId, diagnosis, medications, instructions } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Ensure it's this doctor's appointment
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existing = await Prescription.findOne({ appointmentId });
    if (existing) {
      return res.status(400).json({ message: 'Prescription already exists for this appointment' });
    }

    const prescription = await Prescription.create({
      appointmentId,
      doctorId: doctorProfile._id,
      patientId: appointment.patientId,
      diagnosis,
      medications,
      instructions,
    });

    // Flag the appointment so the patient receives a notification
    await Appointment.findByIdAndUpdate(appointmentId, {
      hasPrescription: true,
      prescriptionId: prescription._id,
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getPrescriptionByAppointment = async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ appointmentId: req.params.appointmentId, isActive: true })
      .populate('doctorId', 'name specialization')
      .populate('patientId', 'name email');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Patients may only see their own prescriptions
    if (req.user.role === 'patient' && (prescription.patientId?._id || '').toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.user._id, isActive: true })
      .populate('doctorId', 'name specialization')
      .populate('appointmentId', 'date time')
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ isActive: true })
      .populate('doctorId', 'name specialization')
      .populate('patientId', 'name email')
      .populate('appointmentId', 'date time')
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization')
      .populate('appointmentId');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.updatePrescription = async (req, res) => {
  try {
    const { diagnosis, medications, instructions } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (!doctorProfile || prescription.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this prescription' });
      }
    }

    prescription.diagnosis = diagnosis || prescription.diagnosis;
    prescription.medications = medications || prescription.medications;
    if (instructions !== undefined) prescription.instructions = instructions;

    await prescription.save();
    res.json(prescription);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (!doctorProfile || prescription.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this prescription' });
      }
    }

    await Appointment.findByIdAndUpdate(prescription.appointmentId, {
      hasPrescription: false,
      prescriptionId: null
    });

    await prescription.deleteOne();
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};
