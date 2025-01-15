const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Import Cloudinary
const path = require('path');
const Image = require('../models/images'); // Import the Image model

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up storage for multer (not used for actual file upload as Cloudinary will handle it)
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage });

// POST route for image upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { resource_type: 'auto' }, // Auto-detect file type (e.g., jpg, png)
      async (error, result) => {
        if (error) {
          return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error });
        }

        // Save image URL to the database
        const newImage = new Image({
          imagePath: result.secure_url, // Cloudinary URL
        });

        await newImage.save(); // Save the image to the database

        res.status(200).json({
          success: true,
          message: 'Image uploaded successfully!',
          imagePath: newImage.imagePath,
        });
      }
    );

    // Pass the image data from memory storage to Cloudinary
    req.pipe(result);

  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ success: false, message: 'Error saving image to database' });
  }
});

// GET route to fetch the latest image
router.get('/latest', async (req, res) => {
  try {
    const latestImage = await Image.findOne().sort({ uploadDate: -1 }); // Sort by uploadDate descending to get the latest image

    if (!latestImage) {
      return res.status(404).json({ success: false, message: 'No images found' });
    }

    res.status(200).json({ success: true, imagePath: latestImage.imagePath });
  } catch (error) {
    console.error('Error fetching latest image:', error);
    res.status(500).json({ success: false, message: 'Error fetching image' });
  }
});

module.exports = router;
