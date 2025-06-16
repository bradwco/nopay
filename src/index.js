// General JS logic for the app

import { setupFirebaseAuthListenersAndHandlers, signOut, auth, setupProfilePageLogoutButton } from "./firebaseAuth";
import { HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL } from "./firebaseConfig";
import { addTask, getTasks, deleteTask, getTotalProgress, incrementTaskCounter, updateTask, incrementTaskProgress, createUserProfile, getUserProfile, getHistoryTasks, checkAndMoveCompletedTask, deleteHistoryTask } from "./firebaseStore";
import { checkAndGrantAchievements, renderAchievements } from "./achievements";
// import { db, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp } from "./firebaseStore"; // Uncomment if you add Firestore logic here

const profilePageHtml = `
  <div class="profile-content-grid">
    <!-- Left Card: Profile Picture & Username -->
    <div class="profile-card profile-user-info">
      <div class="profile-avatar-large">
        <img id="profilePicture" src="../assets/defaultprofile.png" alt="Profile Avatar" />
      </div>
      <input type="file" id="avatarUpload" accept="image/*" style="display:none;" />
      <button class="profile-avatar-upload" id="changePictureBtn" onclick="document.getElementById('avatarUpload').click();">Change Picture</button>
      <h3 class="profile-username" id="displayedUsername">Maria Fernanda</h3>
      <span class="profile-premium-tag">Premium User</span>
    </div>

    <!-- Right Card: Details & Actions -->
    <div class="profile-card">
      <h4 class="profile-section-title">Account Details</h4>
      <div class="profile-field">
        <label for="username">Username</label>
        <input type="text" id="profileUsername" placeholder="Your username">
      </div>
      <div class="profile-field">
        <label for="email">Email</label>
        <input type="text" id="profileEmail" readonly>
      </div>

      <h4 class="profile-section-title" style="margin-top: 1.5rem;">Achievements</h4>
      <div class="achievements-grid" id="achievementsGrid">
        <!-- Achievements will be dynamically loaded here by JavaScript -->
      </div>

      <h4 class="profile-section-title" style="margin-top: 1.5rem;">Theme Settings</h4>
      <div class="theme-toggle-container">
        <div class="tdnn" id="themeToggle">
          <div class="moon"></div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="profile-save-btn" id="saveChangesBtn">Save Changes</button>
        <button id="logoutBtn" class="profile-logout-btn">Log Out</button>
      </div>
    </div>
  </div>
`;

const editTaskModalHtml = `
  <div id="editTaskModal" class="modal" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Task</h2>
        <button class="modal-close-btn" id="editModalCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="editTaskId" />
        <div class="modal-field">
          <label for="editTaskNameInput">Name of task</label>
          <input type="text" id="editTaskNameInput" placeholder="e.g., LeetCode, PyTorch project" />
        </div>
        <div class="modal-field">
          <label for="editHoursToCompleteInput">Hours to Be Completed</label>
          <input type="number" id="editHoursToCompleteInput" placeholder="e.g., 10.5" step="0.5" />
        </div>
        <div class="modal-field">
          <label for="editCurrentHoursInput">Current Hours</label>
          <input type="number" id="editCurrentHoursInput" placeholder="e.g., 5.0" step="0.5" />
        </div>
        <div class="modal-field">
          <label for="editGoalTypeSelect">Goal Type</label>
          <select id="editGoalTypeSelect">
            <option value="weekLong">Week Long</option>
            <option value="monthLong">Month Long</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-save-btn" id="editTaskSaveBtn">Save Changes</button>
      </div>
    </div>
  </div>
`;

// Define the color palette based on the provided image (outer colors)
const taskColorPalette = [
  "#ffb6c1", // Pink
  "#a52a2a", // Brown - Corrected to match CSS #a52a2a
  "#ffeb3b", // Yellow
  "#ffa726", // Orange
  "#90ee90", // Green
  "#64b5f6", // Light Blue
  "#9370db", // Purple
  "#78909c"  // Grey
];
let currentTaskColorIndex = 0;

