const express = require('express');
const router = express.Router();
const { getHolidays, addHoliday, deleteHoliday } = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getHolidays);
router.post('/', protect, authorize('admin'), addHoliday);
router.delete('/:id', protect, authorize('admin'), deleteHoliday);

module.exports = router;
