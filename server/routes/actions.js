const express = require('express');
const Action = require('../models/Action');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get recent actions (last 20)
router.get('/', async (req, res) => {
  try {
    const actions = await Action.find()
      .populate('userId', 'username')
      .populate('taskId', 'title')
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get actions for a specific task
router.get('/task/:taskId', async (req, res) => {
  try {
    const actions = await Action.find({ taskId: req.params.taskId })
      .populate('userId', 'username')
      .sort({ timestamp: -1 });
    
    res.json(actions);
  } catch (error) {
    console.error('Error fetching task actions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get actions by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const actions = await Action.find({ userId: req.params.userId })
      .populate('taskId', 'title')
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.json(actions);
  } catch (error) {
    console.error('Error fetching user actions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;