// General JS logic for the app

import { setupFirebaseAuthListenersAndHandlers, signOut, auth, setupProfilePageLogoutButton } from "./firebaseAuth";
import { HOME_PAGE_URL, STARTUP_PAGE_URL, AUTH_PAGE_URL } from "./firebaseConfig";
import { addTask, getTasks, deleteTask, getTotalProgress, incrementTaskCounter } from "./firebaseStore";
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

const createModalHtml = `
  <div id="createTaskModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create</h2>
        <button class="modal-close-btn" id="createModalCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label for="taskName">Name of task</label>
          <input type="text" id="taskNameInput" placeholder="e.g., LeetCode, PyTorch project" />
        </div>
        <div class="modal-field">
          <label for="hoursToComplete">Hours to Be Completed</label>
          <input type="number" id="hoursToCompleteInput" placeholder="e.g., 10.5" step="0.5" />
        </div>
        <div class="modal-field">
          <label for="goalType">Goal Type</label>
          <select id="goalTypeSelect">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-save-btn" id="createTaskSaveBtn">Save Task</button>
      </div>
    </div>
  </div>
`;

// Define the color palette based on the provided image (outer colors)
const taskColorPalette = [
  "#ffb6c1", // Pink
  "#8d6e63", // Brown
  "#ffeb3b", // Yellow
  "#ffa726", // Orange
  "#90ee90", // Green
  "#64b5f6", // Light Blue
  "#9370db", // Purple
  "#78909c"  // Grey
];
let currentTaskColorIndex = 0;

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

  // Sidebar navigation logic for sliding background
  const navItems = document.querySelectorAll('.nav-item');
  const navSlider = document.querySelector('.nav-slider');
  const mainContent = document.querySelector('.main-content');
  const homeNavLink = document.getElementById('homeNavLink');
  const createNavLink = document.getElementById('createNavLink');
  const profileNavLink = document.getElementById('profileNavLink');

  // Store initial home content - this will now be the template for dynamic rendering
  const homeContentTemplate = document.getElementById('tasksDisplayArea').innerHTML;

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
  async function renderHomeContent() {
    if (mainContent) {
      const tasksDisplayArea = document.getElementById('tasksDisplayArea');
      const totalProgressDisplay = document.querySelector('.weekly-progress .progress-bar');
      const totalProgressLabel = document.querySelector('.weekly-progress strong');

      if (tasksDisplayArea && totalProgressDisplay && totalProgressLabel) {
        tasksDisplayArea.innerHTML = ''; // Clear existing tasks
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Fetch and display Total Progress
          const { success: progressSuccess, totalProgress } = await getTotalProgress(currentUser.uid);
          if (progressSuccess) {
            totalProgressLabel.textContent = `Total Progress - ${totalProgress}%`;
            totalProgressDisplay.style.setProperty('--progress-percentage', `${totalProgress}%`);
          } else {
            console.error('Failed to fetch total progress.');
            totalProgressLabel.textContent = 'Total Progress - Error';
            totalProgressDisplay.style.setProperty('--progress-percentage', '0%');
          }

          // Fetch and display individual tasks
          const { success, tasks } = await getTasks(currentUser.uid);
          if (success) {
            if (tasks.length === 0) {
              tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No tasks yet. Create one!</p>';
            } else {
              tasks.forEach(task => {
                const taskCardHtml = `
                  <div class="card task">
                    <div class="task-header">
                      <div class="task-left">
                        <div class="task-icon-wrapper" style="background-color: ${task.taskColor};">
                          <img src="../assets/timer.png" alt="Timer Icon" />
                        </div>
                        <span>${task.taskName} - <strong>0%</strong></span> <!-- Initial progress 0% -->
                      </div>
                      <span class="time">${task.displayId || ''} | 0 Hours / ${task.totalHours} Hours</span>
                      <button class="delete-task-btn delete-task-text-btn" data-task-id="${task.id}">Delete</button>
                    </div>
                    <div class="progress-bar" style="background-color: ${task.taskColor};"></div>
                  </div>
                `;
                tasksDisplayArea.insertAdjacentHTML('beforeend', taskCardHtml);
              });
              // Attach event listeners to delete buttons after tasks are rendered
              document.querySelectorAll('.delete-task-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                  const taskId = event.currentTarget.dataset.taskId;
                  const currentUser = auth.currentUser;
                  if (currentUser && taskId) {
                    const { success } = await deleteTask(currentUser.uid, taskId);
                    if (success) {
                      console.log('Task deleted successfully from UI.');
                      renderHomeContent(); // Re-render tasks after deletion
                    } else {
                      console.error('Failed to delete task from Firebase.');
                    }
                  }
                });
              });
            }
          } else {
            tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Error loading tasks.</p>';
            console.error('Failed to fetch tasks:', tasks.error);
          }
        } else {
          tasksDisplayArea.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Please log in to view tasks.</p>';
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
      renderHomeContent();
    }
  }

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

      // Hide all content sections first
      document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
      });

      if (mainContent) {
        switch (item.id) {
          case 'homeNavLink':
            homeContentDiv.style.display = 'block';
            homeContentDiv.classList.add('active');
            renderHomeContent();
            break;
          case 'createNavLink':
            // Append and display the modal
            if (!document.getElementById('createTaskModal')) {
              document.body.insertAdjacentHTML('beforeend', createModalHtml);
            }
            document.getElementById('createTaskModal').style.display = 'flex';
            
            // Setup close button listener (top right X button)
            document.getElementById('createModalCloseBtn').addEventListener('click', () => {
                document.getElementById('createTaskModal').style.display = 'none';
                renderHomeContent(); // Ensure home content is visible after modal closes

                // Reset navigation state to Home
                navItems.forEach(nav => nav.classList.remove('active'));
                homeNavLink.classList.add('active');
                updateSliderPosition(homeNavLink);
            });

            const saveTaskBtn = document.getElementById('createTaskSaveBtn'); // Corrected ID for modal's save button
            if (saveTaskBtn) {
              // Remove previous listener to prevent multiple bindings
              saveTaskBtn.removeEventListener('click', handleSaveTask);
              saveTaskBtn.addEventListener('click', handleSaveTask);
            }
            break;
          case 'profileNavLink':
            profileContentDiv.style.display = 'block';
            profileContentDiv.classList.add('active');
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

    const currentUser = auth.currentUser;
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

        // Automatically switch to Home tab and display tasks
        const homeNavLink = document.getElementById('homeNavLink');
        if (homeNavLink) {
            homeNavLink.click(); // Simulate click to trigger navigation and re-render
        }
      } else {
        alert('Failed to save task. Please try again.');
      }
    } else {
      alert('You must be logged in to save a task.');
    }
  }

  // Initial call to render home content when the page loads, if home is the default active tab
  // This ensures tasks are loaded on initial page access.
  renderHomeContent();

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