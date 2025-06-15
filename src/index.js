// General JS logic for the app

import { setupFirebaseAuthListenersAndHandlers, signOut, auth, setupProfilePageLogoutButton } from "./firebaseAuth";
import { HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL } from "./firebaseConfig";
import { addTask, getTasks, deleteTask, getTotalProgress, incrementTaskCounter, updateTask } from "./firebaseStore";
// import { db, collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp } from "./firebaseStore"; // Uncomment if you add Firestore logic here

const profilePageHtml = `
  <div class="profile-content-grid">
    <!-- Left Card: Profile Picture & Username -->
    <div class="profile-card profile-user-info">
      <div class="profile-avatar-large">
        <img id="profilePicture" src="https://via.placeholder.com/150" alt="Profile Avatar" />
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

      <h4 class="profile-section-title" style="margin-top: 1.5rem;">Achievements</h4>
      <div class="achievements-grid" id="achievementsGrid">
        <!-- Achievement Item Example -->
        <div class="achievement-item">
          <img src="https://via.placeholder.com/40" alt="Icon" class="achievement-icon" />
          <span>First Milestone</span>
        </div>
        <div class="achievement-item">
          <img src="https://via.placeholder.com/40" alt="Icon" class="achievement-icon" />
          <span>Top Collaborator</span>
        </div>
        <div class="achievement-item">
          <img src="https://via.placeholder.com/40" alt="Icon" class="achievement-icon" />
          <span>100 Hours Logged</span>
        </div>
        <!-- More achievements can be added here -->
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

document.addEventListener('DOMContentLoaded', () => {
  const getStartedBtn = document.getElementById('getStarted');

  // Get Started button logic (from startup.html)
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      window.location.href = AUTH_PAGE_URL;
    });
  }

  // Call the function to set up all Firebase Auth listeners and handlers
  setupFirebaseAuthListenersAndHandlers();

  // Get references to content divs
  const homeContentDiv = document.getElementById('homeContent');
  const profileContentDiv = document.getElementById('profileContent');
  const createTaskModal = document.getElementById('createTaskModal');
  const editTaskModal = document.getElementById('editTaskModal'); // Get reference to the edit modal

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
  const mainContent = document.querySelector('.main-content');
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
              section.style.display = 'none'; // Hide all by default
              section.classList.remove('active');
          }
      });

      if (sectionToShow) {
          sectionToShow.style.display = 'block'; // Show the desired one
          sectionToShow.classList.add('active');
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
                const currentProgressPercentage = task.totalHours > 0 ? ((task.currentProgress || 0) / task.totalHours * 100).toFixed(0) : 0;
                const taskCardHtml = `
                  <div class="card task">
                    <div class="task-header">
                      <div class="task-left">
                        <div class="task-icon-wrapper" style="background-color: ${task.taskColor};">
                          <img src="../assets/timer.png" alt="Timer Icon" />
                        </div>
                        <span>${task.taskName} - <strong>${currentProgressPercentage}%</strong></span> <!-- Initial progress 0% -->
                      </div>
                      <span class="time">${task.displayId || ''} | ${task.currentProgress || 0} Hours / ${task.totalHours} Hours</span>
                      <button class="edit-task-btn" data-task-id="${task.id}">Edit</button>
                      <button class="delete-task-btn delete-task-text-btn" data-task-id="${task.id}">Delete</button>
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
  document.addEventListener('userAuthenticated', (event) => {
    // Only render home content if the user is currently on the home page
    if (window.location.pathname.endsWith('home.html')) {
      console.log('User authenticated event received. Rendering home content.');
      renderHomeContent(event.detail.uid); // Pass the userId from the event

      // Ensure home content div is visible and active on authentication
      const homeContentDiv = document.getElementById('homeContent');
      if (homeContentDiv) {
        homeContentDiv.style.display = 'block';
        homeContentDiv.classList.add('active');
      }

      // Update the displayed username
      const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
      if (currentUsernameDisplay && event.detail.email) {
        currentUsernameDisplay.textContent = event.detail.email; // Use email as username
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
            // Setup listeners for dynamically loaded profile content
            setupProfilePageLogoutButton();
            setupThemeToggle(); // Setup theme toggle for the new content
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
        showContentSection(homeContentDiv); // Show home content when closing edit modal
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
}); 