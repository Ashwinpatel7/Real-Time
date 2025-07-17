const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const actionRoutes = require('./routes/actions');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/actions', actionRoutes);

// Socket.IO connection handling
io.use(authenticateSocket);

const activeUsers = new Map();
const taskEditSessions = new Map(); // Track who's editing what

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Store active user
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    lastSeen: new Date()
  });

  // Broadcast active users
  io.emit('activeUsers', Array.from(activeUsers.values()));

  // Handle task editing sessions
  socket.on('startEditingTask', (taskId) => {
    if (!taskEditSessions.has(taskId)) {
      taskEditSessions.set(taskId, new Set());
    }
    taskEditSessions.get(taskId).add(socket.userId);
    
    // Notify others about editing conflict
    if (taskEditSessions.get(taskId).size > 1) {
      io.emit('editingConflict', {
        taskId,
        editors: Array.from(taskEditSessions.get(taskId))
      });
    }
  });

  socket.on('stopEditingTask', (taskId) => {
    if (taskEditSessions.has(taskId)) {
      taskEditSessions.get(taskId).delete(socket.userId);
      if (taskEditSessions.get(taskId).size === 0) {
        taskEditSessions.delete(taskId);
      }
    }
  });

  // Handle real-time task updates
  socket.on('taskUpdated', (data) => {
    socket.broadcast.emit('taskUpdated', data);
  });

  socket.on('taskCreated', (data) => {
    socket.broadcast.emit('taskCreated', data);
  });

  socket.on('taskDeleted', (data) => {
    socket.broadcast.emit('taskDeleted', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
    activeUsers.delete(socket.userId);
    
    // Clean up editing sessions
    for (const [taskId, editors] of taskEditSessions.entries()) {
      editors.delete(socket.userId);
      if (editors.size === 0) {
        taskEditSessions.delete(taskId);
      }
    }
    
    io.emit('activeUsers', Array.from(activeUsers.values()));
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };