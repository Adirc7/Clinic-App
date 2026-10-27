const express = require('express');
const {
  createPrescription,
  getPrescriptionByAppointment,
  getMyPrescriptions,
  getAllPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createPrescriptionRules } = require('../middleware/validators/prescriptionValidators');

const router = express.Router();

// Doctor creates prescription (with validation)
router.post('/', protect, authorize('doctor'), createPrescriptionRules, validate, createPrescription);

// Patients view their own prescriptions (MUST be before generic GET /)
router.get('/my-prescriptions', protect, authorize('patient'), getMyPrescriptions);

// Shared route to view a specific prescription by appointment (named, before /:id)
router.get('/appointment/:appointmentId', protect, getPrescriptionByAppointment);

// Admins view all prescriptions
router.get('/', protect, authorize('admin'), getAllPrescriptions);

// View single prescription
router.get('/:id', protect, authorize('admin', 'doctor'), getPrescriptionById);

// Update and Delete (Admin or Doctor)
router.put('/:id', protect, authorize('admin', 'doctor'), updatePrescription);
router.delete('/:id', protect, authorize('admin', 'doctor'), deletePrescription);

module.exports = router;
