const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const Image = require('../models/images'); // Import the Image model

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up multer for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route for image upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    // Convert file buffer into a readable stream
    const uploadStream = async (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'images' }, // Save in the 'images' folder in Cloudinary
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        const readable = new Readable();
        readable.push(fileBuffer);
        readable.push(null); // Indicate end of stream
        readable.pipe(stream);
      });
    };

    const result = await uploadStream(req.file.buffer); // Upload the image to Cloudinary

    // Save the image info to the database
    const newImage = new Image({
      imagePath: result.secure_url, // Save the Cloudinary secure URL
    });

    await newImage.save();

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully!',
      imagePath: newImage.imagePath,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Error uploading image' });
  }
});

// GET route to fetch the latest image
router.get('/latest', async (req, res) => {
  try {
    const latestImage = await Image.findOne().sort({ createdAt: -1 }); // Sort by createdAt descending

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
