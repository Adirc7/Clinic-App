const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');
const { saveFile } = require('../utils/fileStorage');

const canAccessRecord = (user, record) => {
  if (user.role === 'admin' || user.role === 'doctor') return true;
  const ownerId = record.patientId?._id || record.patientId;
  return ownerId && ownerId.toString() === user._id.toString();
};

exports.createRecord = async (req, res) => {
  try {
    const { title, description, recordDate, relatedDoctor, patientId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const fileType = req.file.mimetype;

    const finalPatientId = req.user.role === 'patient' ? req.user._id : patientId;
    
    if (!finalPatientId) {
      return res.status(400).json({ message: 'Patient ID is required when uploaded by a doctor' });
    }

    if (!mongoose.Types.ObjectId.isValid(finalPatientId)) {
      return res.status(400).json({ message: 'Invalid Patient ID format' });
    }

    const fileUrl = await saveFile(req.file, 'records');

    const newRecord = await MedicalRecord.create({
      patientId: finalPatientId,
      title,
      description,
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      relatedDoctor: req.user.role === 'doctor' ? `Dr. ${req.user.name}` : relatedDoctor,
      fileUrl,
      fileType,
    });

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getMyRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user._id, isActive: true })
      .sort({ recordDate: -1 });
    res.json(records);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getRecordsByPatient = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId, isActive: true })
      .sort({ recordDate: -1 });
    res.json(records);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getAllRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ isActive: true })
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patientId', 'name email');
    
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (!canAccessRecord(req.user, record)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(record);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Role-based check: 
    // Patient can only delete their own
    // Admin can delete anything
    // Doctor can delete if they created it or it's for their patient (let's keep it simple: Admin/Doctor can delete)
    if (req.user.role === 'patient' && record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    record.isActive = false;
    await record.save();

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { title, description, recordDate, relatedDoctor } = req.body;
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (req.user.role === 'patient' && record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    record.title = title || record.title;
    if (description !== undefined) record.description = description;
    if (recordDate) record.recordDate = new Date(recordDate);
    record.relatedDoctor = relatedDoctor || record.relatedDoctor;

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};
