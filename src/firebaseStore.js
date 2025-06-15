import { getFirestore, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp, deleteDoc, getDoc, increment } from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);

// Function to add a new task
export const addTask = async (userId, taskData) => {
  try {
    const userTasksCollectionRef = collection(db, 'Tasks', userId, 'UserTasks');
    await addDoc(userTasksCollectionRef, taskData);
    console.log('Task added successfully for user:', userId);
    await calculateAndStoreTotalProgress(userId); // Recalculate total progress after adding
    return { success: true };
  } catch (error) {
    console.error('Error adding task:', error);
    return { success: false, error: error.message };
  }
};

// Function to get all tasks for a specific user
export const getTasks = async (userId) => {
  try {
    const userTasksCollectionRef = collection(db, 'Tasks', userId, 'UserTasks');
    const q = query(userTasksCollectionRef);
    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ ...doc.data(), id: doc.id });
    });
    console.log('Tasks fetched successfully for user:', userId, tasks);
    return { success: true, tasks };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { success: false, error: error.message };
  }
};

// Function to delete a task
export const deleteTask = async (userId, taskId) => {
  try {
    const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
    await deleteDoc(taskDocRef);
    console.log('Task deleted successfully:', taskId);
    await calculateAndStoreTotalProgress(userId); // Recalculate total progress after deleting
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }
};

// Function to check if a task is completed and move it to history if needed
export const checkAndMoveCompletedTask = async (userId, taskId, taskData) => {
  try {
    const today = new Date();
    // FOR TESTING ONLY: Temporarily set today to a future date to test expiration logic.
    // REMEMBER TO REMOVE THIS LINE AFTER TESTING.
    // Example: December 31st, 2025
    // today.setFullYear(2025, 11, 31); // Month is 0-indexed, so 11 is December
    
    const rawEndDate = taskData.endDate; // Keep raw end date for logging
    const endDate = new Date(rawEndDate);
    
    // Ensure currentProgress and totalHours are numbers for comparison
    const currentProgress = parseFloat(taskData.currentProgress || 0);
    const totalHours = parseFloat(taskData.totalHours || 0);

    const isCompleted = currentProgress >= totalHours;
    const isExpired = today > endDate;

    console.log(`[checkAndMoveCompletedTask] Task ID: ${taskId}`);
    console.log(`[checkAndMoveCompletedTask] Raw End Date: ${rawEndDate}`);
    console.log(`[checkAndMoveCompletedTask] Parsed End Date: ${endDate.toISOString()}`);
    console.log(`[checkAndMoveCompletedTask] Today's Date: ${today.toISOString()}`);
    console.log(`[checkAndMoveCompletedTask] Current Progress: ${currentProgress}, Total Hours: ${totalHours}`);
    console.log(`[checkAndMoveCompletedTask] isCompleted: ${isCompleted}, isExpired: ${isExpired}`);
    console.log(`[checkAndMoveCompletedTask] Evaluating condition: (isCompleted || isExpired) = ${isCompleted || isExpired}`);

    if (isCompleted || isExpired) {
      console.log(`[checkAndMoveCompletedTask] CONDITION MET: Entering move/delete block for task: ${taskId}`);
      // Add completion status and date to task data
      const completedTaskData = {
        ...taskData,
        completedAt: new Date().toISOString(),
        completionStatus: isCompleted ? 'completed' : 'expired',
        finalProgress: currentProgress // Use the numeric currentProgress
      };

      // Add to HistoryTasks collection
      const historyTasksCollectionRef = collection(db, 'HistoryTasks', userId, 'UserHistoryTasks');
      console.log(`[checkAndMoveCompletedTask] Adding task ${taskId} to HistoryTasks...`);
      await addDoc(historyTasksCollectionRef, completedTaskData);
      console.log(`[checkAndMoveCompletedTask] Task ${taskId} successfully added to HistoryTasks.`);
      console.log(`[checkAndMoveCompletedTask] Proceeding to delete active task...`);

      // Attempt to delete from active Tasks collection
      const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
      console.log(`[checkAndMoveCompletedTask] Attempting to delete active task: ${taskId} at path: ${taskDocRef.path}`);
      await deleteDoc(taskDocRef);
      console.log(`[checkAndMoveCompletedTask] Task ${taskId} successfully deleted from active Tasks collection.`);

      console.log(`[checkAndMoveCompletedTask] Task ${taskId} moved to history. Status: ${completedTaskData.completionStatus}`);
      return { success: true, status: completedTaskData.completionStatus };
    }

    console.log(`[checkAndMoveCompletedTask] Task ${taskId} is active. No move needed.`);
    return { success: true, status: 'active' };
  } catch (error) {
    console.error(`[checkAndMoveCompletedTask] Error processing task ${taskId}:`, error);
    return { success: false, error: error.message };
  }
};

