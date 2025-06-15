// General JS logic for the app

import { setupFirebaseAuthListenersAndHandlers, signOut, auth, setupProfilePageLogoutButton } from "./firebaseAuth";
import { HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL } from "./firebaseConfig";
import { addTask, getTasks, deleteTask, getTotalProgress, incrementTaskCounter, updateTask, incrementTaskProgress, createUserProfile, getUserProfile } from "./firebaseStore";
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
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
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

  // Setup save task button listener - attached once
  const saveTaskBtn = document.getElementById('createTaskSaveBtn');
  if (saveTaskBtn) {
    saveTaskBtn.addEventListener('click', handleSaveTask);
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

  // Setup save changes button listener for Edit Task modal - attached once
  const editTaskSaveBtn = document.getElementById('editTaskSaveBtn');
  if (editTaskSaveBtn) {
    editTaskSaveBtn.addEventListener('click', handleEditTask); // Attach new handler for editing
  }

  // Sidebar navigation logic for sliding background
  const navItems = document.querySelectorAll('.nav-item');
  const navSlider = document.querySelector('.nav-slider');
  const homeNavLink = document.getElementById('homeNavLink');
  const createNavLink = document.getElementById('createNavLink');
  const profileNavLink = document.getElementById('profileNavLink');

  // Store initial home content - this will now be the template for dynamic rendering
  const homeContentTemplate = document.getElementById('tasksDisplayArea').innerHTML;

  // Helper function to show a content div and hide others
  function showContentSection(sectionToShow) {
      const contentSections = [homeContentDiv, profileContentDiv]; // Only manage primary content sections
      if (createTaskModal) { // Add modal if it exists
          contentSections.push(createTaskModal);
      }

      contentSections.forEach(section => {
          if (section) { // Ensure the element exists
              section.classList.remove('fade-in'); // Remove fade-in from all
              section.style.display = 'none'; // Hide all by default
              section.classList.remove('active');
          }
      });

      if (sectionToShow) {
          sectionToShow.style.display = 'block'; // Show the desired one (initially at opacity 0)
          sectionToShow.classList.add('active');
          // Trigger fade-in after display is set
          setTimeout(() => {
            sectionToShow.classList.add('fade-in');
          }, 10); // Small delay to ensure display:block is applied before transition
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
    console.log('renderHomeContent called.', new Date().toLocaleTimeString(), 'with userId:', userId);
    if (mainContent) {
      const tasksDisplayArea = document.getElementById('tasksDisplayArea');
      const totalProgressDisplay = document.querySelector('.weekly-progress .progress-bar');
      const totalProgressLabel = document.querySelector('.weekly-progress strong');

      if (tasksDisplayArea && totalProgressDisplay && totalProgressLabel) {
        console.log('tasksDisplayArea content before clear:', tasksDisplayArea.innerHTML.length > 0 ? 'Has content' : 'Empty', 'Current child count:', tasksDisplayArea.childElementCount);
        tasksDisplayArea.innerHTML = ''; // Clear existing tasks
        console.log('tasksDisplayArea content after clear:', tasksDisplayArea.innerHTML.length > 0 ? 'Has content' : 'Empty', 'Current child count:', tasksDisplayArea.childElementCount);
        console.log('renderHomeContent - userId:', userId ? userId : 'null');
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
            if (tasks.length === 0) {
              tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No tasks yet. Create one!</p>';
              console.log('renderHomeContent - No tasks found.');
            } else {
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
                      <span class="time">${task.frequency} | ${formatHoursToHMS(task.currentProgress || 0)} / ${formatHoursToHMS(task.totalHours)} Hours</span>
                      <button class="edit-task-btn glassy-icon-btn" data-task-id="${task.id}" title="Edit">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#222"/></svg>
                      </button>
                      <button class="delete-task-btn glassy-icon-btn" data-task-id="${task.id}" title="Delete">
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
                        // Populate and show edit modal
                        const editTaskModal = document.getElementById('editTaskModal');
                        if (editTaskModal) {
                          document.getElementById('editTaskId').value = taskToEdit.id;
                          document.getElementById('editTaskNameInput').value = taskToEdit.taskName;
                          document.getElementById('editHoursToCompleteInput').value = taskToEdit.totalHours;
                          document.getElementById('editGoalTypeSelect').value = taskToEdit.frequency;
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
                  const taskId = event.currentTarget.dataset.taskId;
                  const taskName = event.currentTarget.dataset.taskName;
                  openTimerModal(taskId, taskName);
                });
              });
            }
          } else {
            tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Error loading tasks.</p>';
            console.error('Failed to fetch tasks:', tasks.error);
            console.log('renderHomeContent - Error loading tasks.');
          }
        } else {
          tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Please log in to view tasks.</p>';
          console.log('renderHomeContent - User not logged in (userId was null).');
        }
      }
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
  }

  // Set initial position of the slider based on the active item on page load
  const initialActiveItem = document.querySelector('.nav-item.active');
  if (initialActiveItem) {
    // For initial load, just set position without animation
    if (navSlider) {
        navSlider.style.transition = 'none'; // Temporarily disable transition
        navSlider.style.opacity = '1';
        navSlider.style.transform = 'translateX(0)';
        navSlider.style.top = `${initialActiveItem.offsetTop}px`;
        navSlider.style.height = `${initialActiveItem.offsetHeight}px`;
        // Re-enable transition after a very short delay to allow layout to settle
        setTimeout(() => {
            navSlider.style.transition = 'top 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out, transform 0.2s ease-out';
        }, 10);
    }
    // Ensure home content is rendered if home is initially active
    if (initialActiveItem.id === 'homeNavLink') {
      // renderHomeContent(auth.currentUser ? auth.currentUser.uid : null); // Removed: now solely triggered by 'userAuthenticated' event
    }
  }

  // Listen for the custom event and render home content if on home page
  document.addEventListener('userAuthenticated', async (event) => { // Made async to await getUserProfile
    console.log('userAuthenticated event received. Path:', window.location.pathname, 'User ID:', event.detail.uid); // Log event reception

    // Only render home content if the user is currently on the home page
    if (window.location.pathname.endsWith('home.html')) {
      console.log('User authenticated event: On home.html, proceeding to render home content.');
      
      const homeContentDiv = document.getElementById('homeContent');
      if (homeContentDiv) {
        console.log('userAuthenticated: Found homeContentDiv. Current display:', homeContentDiv.style.display, 'classList:', homeContentDiv.classList);
        
        // Ensure homeContentDiv is visible and active on authentication
        homeContentDiv.style.display = 'block';
        homeContentDiv.classList.add('active');
        
        // Add fade-in class after a very small delay to ensure display:block is processed
        setTimeout(() => {
          homeContentDiv.classList.add('fade-in');
          console.log('userAuthenticated: Added fade-in class to homeContentDiv. New classList:', homeContentDiv.classList);
        }, 10);

        // Render home content (tasks, total progress etc.)
        console.log('userAuthenticated: Calling renderHomeContent for userId:', event.detail.uid);
        await renderHomeContent(event.detail.uid); // Pass the userId from the event
        console.log('userAuthenticated: renderHomeContent finished.');

      } else {
        console.warn('userAuthenticated: homeContentDiv not found!');
      }

      // Update the displayed username at the top
      const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
      if (currentUsernameDisplay && event.detail.uid) {
        console.log('userAuthenticated: Updating currentUsernameDisplay.');
        const { success, profile } = await getUserProfile(event.detail.uid); // Fetch profile
        if (success && profile && profile.username) {
          currentUsernameDisplay.textContent = profile.username; // Use saved username
        } else if (event.detail.email) {
          currentUsernameDisplay.textContent = event.detail.email; // Fallback to email
        }
      } else {
        console.warn('userAuthenticated: currentUsernameDisplay not found or no user ID.');
      }
    }
  });

  navItems.forEach(item => {
    item.addEventListener('click', async () => { // Made async to await Firebase calls
      // Prevent default to avoid immediate page jump if hrefs were present
      // event.preventDefault(); // Uncomment if you add href to nav-items

      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove('active'));

      // Add active class to the clicked item
      item.classList.add('active');

      // Update slider position with the new animation sequence
      updateSliderPosition(item);

      // Update main content based on clicked item
      const homeContentDiv = document.getElementById('homeContent');
      const profileContentDiv = document.getElementById('profileContent');
      const createTaskModal = document.getElementById('createTaskModal');

      // Hide all content sections first // Removed: now handled by showContentSection
      // document.querySelectorAll('.content-section').forEach(section => {
      //   section.style.display = 'none';
      //   section.classList.remove('active');
      // });

      if (mainContent) {
        switch (item.id) {
          case 'homeNavLink':
            showContentSection(homeContentDiv);
            // renderHomeContent(auth.currentUser ? auth.currentUser.uid : null); // Removed: now solely triggered by 'userAuthenticated' event
            break;
          case 'createNavLink':
            showContentSection(createTaskModal); // Show modal instead of other content
            createTaskModal.style.display = 'flex'; // Ensure it's flex for modal display
            break;
          case 'profileNavLink':
            showContentSection(profileContentDiv);
            profileContentDiv.innerHTML = profilePageHtml; // Render profile content directly into its container
            
            const profileLoadingSpinner = document.getElementById('profileLoadingSpinner');
            if (profileLoadingSpinner) {
              profileLoadingSpinner.style.display = 'flex'; // Show spinner
            }

            // Setup listeners for dynamically loaded profile content
            setupProfilePageLogoutButton();
            setupThemeToggle(); // Setup theme toggle for the new content

            // Fetch and display user profile data
            const currentUser = auth.currentUser;
            if (currentUser) {
              // Check and grant achievements before fetching and displaying profile
              await checkAndGrantAchievements(currentUser.uid, currentUser.email);

              // Populate the email field immediately if currentUser exists
              const profileEmailInput = document.getElementById('profileEmail');
              if (profileEmailInput && currentUser.email) {
                profileEmailInput.value = currentUser.email;
              }

              const { success, profile } = await getUserProfile(currentUser.uid);
              console.log('Profile fetch result:', { success, profile }); // Debugging: log profile data
              if (success && profile) {
                const displayedUsername = document.getElementById('displayedUsername');
                const profileUsernameInput = document.getElementById('profileUsername');
                console.log('Fetched username:', profile.username); // Debugging: log fetched username
                if (displayedUsername) {
                  displayedUsername.textContent = profile.username || currentUser.email; // Display saved username or email
                }
                if (profileUsernameInput) {
                  profileUsernameInput.value = profile.username || currentUser.email; // Set input field value
                }
                // Render achievements
                renderAchievements(profile.achievements, 'achievementsGrid');

              } else if (currentUser.email) {
                // If no profile found, but user is logged in, display email in input
                const displayedUsername = document.getElementById('displayedUsername');
                const profileUsernameInput = document.getElementById('profileUsername');
                console.log('Using email as fallback:', currentUser.email); // Debugging: log fallback email
                if (displayedUsername) {
                  displayedUsername.textContent = currentUser.email;
                }
                if (profileUsernameInput) {
                  profileUsernameInput.value = currentUser.email;
                }
                // Render empty achievements if no profile
                renderAchievements([], 'achievementsGrid');
              }
            }
            // Show spinner for minimum 0.5s and maximum 3s
            const minimumSpinnerDisplayTime = 500; // 0.5 seconds minimum
            const maximumSpinnerDisplayTime = 3000; // 3 seconds maximum
            const startTime = Date.now();

            const hideSpinner = () => {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.min(
                    Math.max(minimumSpinnerDisplayTime - elapsedTime, 0), // Ensure minimum time
                    maximumSpinnerDisplayTime - elapsedTime // Ensure maximum time
                );

                if (remainingTime > 0) {
                    setTimeout(() => {
                        if (profileLoadingSpinner) {
                            profileLoadingSpinner.style.display = 'none';
                        }
                    }, remainingTime);
                } else {
                    if (profileLoadingSpinner) {
                        profileLoadingSpinner.style.display = 'none';
                    }
                }
            };
            hideSpinner();

            // Attach event listener for Save Changes button on profile page
            const saveChangesBtn = document.getElementById('saveChangesBtn');
            if (saveChangesBtn) {
              saveChangesBtn.addEventListener('click', async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                  const usernameInput = document.getElementById('profileUsername');
                  const newUsername = usernameInput ? usernameInput.value : currentUser.email;
                  console.log('Attempting to save username:', newUsername); // Debugging: log username being saved

                  // Fetch existing profile to preserve other fields
                  const { success: fetchExistingSuccess, profile: existingProfile } = await getUserProfile(currentUser.uid);
                  let profilePictureToSave = "";
                  let achievementsToSave = [];
                  let themeSettingToSave = false; // Default to false (light mode)

                  if (fetchExistingSuccess && existingProfile) {
                    profilePictureToSave = existingProfile.profilePicture || "";
                    achievementsToSave = existingProfile.achievements || [];
                    // Use the theme setting from the existing profile as a base
                    themeSettingToSave = existingProfile.themeSetting || false; 
                  }

                  // Override themeSettingToSave with the current UI state of the theme toggle
                  const themeToggleElement = document.getElementById('themeToggle');
                  if (themeToggleElement && themeToggleElement.classList.contains('dark-mode')) { // Assuming 'dark-mode' class indicates dark theme
                    themeSettingToSave = true;
                  } else if (themeToggleElement && themeToggleElement.classList.contains('light-mode')) { // Assuming 'light-mode' class indicates light theme
                    themeSettingToSave = false;
                  } else if (document.body.classList.contains('dark-mode')) { // Fallback check on body if toggle doesn't have it
                      themeSettingToSave = true;
                  } else if (document.body.classList.contains('light-mode')) { // Fallback check on body if toggle doesn't have it
                      themeSettingToSave = false;
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { // Fallback to system preference
                      // This is a last resort, if no explicit theme is set by the toggle
                      themeSettingToSave = true; 
                  }

                  const { success } = await createUserProfile(
                    currentUser.uid,
                    newUsername,
                    achievementsToSave,
                    themeSettingToSave,
                    profilePictureToSave
                  );

                  if (success) {
                    alert('Profile changes saved successfully!');
                    // Re-fetch and display updated username and achievements after save
                    const { success: reFetchSuccess, profile: reFetchedProfile } = await getUserProfile(currentUser.uid);
                    console.log('Profile re-fetch result after save:', { reFetchSuccess, reFetchedProfile }); // Debugging: log re-fetched profile
                    if (reFetchSuccess && reFetchedProfile) {
                      const displayedUsername = document.getElementById('displayedUsername');
                      const profileUsernameInput = document.getElementById('profileUsername');
                      if (displayedUsername) {
                        displayedUsername.textContent = reFetchedProfile.username || currentUser.email;
                      }
                      if (profileUsernameInput) {
                        profileUsernameInput.value = reFetchedProfile.username || currentUser.email;
                      }
                      // After saving, re-check and re-render achievements
                      await checkAndGrantAchievements(currentUser.uid, currentUser.email); // Re-check for username change achievement
                      const { success: finalFetchSuccess, profile: finalFetchedProfile } = await getUserProfile(currentUser.uid);
                      if (finalFetchSuccess && finalFetchedProfile) {
                        renderAchievements(finalFetchedProfile.achievements, 'achievementsGrid');
                      }
                    }
                  } else {
                    alert('Failed to save profile changes. Please try again.');
                  }
                } else {
                  alert('You must be logged in to save profile changes.');
                }
              });
            }
            break;
          default:
            // Do nothing or handle other cases
            break;
        }
      }
    });
  });

  // Handle task saving logic
  async function handleSaveTask() {
    const taskName = document.getElementById('taskNameInput').value;
    const totalHours = parseFloat(document.getElementById('hoursToCompleteInput').value);
    const frequency = document.getElementById('goalTypeSelect').value;

    if (!taskName || isNaN(totalHours) || totalHours <= 0) {
      alert('Please fill in all task details correctly.');
      return;
    }

    const taskColor = taskColorPalette[currentTaskColorIndex];
    currentTaskColorIndex = (currentTaskColorIndex + 1) % taskColorPalette.length;

    const currentUser = auth.currentUser; // Get current user at the beginning of the function
    console.log('handleSaveTask - currentUser:', currentUser ? currentUser.uid : 'null');
    if (currentUser) {
      // Increment task counter and get the new count
      const { success: counterSuccess, newCount } = await incrementTaskCounter(currentUser.uid);
      if (!counterSuccess) {
        console.error('Failed to increment task counter.');
        alert('Failed to save task due to counter error. Please try again.');
        return;
      }

      const displayId = `${currentUser.uid.substring(0, 5)}-${taskName.replace(/\s/g, '').substring(0, 5)}-${newCount}`;

      const taskData = {
        taskName,
        totalHours,
        frequency,
        taskColor,
        currentProgress: 0, // Initialize current progress to 0
        createdAt: new Date().toISOString(),
        displayId, // Add the generated display ID to task data
      };

      const { success } = await addTask(currentUser.uid, taskData);
      if (success) {
        alert('Task saved successfully!');
        // Clear form fields
        document.getElementById('taskNameInput').value = '';
        document.getElementById('hoursToCompleteInput').value = '';
        document.getElementById('goalTypeSelect').value = 'weekly'; // Reset to weekly

        // Hide the modal after successful save
        if (createTaskModal) {
          createTaskModal.style.display = 'none';
        }

        // Ensure Home content div is visible and active BEFORE rendering tasks
        showContentSection(homeContentDiv);

        // Refresh tasks on the home page after successful save
        renderHomeContent(currentUser.uid); // Re-enabled: refresh tasks after save

        // Ensure Home tab is active and slider is updated
        navItems.forEach(nav => nav.classList.remove('active'));
        homeNavLink.classList.add('active');
        updateSliderPosition(homeNavLink);

      } else {
        alert('Failed to save task. Please try again.');
      }
    } else {
      alert('You must be logged in to save a task.');
    }
  }

  // Handle task editing logic
  async function handleEditTask() {
    const taskId = document.getElementById('editTaskId').value;
    const taskName = document.getElementById('editTaskNameInput').value;
    const totalHours = parseFloat(document.getElementById('editHoursToCompleteInput').value);
    const currentHours = parseFloat(document.getElementById('editCurrentHoursInput').value);
    const frequency = document.getElementById('editGoalTypeSelect').value;

    if (!taskId || !taskName || isNaN(totalHours) || totalHours <= 0 || isNaN(currentHours) || currentHours < 0) {
      alert('Please fill in all task details correctly, including current hours.');
      return;
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      const updatedData = {
        taskName,
        totalHours,
        currentProgress: currentHours, // Update current progress
        frequency,
      };

      const { success } = await updateTask(currentUser.uid, taskId, updatedData);
      if (success) {
        alert('Task updated successfully!');
        // Hide the modal
        editTaskModal.style.display = 'none';
        // Refresh tasks on the home page
        showContentSection(homeContentDiv);
        renderHomeContent(currentUser.uid);

        // Ensure Home tab is active and slider is updated
        navItems.forEach(nav => nav.classList.remove('active'));
        homeNavLink.classList.add('active');
        updateSliderPosition(homeNavLink);
      } else {
        alert('Failed to update task. Please try again.');
      }
    } else {
      alert('You must be logged in to edit a task.');
    }
  }

  // Initial call to render home content when the page loads, if home is the default active tab
  // This ensures tasks are loaded on initial page access.
  // renderHomeContent(); // Removed to prevent duplicate renders on page load

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
      const { success, error } = await incrementTaskProgress(auth.currentUser.uid, currentTimerTaskId, hoursToAdd);
      if (success) {
        console.log(`Successfully saved ${hoursToAdd.toFixed(2)} hours to task ${currentTimerTaskId}`);
        // Refresh home content to show updated progress only after successful save
        renderHomeContent(auth.currentUser.uid);
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
}); 