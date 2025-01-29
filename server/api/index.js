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
  }
});

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB limit
});


app.post('/api/applications', upload.single('resume'), async (req, res) => {
  const { jobId, name, email, phone, portfolio } = req.body;

  // Check if file exists
  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  // Allowed image MIME types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  // Validate file type
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPEG, JPG, and PNG are allowed.' });
  }

  try {
    // Stream the file buffer to Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'job_applications',
        resource_type: 'image', // Set resource type to image
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

// Blog schema and model
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  coverImageUrl: { type: String, required: false }, // Optional cover image URL
  createdAt: { type: Date, default: Date.now },
});

const Blog = mongoose.model('Blog', blogSchema);

// Multer configuration for handling image uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
// });

// Create a new blog with cover image
app.post('/api/blogs', upload.single('coverImage'), async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title, content are required' });
  }

  try {
    let coverImageUrl = '';

    // If a cover image is provided, upload it to Cloudinary
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'blogs', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      coverImageUrl = result.secure_url;
    }

    // Create and save the blog
    const newBlog = new Blog({ title, content, coverImageUrl });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update a blog with optional new cover image
app.put('/api/blogs/:id', upload.single('coverImage'), async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    let coverImageUrl = null;

    // If a new cover image is provided, upload it to Cloudinary
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'blogs', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      coverImageUrl = result.secure_url;
    }

    // Update the blog with or without a new cover image
    const updatedData = { title, content};
    if (coverImageUrl) updatedData.coverImageUrl = coverImageUrl;

    const updatedBlog = await Blog.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
    if (!updatedBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json(updatedBlog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Fetch all blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }); // Sort by latest first
    res.json(blogs);
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Fetch a single blog by ID
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    res.json(blog);
  } catch (err) {
    console.error("Error fetching blog:", err);
    res.status(500).json({ error: "Failed to fetch blog" });
  }
});

app.put("/api/blogs/:id", upload.single("coverImage"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, ...(coverImageUrl && { coverImageUrl }) },
      { new: true }
    );

    if (!updatedBlog) return res.status(404).json({ error: "Blog not found" });

    res.json(updatedBlog);
  } catch (err) {
    res.status(500).json({ error: "Failed to update blog" });
  }
});

app.delete("/api/blogs/:id", async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return res.status(404).json({ error: "Blog not found" });

    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete blog" });
  }
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