// Helper to get CSS class name from hex color
function getTaskColorClassName(hexColor) {
  switch (hexColor) {
    case "#ffb6c1": return "pink";
    case "#a52a2a": return "brown"; // Mapped to corrected hex
    case "#ffeb3b": return "yellow"; // Assuming you might add a yellow class later if needed
    case "#ffa726": return "orange"; // Assuming orange class
    case "#90ee90": return "green";
    case "#64b5f6": return "blue";
    case "#9370db": return "purple";
    case "#78909c": return "grey"; // Assuming grey class
    default: return "";
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const getStartedBtn = document.getElementById('getStarted');

  // Get references to main content area and other essential elements
  const mainContent = document.querySelector('.main-content');
  const homeContentDiv = document.getElementById('homeContent');
  const profileContentDiv = document.getElementById('profileContent');
  const createTaskModal = document.getElementById('createTaskModal');
  const editTaskModal = document.getElementById('editTaskModal'); // Get reference to the edit modal
  const historyContentDiv = document.getElementById('historyContent');
  const saveTaskBtn = document.getElementById('saveTaskBtn'); // Get reference to the save task button
  const editTaskSaveBtn = document.getElementById('editTaskSaveBtn'); // Get reference to the edit task save button

  // Append the loading spinner to the main content area once on DOMContentLoaded
  if (mainContent) {
    const spinnerHtml = `
      <div id="profileLoadingSpinner" class="loading-spinner-overlay" style="display: none;">
        <div class="spinner"></div>
      </div>
    `;
    mainContent.insertAdjacentHTML('beforeend', spinnerHtml);
  }

  // Get Started button logic (from startup.html)
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      window.location.href = AUTH_PAGE_URL;
    });
  }

  // Call the function to set up all Firebase Auth listeners and handlers
  setupFirebaseAuthListenersAndHandlers();

  // After Firebase Auth is set up, check if a user is already authenticated on page load
  // and render home content if on the home page.
  if (auth.currentUser && window.location.pathname.endsWith('home.html')) {
    console.log('User already authenticated on page load. Rendering home content.');
    renderHomeContent(auth.currentUser.uid); // Render immediately

    // Ensure home content div is visible and active
    const homeContentDivElement = document.getElementById('homeContent');
    if (homeContentDivElement) {
      homeContentDivElement.style.display = 'block';
      homeContentDivElement.classList.add('active');
      // Add fade-in class after a small delay
      setTimeout(() => {
        homeContentDivElement.classList.add('fade-in');
      }, 10);
    }

    // Also update the displayed username in the top bar
    const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
    if (currentUsernameDisplay) {
      const { success, profile } = await getUserProfile(auth.currentUser.uid);
      if (success && profile && profile.username) {
        currentUsernameDisplay.textContent = profile.username;
      } else {
        currentUsernameDisplay.textContent = auth.currentUser.email;
      }
    }
  }

  // Setup close button listener for Create Task modal (top right X button) - attached once
  const createModalCloseBtn = document.getElementById('createModalCloseBtn');
  if (createModalCloseBtn) {
    createModalCloseBtn.addEventListener('click', () => {
      createTaskModal.style.display = 'none';
      
      // Ensure home content div is visible and active BEFORE rendering tasks
      showContentSection(homeContentDiv);

      console.log('Modal closed. homeContentDiv display:', homeContentDiv.style.display, 'classList:', homeContentDiv.classList.contains('active') ? 'active' : 'not active');
      
      if (auth.currentUser) {
        renderHomeContent(auth.currentUser.uid); // Pass uid
      } else {
        console.warn('Attempted to render home content after modal close, but user not authenticated.');
      }

      // Reset navigation state to Home
      navItems.forEach(nav => nav.classList.remove('active'));
      homeNavLink.classList.add('active');
      updateSliderPosition(homeNavLink);
    });
  }

  if (saveTaskBtn) {
    saveTaskBtn.addEventListener('click', handleSaveTask);
  }

  if (editTaskSaveBtn) {
    editTaskSaveBtn.addEventListener('click', handleEditTask); // Attach new handler for editing
  }

  // Setup close button listener for Edit Task modal (top right X button) - attached once
  const editModalCloseBtn = document.getElementById('editModalCloseBtn');
  if (editModalCloseBtn) {
    editModalCloseBtn.addEventListener('click', () => {
      editTaskModal.style.display = 'none';
      // Ensure home content div is visible and active BEFORE rendering tasks
      showContentSection(homeContentDiv); // Show home content when closing edit modal
      if (auth.currentUser) {
        renderHomeContent(auth.currentUser.uid); // Refresh tasks
      } else {
        console.warn('Attempted to render home content after edit modal close, but user not authenticated.');
      }
    });
  }

  // Sidebar navigation logic for sliding background
  const navItems = document.querySelectorAll('.nav-item');
  const navSlider = document.querySelector('.nav-slider');
  const homeNavLink = document.getElementById('homeNavLink');
  const createNavLink = document.getElementById('createNavLink');
  const profileNavLink = document.getElementById('profileNavLink');
  const historyNavLink = document.getElementById('historyNavLink');

  // Store initial home content - this will now be the template for dynamic rendering
  const homeContentTemplate = document.getElementById('tasksDisplayArea').innerHTML;

  // Helper function to show a content div and hide others
  function showContentSection(sectionToShow) {
      const contentSections = [homeContentDiv, profileContentDiv, historyContentDiv]; // Add historyContentDiv
      if (createTaskModal) {
          contentSections.push(createTaskModal);
      }
      contentSections.forEach(section => {
          if (section) {
              section.classList.remove('fade-in');
              section.style.display = 'none';
              section.classList.remove('active');
          }
      });
      if (sectionToShow) {
          sectionToShow.style.display = 'block';
          sectionToShow.classList.add('active');
          setTimeout(() => {
            sectionToShow.classList.add('fade-in');
          }, 10);
      }
  }

  function updateSliderPosition(activeItem) {
    if (activeItem && navSlider) {
      // Slide out animation
      navSlider.style.opacity = '0';
      navSlider.style.transform = 'translateX(-100%)';

      // After slide out, update position and then slide in
      setTimeout(() => {
        navSlider.style.top = `${activeItem.offsetTop}px`;
        navSlider.style.height = `${activeItem.offsetHeight}px`;
        
        // After position update, slide in
        setTimeout(() => {
          navSlider.style.opacity = '1';
          navSlider.style.transform = 'translateX(0)';
        }, 50); // Small delay to ensure position is set before sliding in
      }, 200); // Duration of the slide-out animation (should match CSS transition) 
    }
  }

  // Function to render home content
  async function renderHomeContent(userId) {
    const tasksDisplayArea = document.getElementById('tasksDisplayArea');
    const totalProgressLabel = document.getElementById('totalProgressLabel');
    const totalProgressDisplay = document.getElementById('totalProgressDisplay');

    console.log('renderHomeContent called.', new Date().toLocaleTimeString(), 'with userId:', userId);
    // Clear tasksDisplayArea before fetching and rendering to prevent duplicates
    if (tasksDisplayArea) {
      console.log('tasksDisplayArea content before clear:', tasksDisplayArea.innerHTML.length > 0 ? 'Has content' : 'Empty', 'Current child count:', tasksDisplayArea.childElementCount);
      tasksDisplayArea.innerHTML = ''; // Clear existing content
      console.log('tasksDisplayArea content after clear:', tasksDisplayArea.innerHTML.length > 0 ? 'Has content' : 'Empty', 'Current child count:', tasksDisplayArea.childElementCount);
    }

    if (userId) {
      // Fetch and display Total Progress
      const { success: progressSuccess, totalProgress } = await getTotalProgress(userId);
      console.log('renderHomeContent - getTotalProgress success:', progressSuccess, 'totalProgress:', totalProgress);
      if (progressSuccess) {
        totalProgressLabel.textContent = `Total Progress - ${totalProgress}%`;
        totalProgressDisplay.style.setProperty('--progress-percentage', `${totalProgress}%`);
      } else {
        console.error('Failed to fetch total progress.');
        totalProgressLabel.textContent = 'Total Progress - Error';
        totalProgressDisplay.style.setProperty('--progress-percentage', '0%');
      }

      // Fetch and display individual tasks
      const { success, tasks } = await getTasks(userId);
      console.log('renderHomeContent - getTasks success:', success, 'tasks length:', tasks ? tasks.length : 'null');
      if (success) {
        // Clear existing tasks before rendering new ones
        tasksDisplayArea.innerHTML = ''; 
        if (tasks.length === 0) {
          tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No tasks yet. Create one!</p>';
          console.log('renderHomeContent - No tasks found.');
        } else {
          let tasksMovedToHistory = false;
          for (const task of tasks) {
            // Check if task needs to be moved to history
            const { success: checkSuccess, status } = await checkAndMoveCompletedTask(userId, task.id, task);
            if (checkSuccess && status !== 'active') {
              console.log(`Task ${task.id} moved to history on page load. Status: ${status}`);
              tasksMovedToHistory = true;
            }
          }
          
          // If any tasks were moved, re-render home and history content to reflect changes
          if (tasksMovedToHistory) {
            console.log('Tasks moved to history, re-rendering home and history content.');
            await renderHomeContent(userId); // Re-render home content to get updated active tasks
            await renderHistoryContent(userId); // Re-render history content
            return; // Exit to prevent re-rendering old tasks
          }

          // If no tasks were moved, proceed to render the current active tasks
          tasks.forEach(task => {
            console.log(`Task: ${task.taskName}, currentProgress: ${task.currentProgress}, totalHours: ${task.totalHours}`);
            const currentProgressPercentage = task.totalHours > 0 ? ((task.currentProgress || 0) / task.totalHours * 100).toFixed(0) : 0;
            const taskCardHtml = `
              <div class="card task">
                <div class="task-header">
                  <div class="task-left">
                    <div class="task-icon-wrapper timer-icon-wrapper" data-task-id="${task.id}" data-task-name="${task.taskName}" style="background-color: ${task.taskColor};">
                      <img src="../assets/timer.png" alt="Timer Icon" class="task-timer-icon" />
                    </div>
                    <span>${task.taskName} - <strong>${currentProgressPercentage}%</strong></span> <!-- Initial progress 0% -->
                  </div>
                  <span class="time">${formatDateShort(task.startDate)} - ${formatDateShort(task.endDate)} | ${formatHoursToHMS(task.currentProgress || 0)} / ${formatHoursToHMS(task.totalHours)} Hours</span>
                  <button class="edit-task-btn glassy-icon-btn" data-task-id="${task.id}" title="Edit">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#222"/></svg>
                  </button>
                  <button class="delete-task-btn glassy-icon-btn" data-task-id="${task.id}">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3V6zm2 3h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9zm3 2v9h2v-9H8zm4 0v9h2v-9h-2z" fill="#222"/></svg>
                  </button>
                </div>
                <div class="progress-bar ${getTaskColorClassName(task.taskColor)}" style="--progress-percentage: ${currentProgressPercentage}%;"></div>
              </div>
            `;
            tasksDisplayArea.insertAdjacentHTML('beforeend', taskCardHtml);
          });
          console.log('renderHomeContent - Tasks rendered. Total tasks in DOM now:', tasksDisplayArea.childElementCount);
          // Attach event listeners to delete and edit buttons after tasks are rendered
          document.querySelectorAll('.delete-task-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
              const taskId = event.currentTarget.dataset.taskId;
              const taskCard = event.currentTarget.closest('.card.task'); // Get the parent task card
              const currentUserForDelete = auth.currentUser;

              if (currentUserForDelete && taskId && taskCard) {
                // Start delete animation
                taskCard.classList.add('deleting');

                // Wait for the animation to complete before actually deleting from Firebase and DOM
                setTimeout(async () => {
                  const { success } = await deleteTask(currentUserForDelete.uid, taskId);
                  if (success) {
                    console.log('Task deleted successfully from UI.');
                    taskCard.remove(); // Remove from DOM after successful deletion from Firebase
                    // Re-render home content to update total progress and ensure layout is correct
                    renderHomeContent(currentUserForDelete.uid);
                  } else {
                    console.error('Failed to delete task from Firebase.');
                    taskCard.classList.remove('deleting'); // Revert animation if deletion fails
                  }
                }, 500); // Match this duration to the CSS transition duration (0.5s)
              }
            });
          });

          // Add event listener for edit buttons
          document.querySelectorAll('.edit-task-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
              const taskId = event.currentTarget.dataset.taskId;
              const currentUserForEdit = auth.currentUser;
              if (currentUserForEdit && taskId) {
                // Fetch task data
                const { success, tasks } = await getTasks(currentUserForEdit.uid);
                if (success) {
                  const taskToEdit = tasks.find(task => task.id === taskId);
                  if (taskToEdit) {
                    // Map old frequency values to new ones for prefilling
                    let displayFrequency = taskToEdit.frequency;
                    if (displayFrequency === 'weekly') {
                      displayFrequency = 'weekLong';
                    } else if (displayFrequency === 'monthly') {
                      displayFrequency = 'monthLong';
                    }

                    // Populate and show edit modal
                    const editTaskModal = document.getElementById('editTaskModal');
                    if (editTaskModal) {
                      document.getElementById('editTaskId').value = taskToEdit.id;
                      document.getElementById('editTaskNameInput').value = taskToEdit.taskName;
                      document.getElementById('editHoursToCompleteInput').value = taskToEdit.totalHours;
                      document.getElementById('editGoalTypeSelect').value = displayFrequency; // Use mapped frequency
                      document.getElementById('editCurrentHoursInput').value = taskToEdit.currentProgress || 0; // Populate current hours
                      showContentSection(editTaskModal);
                      editTaskModal.style.display = 'flex';
                    }
                  } else {
                    console.error('Task not found for editing:', taskId);
                  }
                } else {
                  console.error('Failed to fetch tasks for editing.', tasks.error);
                }
              }
            });
          });

          // Add event listener for timer icons
          document.querySelectorAll('.timer-icon-wrapper').forEach(iconWrapper => {
            iconWrapper.addEventListener('click', (event) => {
              console.log('[Timer Button] Clicked! Task ID:', event.currentTarget.dataset.taskId);
              const taskId = event.currentTarget.dataset.taskId;
              const taskName = event.currentTarget.dataset.taskName;
              openTimerModal(taskId, taskName);
            });
          });
        }
      } else {
        tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Please log in to view your tasks.</p>';
        console.warn('renderHomeContent - User not logged in.');
      }
    } else {
      tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Please log in to view your tasks.</p>';
      console.warn('renderHomeContent - User not logged in.');
    }
  }

  // Theme toggle logic
  function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      });
    }
  }

  // Apply saved theme on load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
  } else {
    // If no theme is saved, default to dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }

  // Set initial position of the slider based on the active item on page load
  const initialActiveItem = document.querySelector('.nav-item.active');
  if (initialActiveItem) {
    updateSliderPosition(initialActiveItem);
  }

  // Firebase Auth State Listener
  setupFirebaseAuthListenersAndHandlers();

  // Initial call to setupThemeToggle to apply saved theme and attach listener if on profile page initially
  // This ensures the toggle is functional even if the profile page is the first viewed page after reload
  if (window.location.pathname.endsWith('home.html')) {
    // Only call setupThemeToggle when on the home page, specifically after profile content might load
    // Or ensure it is called whenever profile content is dynamically loaded.
    // Since setupThemeToggle() is already called within profileNavLink case, this part handles initial load.
    // If home.html is loaded directly with #profileNavLink active (e.g., from refresh), setupThemeToggle needs to be called.
    const initialActiveItem = document.querySelector('.nav-item.active');
    if (initialActiveItem && initialActiveItem.id === 'profileNavLink') {
      // Since profile content is not initially in DOM, we cannot call setupThemeToggle here.
      // It must be called AFTER profilePageHtml is set, which is in navItems.forEach.
    }
  }

  // Timer Modal and Logic (moved declarations to top of DOMContentLoaded scope for clarity)
  const timerModal = document.getElementById('timerModal');
  const timerModalCloseBtn = document.getElementById('timerModalCloseBtn');
  const timerModalTaskName = document.getElementById('timerModalTaskName');
  const taskTimerDisplay = document.getElementById('taskTimerDisplay');
  const startStopTimerBtn = document.getElementById('startStopTimerBtn');
  const startStopTimerIcon = document.getElementById('startStopTimerIcon');
  const startStopTimerText = document.getElementById('startStopTimerText');

  console.log('timerModalCloseBtn found:', !!timerModalCloseBtn);
  if (timerModalCloseBtn) {
    timerModalCloseBtn.addEventListener('click', () => {
      console.log('Timer modal close button clicked.');
      closeTimerModal();
    });
  }

  console.log('startStopTimerBtn found:', !!startStopTimerBtn);
  if (startStopTimerBtn) {
    startStopTimerBtn.addEventListener('click', () => {
      console.log('Start/Stop Timer button clicked. Current timerRunning:', timerRunning);
      if (timerRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    });
  }

  let timerInterval;
  let elapsedSeconds = 0;
  let currentTimerTaskId = null;
  let timerRunning = false;

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }

  // New helper function to format hours (decimal) into HH:MM:SS
  function formatHoursToHMS(decimalHours) {
    const totalSeconds = Math.round(decimalHours * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }

  function updateTimerDisplay() {
    taskTimerDisplay.textContent = formatTime(elapsedSeconds);
  }

  async function startTimer() {
    console.log('startTimer function called.');
    if (!currentTimerTaskId) {
      console.warn('startTimer: No currentTimerTaskId set.');
      return;
    }
    timerRunning = true;
    if (startStopTimerText) {
      startStopTimerText.textContent = 'Pause';
    }

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);

    console.log(`Timer started for task ${currentTimerTaskId}`);
  }

  async function stopTimer() {
    console.log('stopTimer function called.');
    if (!timerRunning) {
      console.warn('stopTimer: Timer not running.');
      return;
    }
    timerRunning = false;
    clearInterval(timerInterval);
    if (startStopTimerText) {
      startStopTimerText.textContent = 'Play';
    }

    console.log(`Timer stopped for task ${currentTimerTaskId}. Elapsed seconds: ${elapsedSeconds}`);

    // Removed: Saving elapsed time to Firestore logic is now moved to closeTimerModal
    // if (auth.currentUser && currentTimerTaskId) {
    //   const hoursToAdd = elapsedSeconds / 3600;
    //   const { success, error } = await incrementTaskProgress(auth.currentUser.uid, currentTimerTaskId, hoursToAdd);
    //   if (success) {
    //     console.log(`Successfully added ${hoursToAdd.toFixed(2)} hours to task ${currentTimerTaskId}`);
    //     renderHomeContent(auth.currentUser.uid);
    //   } else {
    //     console.error(`Failed to update task ${currentTimerTaskId}:`, error);
    //   }
    // }
    // Removed: resetTimer() is now called only when closing the modal
    // resetTimer();
  }

  function resetTimer() {
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  async function openTimerModal(taskId, taskName) {
    currentTimerTaskId = taskId;
    timerModalTaskName.textContent = `Task: ${taskName}`;
    // Always start timer from 0 for a new session in the modal
    elapsedSeconds = 0;
    updateTimerDisplay();
    
    // Removed: Logic to fetch and initialize elapsedSeconds from currentProgress
    // if (auth.currentUser && taskId) {
    //   const { success, tasks } = await getTasks(auth.currentUser.uid);
    //   if (success) {
    //     const task = tasks.find(t => t.id === taskId);
    //     if (task && task.currentProgress) {
    //       elapsedSeconds = Math.round(task.currentProgress * 3600);
    //       updateTimerDisplay();
    //     } else {
    //       elapsedSeconds = 0;
    //       updateTimerDisplay();
    //     }
    //   } else {
    //     console.error('Failed to fetch tasks to initialize timer modal.', tasks.error);
    //     elapsedSeconds = 0;
    //     updateTimerDisplay();
    //   }
    // }

    showContentSection(timerModal);
    timerModal.style.display = 'flex'; // Use flex to center the modal
  }

  async function closeTimerModal() { // Made async to await Firebase calls
    console.log('closeTimerModal function called.');
    stopTimer(); // Ensure timer is stopped when modal closes

    // Save accumulated elapsed time to Firestore before closing
    if (auth.currentUser && currentTimerTaskId && elapsedSeconds > 0) {
      const hoursToAdd = elapsedSeconds / 3600;
      console.log(`Saving ${hoursToAdd.toFixed(4)} hours for task ${currentTimerTaskId}`);
      const { success, status, error } = await incrementTaskProgress(auth.currentUser.uid, currentTimerTaskId, hoursToAdd); // Get status
      if (success) {
        console.log(`Successfully saved ${hoursToAdd.toFixed(2)} hours to task ${currentTimerTaskId}`);
        // Refresh home content to show updated progress only after successful save
        renderHomeContent(auth.currentUser.uid);

        // If the task was completed/expired, also re-render history
        if (status !== 'active') {
          await renderHistoryContent(auth.currentUser.uid); 
        }
      } else {
        console.error(`Failed to save task ${currentTimerTaskId}:`, error);
      }
    }

    currentTimerTaskId = null;
    resetTimer(); // Reset timer only after saving and when closing the modal

    const homeContentDiv = document.getElementById('homeContent');
    const timerModal = document.getElementById('timerModal'); // Ensure timerModal is accessible here

    if (timerModal) {
      timerModal.style.display = 'none';
      console.log('Timer modal display set to none.');
    }

    if (homeContentDiv) {
      showContentSection(homeContentDiv);
      console.log('Home content section set to active/block.', homeContentDiv.style.display, homeContentDiv.classList.contains('active') ? 'active' : 'not active');
    } else {
      console.warn('homeContentDiv not found in closeTimerModal.');
    }
  }

  // When navigating away from home or logging out, ensure timer stops
  window.addEventListener('beforeunload', () => {
    // No need to save here, as save logic is now only on modal close
    stopTimer();
  });

  auth.onAuthStateChanged(user => {
    if (!user) {
      // If user logs out, stop timer and save any accumulated time
      if (timerRunning || elapsedSeconds > 0) {
        // This case handles unsaved time if user logs out while modal is open
        // or if they had time accumulated and navigated away.
        // We'll call closeTimerModal to trigger the save logic.
        if (currentTimerTaskId) { // Only attempt to close if a task was active
            closeTimerModal(); // This will stop, save, and reset
        } else {
            stopTimer(); // Just stop if no task was active
            resetTimer(); // Reset for clean state
        }
      } else {
        stopTimer();
        resetTimer();
      }
    }
  });

  // Format date range for display
  function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  // Function to render history tasks
  async function renderHistoryContent(userId) {
    const historyContentDiv = document.getElementById('historyContent');
    if (!historyContentDiv) return;

    console.log('[renderHistoryContent] Fetching history tasks for user:', userId);
    const { success, tasks } = await getHistoryTasks(userId);
    console.log('[renderHistoryContent] Fetched tasks success:', success, 'tasks:', tasks);
    if (success) {
      if (tasks.length === 0) {
        historyContentDiv.innerHTML = `
          <h2 style="margin-top:2rem; text-align:center; color:#e0e6f0; font-size:2rem; font-weight:700;">History</h2>
          <p style="text-align: center; color: var(--text-color-secondary); margin-top: 1rem;">No completed tasks yet.</p>
        `;
      } else {
        // Sort tasks by completion date, most recent first
        tasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        let historyHtml = `
          <h2 style="margin-top:2rem; text-align:center; color:#e0e6f0; font-size:2rem; font-weight:700;">History</h2>
          <div class="history-tasks-container" style="max-width: 800px; margin: 2rem auto;">
        `;

        tasks.forEach(task => {
          const completionDate = new Date(task.completedAt);
          const formattedDate = completionDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const finalProgressPercentage = task.totalHours > 0 
            ? ((task.finalProgress || 0) / task.totalHours * 100).toFixed(0) 
            : 0;

          historyHtml += `
            <div class="card task history-task">
              <div class="task-header">
                <div class="task-left">
                  <div class="task-icon-wrapper" style="background-color: ${task.taskColor};">
                    <img src="../assets/timer.png" alt="Timer Icon" class="task-timer-icon" />
                  </div>
                  <span>${task.taskName} - <strong>${finalProgressPercentage}%</strong></span>
                </div>
                <span class="time">
                  ${formatDateShort(task.startDate)} - ${formatDateShort(task.endDate)} | 
                  ${formatHoursToHMS(task.finalProgress || 0)} / ${formatHoursToHMS(task.totalHours)} Hours
                </span>
                <div class="completion-status-wrapper" data-task-id="${task.id}">
                  <span class="completion-status ${task.completionStatus}" style="
                    border-radius: 4px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    ${task.completionStatus === 'completed' ? 'background-color: rgba(40, 167, 69, 0.7); color: white; border: 1px solid rgba(40, 167, 69, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);' : 'background-color: rgba(255, 40, 40, 0.7); color: white; border: 1px solid rgba(255, 40, 40, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);'}
                  ">
                    ${task.completionStatus === 'completed' ? 'Completed' : 'Expired'}
                  </span>
                  <button class="delete-history-task-btn" data-task-id="${task.id}">Delete</button>
                </div>
              </div>
              <div class="progress-bar ${getTaskColorClassName(task.taskColor)}" style="--progress-percentage: ${finalProgressPercentage}%;"></div>
              <div class="completion-date" style="
                text-align: right;
                font-size: 0.9rem;
                color: var(--text-color-secondary);
                margin-top: 0.5rem;
              ">
                ${formattedDate}
              </div>
            </div>
          `;
          console.log(`Rendered history task: ID=${task.id}, Name=${task.taskName}, Status=${task.completionStatus}`);
        });

        historyHtml += '</div>';
        historyContentDiv.innerHTML = historyHtml;

        // Attach event listeners to the new delete buttons
        document.querySelectorAll('.delete-history-task-btn').forEach(button => {
          button.addEventListener('click', handleDeleteHistoryTask);
        });
      }
    } else {
      historyContentDiv.innerHTML = `
        <h2 style="margin-top:2rem; text-align:center; color:#e0e6f0; font-size:2rem; font-weight:700;">History</h2>
        <p style="text-align: center; color: var(--text-color-secondary); margin-top: 1rem;">Error loading history.</p>
      `;
    }
  }

  // New function to handle deleting history tasks
  async function handleDeleteHistoryTask(event) {
    const taskId = event.target.dataset.taskId;
    if (!taskId) {
      console.error('No task ID found for deletion.');
      return;
    }

    if (confirm('Are you sure you want to delete this historical task? This action cannot be undone.')) {
      if (auth.currentUser) {
        const { success, error } = await deleteHistoryTask(auth.currentUser.uid, taskId);
        if (success) {
          console.log('Historical task deleted successfully.', taskId);
          // Re-render history content to update the display
          await renderHistoryContent(auth.currentUser.uid);
        } else {
          console.error('Failed to delete historical task:', error);
          alert('Failed to delete task. Please try again.');
        }
      } else {
        console.warn('User not authenticated. Cannot delete historical task.');
      }
    }
  }
}); 