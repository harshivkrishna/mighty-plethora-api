const mongoose = require('mongoose');

// Define the image schema
const imageSchema = new mongoose.Schema({
  imagePath: {
    type: String,
    required: true, // Store the Cloudinary URL
  },
  uploadDate: {
    type: Date,
    default: Date.now, // Automatically set the upload date
  },
  imageType: {
    type: String,
    required: false, // Optional field to store the file type (e.g., jpg, png)
  },
  publicId: {
    type: String,
    required: false, // Optional field to store Cloudinary public_id for image management
  },
});

// Create the Image model based on the schema
const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
