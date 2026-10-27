const mongoose = require('mongoose');

const globalSettingSchema = new mongoose.Schema(
  {
    allowAnytimeBooking: {
      type: Boolean,
      default: false,
    },
    minBookingDays: {
      type: Number,
      default: 3,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GlobalSetting', globalSettingSchema);
