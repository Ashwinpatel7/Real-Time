# Logic Document

## Smart Assign Implementation

The Smart Assign feature is designed to automatically distribute tasks among team members in a fair and balanced way. Here's how it works:

### Algorithm Overview

1. **Task Load Analysis**: When a user clicks the "Smart Assign" button on a task, the system performs a real-time analysis of the current workload distribution across all users. It specifically counts the number of active tasks (those in "Todo" and "In Progress" status) assigned to each user.

2. **Finding the Optimal Assignee**: The system identifies the user with the fewest active tasks. This is done through an aggregation pipeline in MongoDB that:
   - Groups tasks by their assigned user
   - Counts the number of tasks per user
   - Filters only for active tasks (Todo and In Progress)

3. **Assignment Process**: The task is then automatically assigned to the user with the lowest task count. If multiple users have the same lowest count, the first one found is selected.

### Implementation Details

```javascript
// MongoDB aggregation to get user task counts
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
```

### Benefits

1. **Workload Balancing**: Ensures no single team member becomes overwhelmed with tasks while others have capacity.
2. **Efficiency**: Automatically makes assignment decisions based on real-time data.
3. **Fairness**: Provides an objective method for task distribution.
4. **Transparency**: The assignment logic is clear and consistent.

### Example Scenario

1. User A has 5 active tasks
2. User B has 2 active tasks
3. User C has 7 active tasks
4. When Smart Assign is clicked, the task is assigned to User B

## Conflict Handling Implementation

The conflict handling system manages situations where multiple users attempt to edit the same task simultaneously. Here's how it works:

### Detection Mechanism

1. **Real-time Edit Tracking**: When a user opens a task for editing, the system:
   - Registers this user as "editing" the task in a server-side map
   - Broadcasts this information to all connected users
   - Other users see a visual indicator that the task is being edited

2. **Version Control**: Each task has a version number that increments with every update. When a user saves changes to a task, they submit the version they started with.

3. **Conflict Detection**: The server compares the submitted version with the current version in the database:
   - If versions match, the update proceeds normally
   - If versions don't match, a conflict is detected

### Resolution Interface

When a conflict is detected:

1. The server returns a 409 Conflict status with both versions of the task
2. The client displays a side-by-side comparison of both versions
3. The user is presented with three options:

   a. **Merge Changes**: Keep their content changes (title, description) but accept the other user's status, priority, and assignment changes. This is useful when both users made different types of changes.
   
   b. **Overwrite**: Force their version to be saved, discarding all changes made by the other user. This should be used carefully.
   
   c. **Cancel**: Discard their changes and keep the current version in the database.

### Implementation Details

```javascript
// Server-side conflict detection
if (version && task.version !== version) {
  return res.status(409).json({ 
    message: 'Conflict detected',
    currentTask: task,
    conflict: true
  });
}

// Client-side conflict resolution
const handleMerge = () => {
  // Keep current title and description but use other fields from server version
  if (currentTask) {
    setStatus(currentTask.status);
    setPriority(currentTask.priority);
    setAssignedTo(currentTask.assignedTo?._id || '');
    setVersion(currentTask.version);
    setShowConflict(false);
  }
};

const handleOverwrite = () => {
  // Keep all local changes and force update
  if (currentTask) {
    setVersion(currentTask.version);
    setShowConflict(false);
  }
};
```

### Example Scenario

1. User A and User B both open the same task for editing
2. User A changes the title and description
3. User B changes the status from "Todo" to "In Progress" and saves
4. When User A tries to save, they see the conflict resolution screen
5. User A chooses "Merge" to keep their title/description changes but accept the new "In Progress" status

This system ensures that collaborative editing doesn't result in lost work while still allowing users to resolve conflicts in a way that makes sense for their specific situation.