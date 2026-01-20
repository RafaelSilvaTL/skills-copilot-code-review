document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // Announcement management elements
  const manageAnnouncementsButton = document.getElementById("manage-announcements-button");
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsModal = document.querySelector(".close-announcements-modal");
  const announcementForm = document.getElementById("announcement-form");
  const announcementsList = document.getElementById("announcements-list");
  const announcementManagementMessage = document.getElementById("announcement-management-message");
  const announcementContainer = document.getElementById("announcement-container");
  const editingAnnouncementId = document.getElementById("editing-announcement-id");
  const cancelEditButton = document.getElementById("cancel-edit-button");
  const submitAnnouncementButton = document.getElementById("submit-announcement-button");
  const formTitle = document.getElementById("form-title");

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#f3e5f5", textColor: "#7b1fa2" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  // State for activities and filters
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";

  // Authentication state
  let currentUser = null;

  // Time range mappings for the dropdown
  const timeRanges = {
    morning: { start: "06:00", end: "08:00" }, // Before school hours
    afternoon: { start: "15:00", end: "18:00" }, // After school hours
    weekend: { days: ["Saturday", "Sunday"] }, // Weekend days
  };

  // Initialize filters from active elements
  function initializeFilters() {
    // Initialize day filter
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    // Initialize time filter
    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  // Function to set day filter
  function setDayFilter(day) {
    currentDay = day;

    // Update active class
    dayFilters.forEach((btn) => {
      if (btn.dataset.day === day) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Function to set time range filter
  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;

    // Update active class
    timeFilters.forEach((btn) => {
      if (btn.dataset.time === timeRange) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Check if user is already logged in (from localStorage)
  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        // Verify the stored user with the server
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout(); // Clear invalid data
      }
    }

    // Set authentication class on body
    updateAuthBodyClass();
  }

  // Validate user session with the server
  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        // Session invalid, log out
        logout();
        return;
      }

      // Session is valid, update user data
      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  // Update UI based on authentication state
  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
    }

    updateAuthBodyClass();
    updateAnnouncementManagementUI();
    // Refresh the activities to update the UI
    fetchActivities();
  }

  // Update body class for CSS targeting
  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  // Login function
  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(
          data.detail || "Invalid username or password",
          "error"
        );
        return false;
      }

      // Login successful
      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  // Logout function
  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  // Show message in login modal
  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  // Open login modal
  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  // Close login modal
  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  // Event listeners for authentication
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  // Close login modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  // Show loading skeletons
  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    // Create more skeleton cards to fill the screen since they're smaller now
    for (let i = 0; i < 9; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  // Format schedule for display - handles both old and new format
  function formatSchedule(details) {
    // If schedule_details is available, use the structured data
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      // Convert 24h time format to 12h AM/PM format for display
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes
          .toString()
          .padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    // Fallback to the string format if schedule_details isn't available
    return details.schedule;
  }

  // Function to determine activity type (this would ideally come from backend)
  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    } else if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    } else if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    } else if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    } else if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    // Default to "academic" if no match
    return "academic";
  }

  // Function to fetch activities from API with optional day and time filters
  async function fetchActivities() {
    // Show loading skeletons first
    showLoadingSkeletons();

    try {
      // Build query string with filters if they exist
      let queryParams = [];

      // Handle day filter
      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      // Handle time range filter
      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];

        // Handle weekend special case
        if (currentTimeRange === "weekend") {
          // Don't add time parameters for weekend filter
          // Weekend filtering will be handled on the client side
        } else if (range) {
          // Add time parameters for before/after school
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      // Save the activities data
      allActivities = activities;

      // Apply search and filter, and handle weekend filter in client
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to display filtered activities
  function displayFilteredActivities() {
    // Clear the activities list
    activitiesList.innerHTML = "";

    // Apply client-side filtering - this handles category filter and search, plus weekend filter
    let filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      // Apply category filter
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      // Apply weekend filter if selected
      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      // Apply search filter
      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (
        searchQuery &&
        !searchableContent.includes(searchQuery.toLowerCase())
      ) {
        return;
      }

      // Activity passed all filters, add to filtered list
      filteredActivities[name] = details;
    });

    // Check if there are any results
    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    // Display filtered activities
    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  // Function to render a single activity card
  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    // Calculate spots and capacity
    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    // Determine capacity status class
    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    // Determine activity type
    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];

    // Format the schedule using the new helper function
    const formattedSchedule = formatSchedule(details);

    // Create activity tag
    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    // Create capacity indicator
    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    // Add click handlers for delete buttons
    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Add click handler for register button (only when authenticated)
    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  // Event listeners for search and filter
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  // Add event listeners to category filter buttons
  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current filter and display filtered activities
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  // Add event listeners to day filter buttons
  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current day filter and fetch activities
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  // Add event listeners for time filter buttons
  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current time filter and fetch activities
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  // Open registration modal
  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    // Add slight delay to trigger animation
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  // Close registration modal
  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  // Event listener for close button
  closeRegistrationModal.addEventListener(
    "click",
    closeRegistrationModalHandler
  );

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
  });

  // Create and show confirmation dialog
  function showConfirmationDialog(message, confirmCallback) {
    // Create the confirmation dialog if it doesn't exist
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      // Style the buttons
      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");

      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";

      confirmBtn.style.backgroundColor = "#dc3545";
      confirmBtn.style.color = "white";
    }

    // Set the message
    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    // Show the dialog
    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    // Handle button clicks
    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    // Remove any existing event listeners
    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listeners
    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    // Close when clicking outside
    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  // Handle unregistration with confirmation
  async function handleUnregister(event) {
    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to unregister students.",
        "error"
      );
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    // Show confirmation dialog
    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(
              activity
            )}/unregister?email=${encodeURIComponent(
              email
            )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            {
              method: "POST",
            }
          );

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            // Refresh the activities list
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to register students.",
        "error"
      );
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        // Refresh the activities list after successful signup
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Expose filter functions to window for future UI control
  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  // ============ Announcement Management Functions ============
  
  // Update UI to show/hide manage button based on auth
  function updateAnnouncementManagementUI() {
    console.log("updateAnnouncementManagementUI called, currentUser:", currentUser);
    console.log("manageAnnouncementsButton:", manageAnnouncementsButton);
    if (!manageAnnouncementsButton) {
      console.error("Manage announcements button not found in updateAnnouncementManagementUI!");
      return;
    }
    if (currentUser) {
      manageAnnouncementsButton.classList.remove("hidden");
    } else {
      manageAnnouncementsButton.classList.add("hidden");
    }
  }

  // Fetch and display active announcements (public)
  async function fetchActiveAnnouncements() {
    try {
      const response = await fetch("/announcements/active");
      
      if (!response.ok) {
        console.error("Failed to fetch announcements");
        return;
      }

      const announcements = await response.json();
      displayActiveAnnouncements(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }

  // Display active announcements in the banner
  function displayActiveAnnouncements(announcements) {
    announcementContainer.innerHTML = "";
    
    if (announcements.length === 0) {
      return;
    }

    announcements.forEach(announcement => {
      const banner = document.createElement("div");
      banner.className = "announcement-banner";
      banner.textContent = announcement.message;
      announcementContainer.appendChild(banner);
    });
  }

  // Fetch all announcements for management (authenticated)
  async function fetchAllAnnouncements() {
    if (!currentUser) {
      return;
    }

    try {
      const response = await fetch(
        `/announcements?username=${encodeURIComponent(currentUser.username)}`
      );

      if (!response.ok) {
        showAnnouncementMessage("Failed to load announcements", "error");
        return;
      }

      const announcements = await response.json();
      displayAnnouncementsForManagement(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      showAnnouncementMessage("Error loading announcements", "error");
    }
  }

  // Display announcements in the management modal
  function displayAnnouncementsForManagement(announcements) {
    if (announcements.length === 0) {
      announcementsList.innerHTML = '<p class="no-items">No announcements found.</p>';
      return;
    }

    announcementsList.innerHTML = "";

    announcements.forEach(announcement => {
      const item = document.createElement("div");
      item.className = "announcement-item";

      const now = new Date();
      const expirationDate = new Date(announcement.expiration_date);
      const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
      
      let statusClass = "";
      let statusText = "";
      
      if (expirationDate < now) {
        statusClass = "expired";
        statusText = "Expired";
      } else if (startDate && startDate > now) {
        statusClass = "scheduled";
        statusText = "Scheduled";
      } else {
        statusClass = "active";
        statusText = "Active";
      }

      const messagePreview = announcement.message.length > 100 
        ? announcement.message.substring(0, 100) + "..." 
        : announcement.message;

      item.innerHTML = `
        <div class="announcement-content">
          <div class="announcement-message">${messagePreview}</div>
          <div class="announcement-dates">
            ${startDate ? `<span>Start: ${formatDateTime(announcement.start_date)}</span>` : ""}
            <span>Expires: ${formatDateTime(announcement.expiration_date)}</span>
          </div>
          <span class="announcement-status ${statusClass}">${statusText}</span>
        </div>
        <div class="announcement-actions">
          <button class="edit-announcement-btn" data-id="${announcement._id}">Edit</button>
          <button class="delete-announcement-btn" data-id="${announcement._id}">Delete</button>
        </div>
      `;

      announcementsList.appendChild(item);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll(".edit-announcement-btn").forEach(btn => {
      btn.addEventListener("click", () => editAnnouncement(btn.dataset.id));
    });

    document.querySelectorAll(".delete-announcement-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteAnnouncement(btn.dataset.id));
    });
  }

  // Format date-time for display
  function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format date-time for input field
  function formatDateTimeForInput(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Show announcement management message
  function showAnnouncementMessage(text, type) {
    announcementManagementMessage.textContent = text;
    announcementManagementMessage.className = `message ${type}`;
    announcementManagementMessage.classList.remove("hidden");

    setTimeout(() => {
      announcementManagementMessage.classList.add("hidden");
    }, 5000);
  }

  // Create or update announcement
  async function submitAnnouncement(event) {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementMessage("You must be logged in", "error");
      return;
    }

    const message = document.getElementById("announcement-message").value;
    const startDate = document.getElementById("announcement-start-date").value;
    const expirationDate = document.getElementById("announcement-expiration-date").value;
    const announcementId = editingAnnouncementId.value;

    if (!expirationDate) {
      showAnnouncementMessage("Expiration date is required", "error");
      return;
    }

    const announcementData = {
      message: message,
      start_date: startDate || null,
      expiration_date: new Date(expirationDate).toISOString(),
      created_by: currentUser.username
    };

    try {
      let response;
      
      if (announcementId) {
        // Update existing announcement
        response = await fetch(
          `/announcements/${announcementId}?username=${encodeURIComponent(currentUser.username)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: announcementData.message,
              start_date: announcementData.start_date,
              expiration_date: announcementData.expiration_date
            })
          }
        );
      } else {
        // Create new announcement
        response = await fetch("/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(announcementData)
        });
      }

      if (response.ok) {
        showAnnouncementMessage(
          announcementId ? "Announcement updated successfully" : "Announcement created successfully",
          "success"
        );
        announcementForm.reset();
        editingAnnouncementId.value = "";
        cancelEditButton.classList.add("hidden");
        submitAnnouncementButton.textContent = "Add Announcement";
        formTitle.textContent = "Add New Announcement";
        fetchAllAnnouncements();
        fetchActiveAnnouncements(); // Refresh active announcements
      } else {
        let msg = "Failed to save announcement";
        try {
          const error = await response.json();
          msg = error.detail || msg;
        } catch (e) {
          try {
            const text = await response.text();
            if (text) msg = text;
          } catch (_) {}
        }
        showAnnouncementMessage(msg, "error");
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementMessage("Error saving announcement", "error");
    }
  }

  // Edit announcement
  async function editAnnouncement(announcementId) {
    try {
      const response = await fetch(
        `/announcements?username=${encodeURIComponent(currentUser.username)}`
      );

      if (!response.ok) {
        showAnnouncementMessage("Failed to load announcement", "error");
        return;
      }

      const announcements = await response.json();
      const announcement = announcements.find(a => a._id === announcementId);

      if (!announcement) {
        showAnnouncementMessage("Announcement not found", "error");
        return;
      }

      // Populate form
      document.getElementById("announcement-message").value = announcement.message;
      document.getElementById("announcement-start-date").value = 
        formatDateTimeForInput(announcement.start_date);
      document.getElementById("announcement-expiration-date").value = 
        formatDateTimeForInput(announcement.expiration_date);
      
      editingAnnouncementId.value = announcementId;
      cancelEditButton.classList.remove("hidden");
      submitAnnouncementButton.textContent = "Update Announcement";
      formTitle.textContent = "Edit Announcement";

      // Scroll to form
      document.querySelector(".announcement-form-section").scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    } catch (error) {
      console.error("Error loading announcement:", error);
      showAnnouncementMessage("Error loading announcement", "error");
    }
  }

  // Cancel edit
  function cancelEdit() {
    announcementForm.reset();
    editingAnnouncementId.value = "";
    cancelEditButton.classList.add("hidden");
    submitAnnouncementButton.textContent = "Add Announcement";
    formTitle.textContent = "Add New Announcement";
  }

  // Delete announcement
  async function deleteAnnouncement(announcementId) {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      const response = await fetch(
        `/announcements/${announcementId}?username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "DELETE"
        }
      );

      if (response.ok) {
        showAnnouncementMessage("Announcement deleted successfully", "success");
        fetchAllAnnouncements();
        fetchActiveAnnouncements(); // Refresh active announcements
      } else {
        const error = await response.json();
        showAnnouncementMessage(error.detail || "Failed to delete announcement", "error");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showAnnouncementMessage("Error deleting announcement", "error");
    }
  }

  // Open announcements modal
  function openAnnouncementsModal() {
    console.log("Opening announcements modal...");
    console.log("announcementsModal:", announcementsModal);
    if (!announcementsModal) {
      console.error("Announcements modal not found!");
      return;
    }
    announcementsModal.classList.remove("hidden");
    announcementsModal.classList.add("show");
    fetchAllAnnouncements();
  }

  // Close announcements modal
  function closeAnnouncementsModalHandler() {
    announcementsModal.classList.remove("show");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
      cancelEdit();
    }, 300);
  }

  // Event listeners for announcements management
  console.log("Setting up announcement event listeners...");
  console.log("manageAnnouncementsButton:", manageAnnouncementsButton);
  if (manageAnnouncementsButton) {
    console.log("Adding click listener to manage announcements button");
    manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  } else {
    console.warn("Manage announcements button not found!");
  }

  if (closeAnnouncementsModal) {
    closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);
  }

  if (announcementForm) {
    announcementForm.addEventListener("submit", submitAnnouncement);
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", cancelEdit);
  }

  // ============ End Announcement Management ============

  // Initialize app
  checkAuthentication();
  initializeFilters();
  fetchActivities();
  fetchActiveAnnouncements();
});
