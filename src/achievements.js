import { getUserProfile, createUserProfile, getTasks, getTotalProgress } from "./firebaseStore";

// Define achievement criteria and display info
const ACHIEVEMENTS = [
  {
    id: "first_username_change",
    name: "New Identity",
    description: "Changed your username for the first time.",
    icon: "✨", // Emoji for icon
    check: async (userId, currentUserEmail) => {
      const { success, profile } = await getUserProfile(userId);
      // This achievement is granted if a username is set and it's not the initial email,
      // implying a change from the default or previous state.
      // A more robust check might involve storing an 'initialUsername' flag.
      return success && profile && profile.username && profile.username !== currentUserEmail;
    },
  },
  {
    id: "created_5_tasks",
    name: "Task Master Initiate",
    description: "Created 5 or more tasks.",
    icon: "📝",
    check: async (userId) => {
      const { success, tasks } = await getTasks(userId);
      return success && tasks && tasks.length >= 5;
    },
  },
  {
  id: "completed_1_task",
  name: "First Victory",
  description: "Completed your first task.",
  icon: "✅",
  check: async (userId) => {
    const { success, tasks } = await getTasks(userId);
    if (success && tasks) {
      return tasks.some(task => task.currentProgress >= task.totalHours && task.totalHours > 0);
    }
    return false;
  },
},
{
  id: "completed_5_tasks",
  name: "Achiever",
  description: "Completed 5 tasks.",
  icon: "🏆",
  check: async (userId) => {
    const { success, tasks } = await getTasks(userId);
    if (success && tasks) {
      const completedCount = tasks.filter(task => task.currentProgress >= task.totalHours && task.totalHours > 0).length;
      return completedCount >= 5;
    }
    return false;
  },
},
{
  id: "completed_10_tasks",
  name: "Grand Master",
  description: "Completed 10 tasks.",
  icon: "🚀",
  check: async (userId) => {
    const { success, tasks } = await getTasks(userId);
    if (success && tasks) {
      const completedCount = tasks.filter(task => task.currentProgress >= task.totalHours && task.totalHours > 0).length;
      return completedCount >= 10;
    }
    return false;
  },
},
];

// Function to check and grant achievements
export async function checkAndGrantAchievements(userId, email) {
  try {
    console.log('Checking achievements for user:', userId);
    const { success, profile } = await getUserProfile(userId);
    
    if (!success) {
      console.log('Failed to fetch user profile for achievement check');
      return;
    }

    // Initialize achievements array if it doesn't exist
    const currentAchievements = profile?.achievements || [];
    const newAchievements = [];

    // Check for first task achievement
    const { success: tasksSuccess, tasks } = await getTasks(userId);
    if (tasksSuccess && tasks && tasks.length > 0) {
      const hasFirstTaskAchievement = currentAchievements.some(a => a.id === 'first_task');
      if (!hasFirstTaskAchievement) {
        newAchievements.push({
          id: 'first_task',
          name: 'First Task',
          description: 'Created your first task',
          icon: '📝',
          unlockedAt: new Date().toISOString()
        });
      }
    }

    // Check for username achievement
    if (profile?.username && profile.username !== email) {
      const hasUsernameAchievement = currentAchievements.some(a => a.id === 'set_username');
      if (!hasUsernameAchievement) {
        newAchievements.push({
          id: 'set_username',
          name: 'Personal Touch',
          description: 'Set a custom username',
          icon: '👤',
          unlockedAt: new Date().toISOString()
        });
      }
    }

    // Check for progress achievements
    const { success: progressSuccess, totalProgress } = await getTotalProgress(userId);
    if (progressSuccess) {
      // 1 hour achievement
      if (totalProgress >= 1) {
        const hasOneHourAchievement = currentAchievements.some(a => a.id === 'one_hour');
        if (!hasOneHourAchievement) {
          newAchievements.push({
            id: 'one_hour',
            name: 'Getting Started',
            description: 'Tracked 1 hour of progress',
            icon: '⏱️',
            unlockedAt: new Date().toISOString()
          });
        }
      }

      // 5 hours achievement
      if (totalProgress >= 5) {
        const hasFiveHoursAchievement = currentAchievements.some(a => a.id === 'five_hours');
        if (!hasFiveHoursAchievement) {
          newAchievements.push({
            id: 'five_hours',
            name: 'Making Progress',
            description: 'Tracked 5 hours of progress',
            icon: '🎯',
            unlockedAt: new Date().toISOString()
          });
        }
      }

      // 10 hours achievement
      if (totalProgress >= 10) {
        const hasTenHoursAchievement = currentAchievements.some(a => a.id === 'ten_hours');
        if (!hasTenHoursAchievement) {
          newAchievements.push({
            id: 'ten_hours',
            name: 'Dedicated',
            description: 'Tracked 10 hours of progress',
            icon: '🏆',
            unlockedAt: new Date().toISOString()
          });
        }
      }
    }

    // If we have new achievements, update the profile
    if (newAchievements.length > 0) {
      const updatedAchievements = [...currentAchievements, ...newAchievements];
      const { success: updateSuccess } = await createUserProfile(userId, profile?.username || email, updatedAchievements);
      if (updateSuccess) {
        console.log('New achievements granted:', newAchievements);
      } else {
        console.error('Failed to update achievements');
      }
    }

  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

// Function to render achievements on the profile page
export const renderAchievements = (achievements, targetElementId) => {
  const achievementsGrid = document.getElementById(targetElementId);
  if (!achievementsGrid) return;

  achievementsGrid.innerHTML = ""; // Clear existing
  if (achievements && achievements.length > 0) {
    achievements.forEach(achievement => {
      const achievementHtml = `
        <div class="achievement-item">
          <span class="achievement-icon-emoji">${achievement.icon}</span>
          <span>${achievement.name}</span>
          <span class="achievement-description">${achievement.description}</span>
        </div>
      `;
      achievementsGrid.insertAdjacentHTML('beforeend', achievementHtml);
    });
  } else {
    achievementsGrid.innerHTML = `<p style="text-align: center; color: var(--text-color-secondary);">No achievements yet. Keep working!</p>`;
  }
}; 