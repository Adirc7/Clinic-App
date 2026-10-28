/**
 * File storage helper.
 *
 * - If CLOUDINARY_* env vars are set, files are uploaded to Cloudinary and the
 *   full https URL is returned. Use this when hosting (Render/Railway disks are
 *   wiped on every deploy/restart, so local uploads would disappear).
 * - Otherwise files are written to backend/uploads and "/uploads/<name>" is
 *   returned (fine for local development).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const isCloudinaryEnabled = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const safeName = (originalname = 'file') => {
  const ext = path.extname(originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
};

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `clinic-app/${folder}`, resource_type: 'auto' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(file.buffer);
  });

/**
 * Saves a multer file (memoryStorage) and returns its public URL/path.
 * @param {Express.Multer.File} file
 * @param {string} folder logical folder, e.g. 'doctors', 'patients', 'records'
 */
const saveFile = async (file, folder = 'misc') => {
  if (!file) return null;

  if (isCloudinaryEnabled()) {
    return uploadToCloudinary(file, folder);
  }

  if (process.env.VERCEL) {
    // Vercel functions can't keep files on disk
    const err = new Error('File uploads need Cloudinary on this server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
    err.statusCode = 503;
    throw err;
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = safeName(file.originalname);
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
};

module.exports = { saveFile, isCloudinaryEnabled, UPLOAD_DIR };
