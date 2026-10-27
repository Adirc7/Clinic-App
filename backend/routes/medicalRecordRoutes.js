const express = require('express');
const router = express.Router();
const {
  createRecord,
  getMyRecords,
  deleteRecord,
  getRecordsByPatient,
  getAllRecords,
  getRecordById,
  updateRecord
} = require('../controllers/medicalRecordController');
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.post('/', protect, authorize('patient', 'doctor'), uploadMiddleware.documents.single('file'), createRecord);
router.get('/my-records', protect, authorize('patient'), getMyRecords);
router.get('/patient/:patientId', protect, authorize('doctor', 'admin'), getRecordsByPatient);

// Admin view all records
router.get('/', protect, authorize('admin'), getAllRecords);

// View single record
router.get('/:id', protect, authorize('admin', 'doctor', 'patient'), getRecordById);

// Update and Delete
router.put('/:id', protect, authorize('admin', 'doctor', 'patient'), updateRecord);
router.delete('/:id', protect, authorize('admin', 'doctor', 'patient'), deleteRecord);

module.exports = router;
