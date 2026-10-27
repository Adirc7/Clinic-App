const multer = require('multer');
const path = require('path');

// Files are kept in memory and then saved by utils/fileStorage.js
// (to Cloudinary when configured, otherwise to backend/uploads).
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const extOk = allowed.test(path.extname(file.originalname || '').toLowerCase());
  const mimeOk = allowed.test(file.mimetype || '');
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Images and PDFs only!'), false);
};

// Profile photos (doctors / patients) — images only, 5MB
const uploadMiddleware = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Medical records — images or PDFs, 10MB
uploadMiddleware.documents = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = uploadMiddleware;