// Modify updateTask to check completion status
export const updateTask = async (userId, taskId, updatedData) => {
  try {
    const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
    
    // Get current task data
    const taskDoc = await getDoc(taskDocRef);
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const currentTaskData = taskDoc.data();
    const mergedData = { ...currentTaskData, ...updatedData };

    // Check if task should be moved to history
    const { success: checkSuccess, status } = await checkAndMoveCompletedTask(userId, taskId, mergedData);
    
    if (checkSuccess && status !== 'active') {
      // If task was successfully moved to history (completed or expired), no further update to active tasks is needed.
      await calculateAndStoreTotalProgress(userId); // Recalculate total progress since a task was moved/deleted
      return { success: true, status };
    } else if (checkSuccess && status === 'active') {
      // Only update if task is still active
      await setDoc(taskDocRef, updatedData, { merge: true });
      console.log('[updateTask] Task updated successfully:', taskId);
    } else if (!checkSuccess) {
      console.error('[updateTask] Failed to check/move task status, proceeding with update to avoid data loss', taskId);
      // If checkAndMoveCompletedTask failed, still try to update the task to avoid data loss.
      await setDoc(taskDocRef, updatedData, { merge: true });
    }

    await calculateAndStoreTotalProgress(userId);
    return { success: true, status };
  } catch (error) {
    console.error('[updateTask] Error updating task:', error);
    return { success: false, error: error.message };
  }
};

// Function to get total progress for a specific user
export const getTotalProgress = async (userId) => {
  try {
    const userDocRef = doc(db, 'Tasks', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log('Total progress fetched for user:', userId, data.totalProgress);
      return { success: true, totalProgress: data.totalProgress || 0 }; // Default to 0 if not set
    } else {
      console.log('No total progress found for user:', userId);
      return { success: true, totalProgress: 0 };
    }
  } catch (error) {
    console.error('Error getting total progress:', error);
    return { success: false, error: error.message };
  }
};

// Function to update total progress for a specific user
export const updateTotalProgress = async (userId, progress) => {
  try {
    const userDocRef = doc(db, 'Tasks', userId);
    await setDoc(userDocRef, { totalProgress: progress }, { merge: true }); // Merge to only update totalProgress
    console.log('Total progress updated successfully for user:', userId, progress);
    return { success: true };
  } catch (error) {
    console.error('Error updating total progress:', error);
    return { success: false, error: error.message };
  }
};

// Function to increment task counter for a specific user
export const incrementTaskCounter = async (userId) => {
  try {
    const userDocRef = doc(db, 'Tasks', userId);
    const userDocSnap = await getDoc(userDocRef);
    let currentCount = 0;

    if (userDocSnap.exists() && userDocSnap.data().taskCount !== undefined) {
      currentCount = userDocSnap.data().taskCount;
    }

    const newCount = currentCount + 1;
    await setDoc(userDocRef, { taskCount: newCount }, { merge: true });
    console.log('Task counter incremented for user:', userId, 'New count:', newCount);
    return { success: true, newCount };
  } catch (error) {
    console.error('Error incrementing task counter:', error);
    return { success: false, error: error.message };
  }
};

