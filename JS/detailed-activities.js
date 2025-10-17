// Configuration
    const CONFIG = {
      API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
      ENDPOINTS: {
        GET_ACTIVITY_DETAIL: '/activities/{activityId}',
        REGISTER_ACTIVITY: '/activities/register'
      }
    };
    
    // Global variables
    let currentActivity = null;
    let currentUser = null;
    
    // Initialize application
    document.addEventListener('DOMContentLoaded', function() {
      initializeApp();
    });
    
    // Initialize the application
    function initializeApp() {
      // Check login status
      currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if (!currentUser.studentId && !currentUser.userId) {
        window.location.href = "login.html";
        return;
      }
      
      // Get activity ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const activityId = urlParams.get('id');
      
      if (!activityId) {
        showError('ไม่พบรหัสกิจกรรมในลิงก์');
        return;
      }
      
      // Load activity details
      loadActivityDetail(activityId);
    }
    
    // Load activity details from API
    async function loadActivityDetail(activityId) {
      const mainContent = document.getElementById('main-content');
      
      try {
        // Show loading state
        mainContent.innerHTML = '<div class="loading">กำลังโหลดรายละเอียดกิจกรรม...</div>';
        
        // Build API URL
        const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITY_DETAIL.replace('{activityId}', activityId);
        
        // Make API request
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const activity = await response.json();
        
        console.log('Activity detail loaded:', activity);
        
        // Store activity globally
        currentActivity = activity;
        
        // Display activity details
        displayActivityDetail(activity);
        
      } catch (error) {
        console.error('Error loading activity detail:', error);
        showError(error.message, activityId);
      }
    }
    
    // Display activity details
    function displayActivityDetail(activity) {
      const mainContent = document.getElementById('main-content');
      
      // Format dates
      const startDate = formatDateTime(activity.startDateTime);
      const endDate = formatDateTime(activity.endDateTime);
      
      // Determine skill badge
      const skillCategory = activity.skill?.category || '';
      const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
      const skillDisplayName = skillCategory === 'soft skill' ? 'Soft Skill' : 
                               skillCategory === 'hard skill' ? 'Hard Skill' : 
                               'ทักษะทั่วไป';
      
      // Create image HTML
      const imageUrl = activity.imageUrl || null;
      const imageHtml = imageUrl ? 
        `<img src="${imageUrl}" alt="${activity.name}" class="skill-image">` : 
        `<div class="img-placeholder">🖼️</div>`;
      
      mainContent.innerHTML = `
        ${imageHtml}
        
        <h2 class="activity-name">${activity.name || 'ไม่มีชื่อกิจกรรม'}</h2>
        
        ${skillCategory ? `<div class="skill-badge ${skillBadgeClass}">${skillDisplayName}</div>` : ''}
        
        <p class="skill-detail">${activity.description || 'ไม่มีคำอธิบาย'}</p>
        
        <div class="activity-info">
          <h3>📅 รายละเอียดเวลา</h3>
          <p><strong>เริ่ม:</strong> ${startDate}</p>
          <p><strong>สิ้นสุด:</strong> ${endDate}</p>
          <p><strong>สถานที่:</strong> ${activity.location || 'ไม่ระบุสถานที่'}</p>
        </div>
        
        <div class="activity-info">
          <h3>🎯 ทักษะที่จะได้รับ</h3>
          <p><strong>ชื่อทักษะ:</strong> ${activity.skill?.name || 'ไม่ระบุทักษะ'}</p>
          <p><strong>คำอธิบาย:</strong> ${activity.skill?.description || 'ไม่มีคำอธิบาย'}</p>
          ${activity.skill?.subcategory ? `<p><strong>หมวดหมู่:</strong> ${activity.skill.subcategory}</p>` : ''}
          ${activity.skill?.yearLevel ? `<p><strong>เหมาะสำหรับชั้นปี:</strong> ${activity.skill.yearLevel}</p>` : ''}
          ${activity.skill?.requiredActivities ? `<p><strong>กิจกรรมที่ต้องเข้าร่วม:</strong> ${activity.skill.requiredActivities} กิจกรรม</p>` : ''}
        </div>
        
        <button type="button" id="registerBtn" class="join-button" onclick="registerForActivity()">
          ลงชื่อเข้าร่วม
        </button>
      `;
    }
    
    // Register for activity
    async function registerForActivity() {
      if (!currentActivity) {
        alert('ไม่พบข้อมูลกิจกรรม');
        return;
      }
      
      const studentId = currentUser.studentId || currentUser.userId;
      const registerBtn = document.getElementById('registerBtn');
      
      if (!confirm(`ต้องการสมัครเข้าร่วมกิจกรรม "${currentActivity.name}" หรือไม่ ?`)) {
        return;
      }
      
      // Disable button during registration
      registerBtn.disabled = true;
      registerBtn.textContent = 'กำลังสมัคร...';
      
      try {
        const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            activityId: currentActivity.activityId,
            studentId: studentId
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('สมัครเข้าร่วมกิจกรรมสำเร็จ!\nกำลังนำทางไปหน้ากิจกรรมของฉัน...');
          
          // Update button state briefly
          registerBtn.textContent = 'สมัครเรียบร้อยแล้ว';
          registerBtn.style.backgroundColor = '#4CAF50';
          
          // Redirect to my activities page after short delay
          setTimeout(() => {
            window.location.href = 'my-activities.html';
          }, 1500);
        } else {
          alert(`เกิดข้อผิดพลาด: ${result.message}`);
          registerBtn.disabled = false;
          registerBtn.textContent = 'ลงชื่อเข้าร่วม';
        }
        
      } catch (error) {
        console.error('Registration error:', error);
        alert('เกิดข้อผิดพลาดในการสมัครเข้าร่วมกิจกรรม');
        registerBtn.disabled = false;
        registerBtn.textContent = 'ลงชื่อเข้าร่วม';
      }
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
    
    // Show error message
    function showError(message, activityId = null) {
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = `
        <div class="error-message">
          <p>เกิดข้อผิดพลาดในการโหลดรายละเอียดกิจกรรม</p>
          <p>${message}</p>
          ${activityId ? `<button class="retry-btn" onclick="loadActivityDetail('${activityId}')">ลองใหม่</button>` : ''}
          <button class="retry-btn" onclick="window.history.back()" style="background-color: #6c757d; margin-left: 10px;">กลับ</button>
        </div>
      `;
    }
    
    // Show user menu
    function showUserMenu() {
      const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
      if (confirmLogout) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = "login.html";
      }
    }