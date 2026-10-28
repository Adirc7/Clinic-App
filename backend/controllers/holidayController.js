const Holiday = require('../models/Holiday');

// Get all active holidays
exports.getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find({ isActive: true }).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

// Admin: Add a holiday
exports.addHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !name || !name.trim()) {
      return res.status(400).json({ message: 'Holiday date (YYYY-MM-DD) and name are required.' });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(400).json({ message: 'Holiday already exists for this date.' });
    }

    const holiday = await Holiday.create({ date, name, type });
    res.status(201).json(holiday);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

// Admin: Delete a holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    await holiday.deleteOne();
    res.json({ message: 'Holiday removed' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};
