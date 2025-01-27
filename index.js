require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

app.use(cors());
app.use(express.static('public'));

// Serve the index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const port = process.env.PORT || 3000;
const URI = process.env.MONGO_URI;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to MongoDB
(async () => {
  try {
    await mongoose.connect(URI, {
      dbName: 'ExerciseTracker',
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
  }
})();

// Models
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true },
}));

const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  username: { type: String, required: true },
  description: String,
  duration: Number,
  date: String,
}));

// Routes

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// POST /api/users/:_id/exercises - Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const exercise = new Exercise({
    username: user.username,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  });

  await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
  });
});

// GET /api/users - List all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});


// GET /api/users/:_id/logs - Get exercise logs for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  // Find the user by ID
  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Build the query for exercises
  const query = { username: user.username };

  // Add date filters if provided
  if (from || to) {
    query.date = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Invalid "from" date format. Use yyyy-mm-dd.' });
      }
      query.date.$gte = fromDate.toDateString();
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Invalid "to" date format. Use yyyy-mm-dd.' });
      }
      query.date.$lte = toDate.toDateString();
    }
  }

  // Fetch exercises with the limit applied
  const exercises = await Exercise.find(query)
    .limit(parseInt(limit) || 100) // Default to 100 if no limit is provided
    .sort({ date: 1 }); // Sort by date in ascending order

  // Return the log with the user info and count
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    from:new Date(from),
    to:new Date(to),
    limit:parseInt(limit),
    log: exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date,
    })),
  });
});


const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});


