const express = require('express');
const multer = require('multer');
const path = require('path');
const Image = require('../models/images'); // Import the Image model

const router = express.Router();

// Set up storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads'); // Directory to store the uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename
  },
});

const upload = multer({ storage });

// POST route for image upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const newImage = new Image({
      imagePath: `/uploads/${req.file.filename}`, // Store the relative path
    });

    await newImage.save(); // Save the image to the database

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully!',
      imagePath: newImage.imagePath,
    });
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
