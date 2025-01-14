const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const imageRoutes = require('./routes/imageRoutes'); // Import the image routes

dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Configure Cloudinary
cloudinary.config({
  // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  // api_key: process.env.CLOUDINARY_API_KEY,
  // api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: 'dnqgtfsq7',
  api_key: 665748615873447,
  api_secret: 'orw5HInqLwlNYR-146_I2RlDcnk',
});

// Configure Cloudinary storage for file uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'resumes',
    format: async () => 'pdf', // Enforce PDF format
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
  },
});

const upload = multer({ storage });

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

// Add a new job
app.post('/api/jobs', async (req, res) => {
  const { title, description, location } = req.body;
  try {
    const newJob = new Job({ title, description, location });
    await newJob.save();
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add job' });
  }
});

// Update a job
app.put('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, location } = req.body;
  try {
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { title, description, location },
      { new: true }
    );
    if (!updatedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Submit a job application
app.post('/api/applications', upload.single('resume'), async (req, res) => {
  const { jobId, name, email, phone, portfolio } = req.body;
  const resumeUrl = req.file ? req.file.path : null;

  if (!resumeUrl) {
    return res.status(400).json({ error: 'Resume upload failed' });
  }

  try {
    const application = new Application({ jobId, name, email, phone, portfolio, resumeUrl });
    await application.save();
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
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
