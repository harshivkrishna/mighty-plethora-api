const mongoose = require('mongoose');
const Job = require('../models/job'); // Assuming you have a Job model

const connectDb = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

module.exports = async (req, res) => {
  await connectDb();

  if (req.method === 'GET') {
    try {
      const jobs = await Job.find();
      res.status(200).json(jobs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  } else if (req.method === 'POST') {
    const { title, description, location } = req.body;
    try {
      const newJob = new Job({ title, description, location });
      await newJob.save();
      res.status(201).json(newJob);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add job' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
