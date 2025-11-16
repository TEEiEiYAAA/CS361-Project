// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    STUDENT_ACTIVITIES: '/students/{studentId}/activities',
    SUBMIT_ASSESSMENT: '/activities/{activityId}/assessment'
  }
};

// Global variables
let currentUser = null;
let currentActivity = null;
let activityId = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeAssessment();
});

// Initialize the assessment page
function initializeAssessment() {
  // ⭐️ 1. แก้ไข: ดึงข้อมูลจาก sessionStorage (AchieveHubUser)
  try {
      const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
      currentUser = sessionData.user || {};
      window.userToken = sessionData.token || ''; // เก็บ token ไว้ใช้
  } catch (e) {
      console.error("Error parsing session:", e);
      currentUser = {};
  }
  
  // ⭐️ 2. แก้ไข: เช็ค Login ให้ถูกต้อง
  if (!currentUser.userId && !currentUser.studentId) {
    alert('กรุณาเข้าสู่ระบบ');
    redirectToLogin();
    return;
  }
  
  // Get activity ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  activityId = urlParams.get('id');
  
  if (!activityId) {
    showStatusMessage('ไม่พบรหัสกิจกรรม', 'error');
    return;
  }
  
  // Load activity information
  loadActivityInfo();
  
  // Set up form submission
  document.getElementById('assessment-form').addEventListener('submit', handleFormSubmit);
}

// Redirect to login page
function redirectToLogin() {
  window.location.href = "login.html";
}

// Load activity information
async function loadActivityInfo() {
  try {
    const studentId = currentUser.studentId || currentUser.userId;
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.STUDENT_ACTIVITIES.replace('{studentId}', studentId);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // ⭐️ 3. แก้ไข: ใช้ token จากตัวแปรที่เราดึงมา
        'Authorization': `Bearer ${window.userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const activities = await response.json();
    
    // Find the specific activity
    currentActivity = activities.find(activity => activity.activityId === activityId);
    
    if (!currentActivity) {
      showStatusMessage('ไม่พบข้อมูลกิจกรรมที่ระบุ หรือคุณยังไม่ได้ลงทะเบียน', 'error');
      return;
    }
    
    // Check if assessment already completed
    if (currentActivity.surveyCompleted) {
      showCompletedMessage();
      return;
    }
    
    // Check if activity is confirmed
    if (!currentActivity.isConfirmed) {
      showStatusMessage('กรุณายืนยันการเข้าร่วมกิจกรรมก่อนทำแบบประเมิน', 'error');
      // ซ่อนฟอร์มด้วยถ้ายังไม่ได้ยืนยัน
      document.getElementById('assessment-form').style.display = 'none';
      return;
    }
    
    // Display activity information
    displayActivityInfo(currentActivity);
    
  } catch (error) {
    console.error('Error loading activity info:', error);
    showStatusMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลกิจกรรม', 'error');
  }
}

// Display activity information
function displayActivityInfo(activity) {
  document.getElementById('activity-name').textContent = activity.name || 'ไม่มีชื่อกิจกรรม';
  
  const formattedDate = formatDateTime(activity.startDateTime);
  const details = `
    📅 ${formattedDate}<br>
    📍 ${activity.location || 'ไม่ระบุสถานที่'}<br>
    🎯 ${activity.description || 'ไม่มีคำอธิบาย'}
  `;
  
  document.getElementById('activity-details').innerHTML = details;
}

// Show completed message
function showCompletedMessage() {
  const form = document.getElementById('assessment-form');
  form.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
      <h2 style="color: #4CAF50; margin-bottom: 1rem;">ทำแบบประเมินเรียบร้อยแล้ว</h2>
      <p style="color: #666; margin-bottom: 2rem;">ขอบคุณสำหรับการประเมินกิจกรรมในครั้งนี้</p>
      <a href="my-activities.html" class="submit-btn" style="text-decoration: none; display: inline-block;">
        กลับไปหน้ากิจกรรม
      </a>
    </div>
  `;
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('submit-btn');
  const originalBtnText = submitBtn.textContent;
  
  try {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner"></div>กำลังส่งแบบประเมิน...';
    showStatusMessage('กำลังส่งแบบประเมิน...', 'loading');
    
    // Collect form data
    const formData = new FormData(event.target);
    const assessmentData = {
      activityId: activityId,
      studentId: currentUser.studentId || currentUser.userId,
      overall_satisfaction: parseInt(formData.get('overall_satisfaction')),
      content_quality: parseInt(formData.get('content_quality')),
      instructor_quality: parseInt(formData.get('instructor_quality')),
      organization: parseInt(formData.get('organization')),
      recommendation: parseInt(formData.get('recommendation')),
      comments: formData.get('comments') || '',
      submittedAt: new Date().toISOString()
    };
    
    // Calculate average score
    assessmentData.average_score = (
      assessmentData.overall_satisfaction +
      assessmentData.content_quality +
      assessmentData.instructor_quality +
      assessmentData.organization +
      assessmentData.recommendation
    ) / 5;
    
    // Submit assessment
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.SUBMIT_ASSESSMENT.replace('{activityId}', activityId);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ⭐️ 4. แก้ไข: ใช้ token
        'Authorization': `Bearer ${window.userToken}`
      },
      body: JSON.stringify(assessmentData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showStatusMessage('ส่งแบบประเมินสำเร็จ! ขอบคุณสำหรับความคิดเห็น', 'success');
      
      // Redirect to my-activities page after 2 seconds
      setTimeout(() => {
        window.location.href = 'my-activities.html';
      }, 2000);
      
    } else {
      throw new Error(result.message || 'ไม่สามารถส่งแบบประเมินได้');
    }
    
  } catch (error) {
    console.error('Error submitting assessment:', error);
    showStatusMessage(error.message || 'เกิดข้อผิดพลาดในการส่งแบบประเมิน', 'error');
    
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

// Show status message
function showStatusMessage(message, type) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  
  // Remove existing classes
  statusElement.className = 'status-message';
  
  // Add type class
  if (type === 'success') {
    statusElement.classList.add('status-success');
  } else if (type === 'error') {
    statusElement.classList.add('status-error');
  } else if (type === 'loading') {
    statusElement.classList.add('status-loading');
  }
  
  // Auto hide after 5 seconds unless it's a success message
  if (type !== 'success') {
    setTimeout(() => {
      hideStatusMessage();
    }, 5000);
  }
}

// Hide status message
function hideStatusMessage() {
  const statusElement = document.getElementById('status-message');
  statusElement.style.display = 'none';
}

// Format date and time
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return 'ไม่ระบุเวลา';
  
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
}