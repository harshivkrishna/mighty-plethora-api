const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Import Cloudinary
const streamifier = require('streamifier'); // To handle in-memory buffer as a stream
const Image = require('../models/images'); // Import the Image model

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnqgtfsq7',
  api_key: process.env.CLOUDINARY_API_KEY || '665748615873447',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'orw5HInqLwlNYR-146_I2RlDcnk',
});

// Set up storage for multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route for image upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    // Upload the image to Cloudinary using a stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' }, // Specify resource type
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Convert buffer to stream and pipe it to Cloudinary
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Save the Cloudinary URL to the database
    const newImage = new Image({
      imagePath: result.secure_url,
    });

    await newImage.save();

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully!',
      imagePath: newImage.imagePath,
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ success: false, message: 'Error saving image to Cloudinary' });
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
