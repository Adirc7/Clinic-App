const GlobalSetting = require('../models/GlobalSetting');

// @desc    Get global settings
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    let settings = await GlobalSetting.findOne();
    
    // Create default if doesn't exist
    if (!settings) {
      settings = await GlobalSetting.create({
        allowAnytimeBooking: false,
        minBookingDays: 3
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};

// @desc    Update global settings
// @route   PUT /api/settings
// @access  Admin
exports.updateSettings = async (req, res) => {
  try {
    const { allowAnytimeBooking, minBookingDays } = req.body;
    
    let settings = await GlobalSetting.findOne();
    
    if (!settings) {
      settings = new GlobalSetting();
    }
    
    if (allowAnytimeBooking !== undefined) settings.allowAnytimeBooking = allowAnytimeBooking === true || allowAnytimeBooking === 'true';
    if (minBookingDays !== undefined) {
      const days = parseInt(minBookingDays, 10);
      if (Number.isNaN(days) || days < 0 || days > 30) {
        return res.status(400).json({ message: 'Minimum booking days must be between 0 and 30' });
      }
      settings.minBookingDays = days;
    }
    settings.updatedBy = req.user._id;
    
    await settings.save();
    
    res.json(settings);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', error: error.message });
  }
};
