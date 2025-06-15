import { getFirestore, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp, deleteDoc, getDoc } from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);

// Function to add a new task
export const addTask = async (userId, taskData) => {
  try {
    const userTasksCollectionRef = collection(db, 'Tasks', userId, 'UserTasks');
    await addDoc(userTasksCollectionRef, taskData);
    console.log('Task added successfully for user:', userId);
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
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
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

export { db, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp }; 