const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('cloudinary').v2; // Import Cloudinary
const imageRoutes = require('../routes/imageRoutes'); // Import the image routes

dotenv.config();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnqgtfsq7',
  api_key: process.env.CLOUDINARY_API_KEY || '665748615873447',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'orw5HInqLwlNYR-146_I2RlDcnk',
});

// Create a folder in Cloudinary
cloudinary.api.create_folder('job_applications', (error, result) => {
  if (error) {
    console.error('Error creating folder in Cloudinary:', error);
  } else {
    console.log('Cloudinary folder created:', result);
  }
});

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://mighty-plethora.vercel.app/',
    'https://mighty-plethora-api-zfw2.vercel.app/',
    'http://localhost:5173'
  ], // Add your hosted domain here
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

mongoose.set('strictQuery', false);

// Job schema and model
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
});

const Job = mongoose.model('Job', jobSchema);

// Application schema and model
const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  portfolio: { type: String },
  resumeUrl: { type: String, required: true }, // Store Cloudinary URL
});

const Application = mongoose.model('Application', applicationSchema);

// Routes
app.use('/api/images', imageRoutes); // Use image routes for image upload

// Fetch available jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Submit a job application
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

app.post('/api/applications', upload.single('resume'), async (req, res) => {
  const { jobId, name, email, phone, portfolio } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF, DOC, and DOCX are allowed.' });
  }

  try {
    // Stream the file buffer to Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'job_applications',
        resource_type: 'auto',
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload failed:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed', details: error });
        }
    
        const resumeUrl = result.secure_url;
    
        // Save to the database
        const application = new Application({
          jobId,
          name,
          email,
          phone,
          portfolio,
          resumeUrl,
        });
    
        await application.save();
        res.status(201).json({ message: 'Application submitted successfully' });
      }
    );
    
    // Stream the file buffer
    streamifier.createReadStream(req.file.buffer).pipe(stream);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
  console.log(req.file.buffer); // Debug: Check file buffer content
if (!req.file.buffer || req.file.buffer.length === 0) {
  return res.status(400).json({ error: 'Uploaded file is empty' });
}
});




// Fetch all applications (Admin)
app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find().populate('jobId');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Delete an application
app.delete('/api/applications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedApplication = await Application.findByIdAndDelete(id);
    if (!deletedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.status(204).send(); // Successfully deleted, no content to send
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
