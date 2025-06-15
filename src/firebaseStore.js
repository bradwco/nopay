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
      tasks.push({ id: doc.id, ...doc.data() });
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

// Function to update an existing task
export const updateTask = async (userId, taskId, updatedData) => {
  try {
    const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
    await setDoc(taskDocRef, updatedData, { merge: true }); // Use setDoc with merge to update specific fields
    console.log('Task updated successfully:', taskId);
    await calculateAndStoreTotalProgress(userId); // Recalculate total progress after updating
    return { success: true };
  } catch (error) {
    console.error('Error updating task:', error);
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

export const incrementTaskProgress = async (userId, taskId, hoursToIncrement) => {
  try {
    const taskDocRef = doc(db, 'Tasks', userId, 'UserTasks', taskId);
    
    // Use FieldValue.increment to atomically add to currentProgress
    await setDoc(taskDocRef, {
      currentProgress: increment(hoursToIncrement)
    }, { merge: true });

    console.log(`Task ${taskId} progress incremented by ${hoursToIncrement} hours.`);
    await calculateAndStoreTotalProgress(userId); // Recalculate total progress after updating
    return { success: true };
  } catch (error) {
    console.error('Error incrementing task progress:', error);
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

export { db, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp, increment }; 