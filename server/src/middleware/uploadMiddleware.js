
const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  const allowedTypes = ["image/jpeg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error("Only JPG and PNG images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  }
});

module.exports = upload;