// Function to calculate and update the overall total progress
export const calculateAndStoreTotalProgress = async (userId) => {
  try {
    const { success: tasksSuccess, tasks } = await getTasks(userId); // Use existing getTasks
    let averageProgress = 0;

    if (tasksSuccess && tasks.length > 0) {
      const totalPercentageSum = tasks.reduce((sum, task) => {
        const progress = task.currentProgress || 0;
        const total = task.totalHours || 0;
        const percentage = total > 0 ? (progress / total) * 100 : 0;
        return sum + percentage;
      }, 0);
      averageProgress = (totalPercentageSum / tasks.length).toFixed(0); // Calculate average and round
    }

    // Update the totalProgress in the user's document
    const { success: updateSuccess } = await updateTotalProgress(userId, parseFloat(averageProgress)); // Ensure it's a number
    if (updateSuccess) {
      console.log('Total progress calculated and stored successfully for user:', userId, '- Average:', averageProgress);
      return { success: true, totalProgress: parseFloat(averageProgress) };
    } else {
      console.error('Failed to store total progress for user:', userId);
      return { success: false, error: 'Failed to store total progress' };
    }
  } catch (error) {
    console.error('Error calculating and storing total progress:', error);
    return { success: false, error: error.message };
  }
};

// Modify incrementTaskProgress to check completion status
export const incrementTaskProgress = async (userId, taskId, hoursToIncrement) => {
  try {
    const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
    
    // Get current task data
    const taskDoc = await getDoc(taskDocRef);
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const currentTaskData = taskDoc.data();
    const newProgress = parseFloat((currentTaskData.currentProgress || 0)) + hoursToIncrement; // Ensure currentProgress is float
    
    // Update progress
    await setDoc(taskDocRef, {
      currentProgress: newProgress
    }, { merge: true });

    // Check if task should be moved to history
    const updatedTaskData = { ...currentTaskData, currentProgress: newProgress };
    const { success: checkSuccess, status } = await checkAndMoveCompletedTask(userId, taskId, updatedTaskData);

    console.log(`[incrementTaskProgress] Task ${taskId} progress incremented by ${hoursToIncrement} hours.`);
    
    if (checkSuccess && status !== 'active') {
      // If task was successfully moved to history (completed or expired), no further processing for active task.
      await calculateAndStoreTotalProgress(userId); // Recalculate total progress since a task was moved/deleted
      return { success: true, status };
    } else if (!checkSuccess) {
      console.error('[incrementTaskProgress] Failed to check/move task status, proceeding with current progress save', taskId);
      // If checkAndMoveCompletedTask failed, still ensure progress is saved.
    }

    await calculateAndStoreTotalProgress(userId);
    return { success: true, status };
  } catch (error) {
    console.error('[incrementTaskProgress] Error incrementing task progress:', error);
    return { success: false, error: error.message };
  }
};

export const createUserProfile = async (userId, username, achievements = [], themeSetting = false, profilePicture = "") => {
  try {
    const userProfileRef = doc(db, 'Users', userId);
    
    const profileData = {
      userId: userId,
      username: username,
      profilePicture: profilePicture,
      achievements: achievements,
      themeSetting: themeSetting
    };

    await setDoc(userProfileRef, profileData, { merge: true }); // Use merge: true to avoid overwriting existing fields if called again
    console.log('User profile created/updated successfully for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Function to get a user's profile
export const getUserProfile = async (userId) => {
  try {
    const userProfileRef = doc(db, 'Users', userId);
    const userDocSnap = await getDoc(userProfileRef);
    if (userDocSnap.exists()) {
      console.log('User profile fetched successfully for user:', userId, userDocSnap.data());
      return { success: true, profile: userDocSnap.data() };
    } else {
      console.log('No user profile found for user:', userId);
      return { success: true, profile: null }; // Return null if no profile exists
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Function to get history tasks for a specific user
export const getHistoryTasks = async (userId) => {
  try {
    const userHistoryTasksCollectionRef = collection(db, 'HistoryTasks', userId, 'UserHistoryTasks');
    const q = query(userHistoryTasksCollectionRef);
    const querySnapshot = await getDocs(q, { source: 'server' });
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ ...doc.data(), id: doc.id });
    });
    console.log('History tasks fetched successfully from server for user:', userId, tasks);
    return { success: true, tasks };
  } catch (error) {
    console.error('Error getting history tasks:', error);
    return { success: false, error: error.message };
  }
};

// Function to delete a history task
export const deleteHistoryTask = async (userId, historyTaskId) => {
  try {
    const historyTaskDocRef = doc(db, 'HistoryTasks', userId, 'UserHistoryTasks', historyTaskId);
    await deleteDoc(historyTaskDocRef);
    console.log('History task deleted successfully:', historyTaskId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting history task:', error);
    return { success: false, error: error.message };
  }
};

export { db, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp, increment }; 