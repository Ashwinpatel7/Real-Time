# Collaborative To-Do Board

A real-time collaborative Kanban-style to-do board application where multiple users can log in, manage tasks, and see changes happen in real time.

![Collaborative To-Do Board](https://i.imgur.com/placeholder.png)

## Project Overview

This application allows teams to collaborate on tasks in real-time with features like:

- Real-time task updates using WebSockets
- Drag-and-drop task management across Todo, In Progress, and Done columns
- Smart task assignment to balance workload
- Conflict detection and resolution for simultaneous edits
- Activity logging to track all changes

## Tech Stack

### Frontend
- React (v19)
- Socket.IO Client for real-time communication
- React Beautiful DnD for drag-and-drop functionality
- Custom CSS for styling (no UI frameworks)
- Axios for API requests

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for WebSockets
- JWT for authentication
- bcryptjs for password hashing

## Features

### User Authentication
- Secure sign-up/login with hashed passwords and JWT-based authentication
- Custom-built forms with client-side validation

### Task Management
- Create, edit, and delete tasks
- Assign tasks to users
- Set task priority (Low, Medium, High)
- Drag and drop tasks between status columns
- Interactive card flip animation to view task details

### Real-Time Collaboration
- All changes are synchronized in real-time across all connected users
- See who's currently online
- Get notified when someone else is editing the same task

### Smart Assign
The Smart Assign feature automatically assigns tasks to the team member with the fewest active tasks, helping to balance workload across the team.

### Conflict Resolution
When two users edit the same task simultaneously, the application detects the conflict and provides options to:
- Merge changes (keep your content but accept their status/priority/assignment)
- Overwrite with your changes
- Cancel and discard your changes

### Activity Logging
All actions are logged with details about who did what and when, providing a complete audit trail of task history.

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB URI and JWT secret.

5. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install --legacy-peer-deps
   ```

3. Create a `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. Start the React app:
   ```
   npm start
   ```

## Deployment

### Backend Deployment
The backend can be deployed to services like:
- Render
- Railway
- Cyclic
- Heroku

Make sure to set the environment variables in your deployment platform.

### Frontend Deployment
The frontend can be deployed to:
- Vercel
- Netlify
- GitHub Pages

Remember to update the API and Socket URLs in the environment variables.

## Smart Assign Logic

The Smart Assign feature works by:
1. Counting the number of active tasks (Todo and In Progress) assigned to each user
2. Finding the user with the fewest active tasks
3. Automatically assigning the task to that user
4. Logging the action in the activity log

This helps ensure an even distribution of work across the team.

## Conflict Handling

When multiple users edit the same task:
1. The system detects when a user starts editing a task and notifies others
2. If another user submits changes while you're editing, the system compares versions
3. You're presented with both versions and options to merge or overwrite
4. The merge option keeps your content changes but accepts their status/assignment changes
5. The overwrite option forces your changes to be applied

## Demo

[Link to live demo](https://your-deployed-app-url.com)

[Link to demo video](https://your-video-url.com)

## License

This project is licensed under the MIT License.