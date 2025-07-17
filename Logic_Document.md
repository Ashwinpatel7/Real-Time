# Logic Document

## Smart Assign Implementation

The Smart Assign feature is designed to automatically distribute tasks among team members in a fair and balanced way. Here's how it works:

1. **Task Load Analysis**: When a user clicks the "Smart Assign" button on a task, the system performs a real-time analysis of the current workload distribution across all users. It specifically counts the number of active tasks (those in "Todo" and "In Progress" status) assigned to each user.

2. **Finding the Optimal Assignee**: The system identifies the user with the fewest active tasks. This is done through an aggregation pipeline in MongoDB that:
   - Groups tasks by their assigned user
   - Counts the number of tasks per user
   - Filters only for active tasks (Todo and In Progress)

3. **Assignment Process**: The task is then automatically assigned to the user with the lowest task count. If multiple users have the same lowest count, the first one found is selected.

4. **Notification and Logging**: After assignment, the system:
   - Updates the task in the database with the new assignee
   - Broadcasts the change to all connected users via WebSockets
   - Logs the action in the activity log with details about the previous and new assignee

5. **Edge Cases Handling**:
   - If no users are available, the system returns an appropriate error message
   - If the task is already assigned to the user with the fewest tasks, no change is made

This approach ensures that work is distributed evenly across the team, preventing any single user from becoming overwhelmed while others have capacity to take on more tasks.

## Conflict Handling Implementation

The conflict handling system manages situations where multiple users attempt to edit the same task simultaneously. Here's how it works:

1. **Real-time Edit Tracking**: When a user opens a task for editing, the system:
   - Registers this user as "editing" the task in a server-side map
   - Broadcasts this information to all connected users
   - Other users see a visual indicator that the task is being edited

2. **Version Control**: Each task has a version number that increments with every update. When a user saves changes to a task, they submit the version they started with.

3. **Conflict Detection**: The server compares the submitted version with the current version in the database:
   - If versions match, the update proceeds normally
   - If versions don't match, a conflict is detected

4. **Conflict Resolution Interface**: When a conflict is detected:
   - The server returns a 409 Conflict status with both versions of the task
   - The client displays a side-by-side comparison of both versions
   - The user is presented with three options:

     a. **Merge Changes**: Keep their content changes (title, description) but accept the other user's status, priority, and assignment changes. This is useful when both users made different types of changes.
     
     b. **Overwrite**: Force their version to be saved, discarding all changes made by the other user. This should be used carefully.
     
     c. **Cancel**: Discard their changes and keep the current version in the database.

5. **Example Scenario**:
   - User A and User B both open the same task for editing
   - User A changes the title and description
   - User B changes the status from "Todo" to "In Progress" and saves
   - When User A tries to save, they see the conflict resolution screen
   - User A chooses "Merge" to keep their title/description changes but accept the new "In Progress" status

This system ensures that collaborative editing doesn't result in lost work while still allowing users to resolve conflicts in a way that makes sense for their specific situation.