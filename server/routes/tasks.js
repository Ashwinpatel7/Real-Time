const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Action = require('../models/Action');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ position: 1, createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, assignedTo } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Check for forbidden titles
    const forbiddenTitles = ['Todo', 'In Progress', 'Done'];
    if (forbiddenTitles.includes(title.trim())) {
      return res.status(400).json({ message: 'Task title cannot match column names' });
    }

    // Check for unique title
    const existingTask = await Task.findOne({ title: title.trim() });
    if (existingTask) {
      return res.status(400).json({ message: 'Task title must be unique' });
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'Medium',
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });

    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    // Log action
    await new Action({
      type: 'create',
      taskId: task._id,
      userId: req.user._id,
      details: { title: task.title, status: task.status }
    }).save();

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Task title must be unique' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, version } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Version conflict check
    if (version && task.version !== version) {
      return res.status(409).json({ 
        message: 'Conflict detected',
        currentTask: task,
        conflict: true
      });
    }

    const oldValues = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo
    };

    // Update fields
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }
      
      const forbiddenTitles = ['Todo', 'In Progress', 'Done'];
      if (forbiddenTitles.includes(title.trim())) {
        return res.status(400).json({ message: 'Task title cannot match column names' });
      }

      if (title.trim() !== task.title) {
        const existingTask = await Task.findOne({ title: title.trim(), _id: { $ne: task._id } });
        if (existingTask) {
          return res.status(400).json({ message: 'Task title must be unique' });
        }
        task.title = title.trim();
      }
    }

    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;

    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    // Log action
    const changes = {};
    Object.keys(oldValues).forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(task[key])) {
        changes[key] = { from: oldValues[key], to: task[key] };
      }
    });

    if (Object.keys(changes).length > 0) {
      await new Action({
        type: 'update',
        taskId: task._id,
        userId: req.user._id,
        details: { changes }
      }).save();
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Task title must be unique' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Log action
    await new Action({
      type: 'delete',
      taskId: task._id,
      userId: req.user._id,
      details: { title: task.title, status: task.status }
    }).save();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Smart assign task
router.post('/:id/smart-assign', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get all users and their active task counts
    const users = await User.find({}, 'username email');
    const userTaskCounts = await Task.aggregate([
      { $match: { status: { $in: ['Todo', 'In Progress'] }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    // Create a map of user task counts
    const taskCountMap = new Map();
    userTaskCounts.forEach(item => {
      taskCountMap.set(item._id.toString(), item.count);
    });

    // Find user with fewest active tasks
    let selectedUser = null;
    let minTasks = Infinity;

    users.forEach(user => {
      const taskCount = taskCountMap.get(user._id.toString()) || 0;
      if (taskCount < minTasks) {
        minTasks = taskCount;
        selectedUser = user;
      }
    });

    if (!selectedUser) {
      return res.status(400).json({ message: 'No users available for assignment' });
    }

    const oldAssignedTo = task.assignedTo;
    task.assignedTo = selectedUser._id;
    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    // Log action
    await new Action({
      type: 'smart_assign',
      taskId: task._id,
      userId: req.user._id,
      details: { 
        assignedTo: selectedUser.username,
        previousAssignee: oldAssignedTo ? oldAssignedTo.toString() : null,
        taskCount: minTasks
      }
    }).save();

    res.json(task);
  } catch (error) {
    console.error('Error in smart assign:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;