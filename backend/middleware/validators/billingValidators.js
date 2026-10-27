const { body } = require('express-validator');

exports.createBillingRules = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('consultationFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Consultation fee must be 0 or more'),

  body('medicineFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Medicine fee must be 0 or more'),

  body('otherCharges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Other charges must be 0 or more'),

  body('serviceCharge')
    .optional()
    .isFloat({ min: 0 }).withMessage('Service charge must be 0 or more'),

  body('treatmentCharge')
    .optional()
    .isFloat({ min: 0 }).withMessage('Treatment charge must be 0 or more'),
];

exports.updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['Pending', 'Paid', 'Overdue', 'Cancelled']).withMessage('Status must be Pending, Paid, Overdue, or Cancelled'),

  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'Card', 'Online']).withMessage('Payment method must be Cash, Card, or Online'),
];
