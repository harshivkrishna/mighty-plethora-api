const mongoose = require('mongoose');

// Define the image schema
const imageSchema = new mongoose.Schema({
  imagePath: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

// Create the Image model based on the schema
const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
