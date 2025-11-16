// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    GET_ACTIVITY_DETAIL: '/activities/{activityId}',
    REGISTER_ACTIVITY: '/activities/register',
    // ⭐️ เพิ่ม endpoint เช็คประวัติ
    GET_MY_ACTIVITIES: '/students/{studentId}/activities'
  }
};

let currentActivity = null;
let currentUser = null;
let myParticipations = new Set(); // ⭐️ เก็บ ID กิจกรรมที่สมัครแล้ว

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

function initializeApp() {
  // 1. ดึงข้อมูล User จาก Session
  try {
      const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
      currentUser = sessionData.user || {};
      console.log("👤 Current User:", currentUser);
  } catch (e) {
      console.error("Error parsing session data", e);
      currentUser = {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('activityId') || urlParams.get('id');
  
  if (!activityId) {
    showError('ไม่พบรหัสกิจกรรมในลิงก์');
    return;
  }
  
  loadActivityDetail(activityId);
}

// ⭐️ ฟังก์ชันใหม่: โหลดประวัติการสมัคร
async function loadMyParticipations(studentId) {
    if (!studentId) return;
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
        const token = sessionData.token || '';
        
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_MY_ACTIVITIES.replace('{studentId}', studentId);
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            data.forEach(item => {
                const id = item.activityId || item.id; 
                if(id) myParticipations.add(id);
            });
            console.log("✅ Loaded participations:", myParticipations);
        }
    } catch (error) {
        console.warn("Failed to load participations:", error);
    }
}

async function loadActivityDetail(activityId) {
  const mainContent = document.getElementById('main-content');
  try {
    mainContent.innerHTML = '<div class="loading">กำลังโหลดรายละเอียดกิจกรรม...</div>';

    // ⭐️ 1. เรียกโหลดประวัติการสมัครก่อน (ถ้ามี user)
    const studentId = currentUser.userId || currentUser.studentId;
    if (studentId) {
        await loadMyParticipations(studentId);
    }

    // 2. โหลดรายละเอียดกิจกรรม
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITY_DETAIL.replace('{activityId}', activityId);

    const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
    const token = sessionData.token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const activity = await response.json();
    currentActivity = activity;
    displayActivityDetail(activity);

  } catch (error) {
    console.error('Error loading activity detail:', error);
    showError(error.message, activityId);
  }
}

// Helper Functions (เหมือนเดิม)
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return 'ไม่ระบุเวลา';
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return 'รูปแบบวันที่ไม่ถูกต้อง'; }
}

function normalizeLevel(levelRaw) {
  const s = String(levelRaw || '').trim().toLowerCase();
  if (!s) return '';
  if (['พื้นฐาน', 'basic'].includes(s)) return 'พื้นฐาน';
  if (['กลาง', 'ปานกลาง', 'medium'].includes(s)) return 'ปานกลาง';
  if (['ขั้นสูง', 'advanced'].includes(s)) return 'ขั้นสูง';
  return s;
}

function displayActivityDetail(activity) {
  const mainContent = document.getElementById("main-content");
  const startDate = formatDateTime(activity.startDateTime);
  const endDate = formatDateTime(activity.endDateTime);

  // Badge & Level logic (เหมือนเดิม)
  const skillCategoryRaw = activity.skillCategory || "";
  const skillCategory = skillCategoryRaw.toLowerCase();
  const skillBadge = skillCategoryRaw
    ? `<span class="badge skill-badge ${skillCategory === "soft skill" ? "soft-skill" : "hard-skill"}">${skillCategoryRaw}</span>`
    : "";

  const levelRaw = normalizeLevel(activity.level);
  let levelClass = '';
  if (levelRaw === 'พื้นฐาน') levelClass = 'level-basic';
  else if (levelRaw === 'ปานกลาง') levelClass = 'level-medium';
  else if (levelRaw === 'ขั้นสูง') levelClass = 'level-advanced';
  
  const levelBadge = levelRaw
    ? `<span class="badge level-badge ${levelClass}">${levelRaw}</span>`
    : "";

  const imageUrl = activity.imageUrl;
  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" class="skill-image" alt="${activity.name || ""}">`
    : `<div class="img-placeholder">🖼️ ไม่มีรูปภาพ</div>`;

  // PLO Logic
  const plos = Array.isArray(activity.plo) ? activity.plo : [];
  const ploNames = Array.isArray(activity.ploFullNames) ? activity.ploFullNames : [];
  const ploDescs = Array.isArray(activity.ploDescriptions) ? activity.ploDescriptions : [];
  let ploHTML = "";
  if (activity.skillId) ploHTML += `<p><strong>กลุ่มกิจกรรม:</strong> ${activity.skillId}</p>`;
  for (let i = 0; i < plos.length; i++) {
    const code = plos[i] || "";
    const name = ploNames[i] || "";
    const desc = ploDescs[i] || "";
    if (code || name) ploHTML += `<p><strong>${code}:</strong> ${name}</p>`;
    if (desc) ploHTML += `<p><strong>คำอธิบาย:</strong> ${desc}</p>`;
    if (i < plos.length - 1) ploHTML += `<p></p>`;
  }
  const suitableYear = activity.suitableYearLevel || activity.yearLevel || activity.year || null;
  if (suitableYear) ploHTML += `<p><strong>เหมาะสำหรับชั้นปี:</strong> ${suitableYear}</p>`;
  if (activity.requiredActivities) ploHTML += `<p><strong>กิจกรรมที่ต้องเข้าร่วม:</strong> ${activity.requiredActivities} กิจกรรม</p>`;

  // ⭐️ Logic ปุ่มสมัคร (ปรับปรุงใหม่)
  let btnText = 'สมัครเข้าร่วม';
  let btnDisabled = false;
  let btnStyle = ''; // CSS inline เพิ่มเติม

  const now = new Date();
  const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
  const end = activity.endDateTime ? new Date(activity.endDateTime) : null;

  // 1. เช็คว่าสมัครหรือยัง (จาก Set)
  if (myParticipations.has(activity.activityId)) {
      btnText = 'สมัครเข้าร่วมแล้ว';
      btnDisabled = true; // กดซ้ำไม่ได้
      btnStyle = 'background-color: #9E9E9E; cursor: default;'; // สีเทา
  } 
  // 2. เช็คเวลา (ถ้ายังไม่ได้สมัคร)
  else if (start && now >= start) {
      btnDisabled = true;
      btnText = end && now <= end ? 'กำลังจัดกิจกรรม' : 'ปิดรับสมัครแล้ว';
  }

  const registerButton = `
    <button class="join-button" id="registerBtn" 
            style="${btnStyle}"
            ${btnDisabled ? "disabled" : ""}>
      ${btnText}
    </button>
  `;

  mainContent.innerHTML = `
    <div class="detail-card">
      ${imageHtml}
      <h2 class="activity-name">${activity.name || ""}</h2>
      <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${skillBadge} ${levelBadge}
      </div>
      <p class="activity-desc" style="margin-top: 10px;">${activity.description || "-"}</p>
      <div class="time-box">
        <div class="sec-title">📅 รายละเอียดเวลา</div>
        <div class="sec-body">
          <p><strong>เริ่ม:</strong> ${startDate}</p>
          <p><strong>สิ้นสุด:</strong> ${endDate}</p>
          <p><strong>สถานที่:</strong> ${activity.locationName || activity.location || "-"}</p>
        </div>
      </div>
      <div class="plo-box">
        <div class="sec-title">🎯 ทักษะที่ได้รับ</div>
        <div class="sec-body">${ploHTML || "<p>-</p>"}</div>
      </div>
      ${registerButton}
    </div>
  `;

  const registerBtn = document.getElementById("registerBtn");
  // ถ้าปุ่มยังกดได้ (ไม่ disabled) ถึงจะผูก event
  if (!btnDisabled && registerBtn) {
    registerBtn.onclick = registerForActivity;
  }
}

async function registerForActivity() {
  if (!currentActivity) return alert('ไม่พบข้อมูลกิจกรรม');
  
  const studentId = currentUser.userId || currentUser.studentId;
  if (!studentId) {
      alert('กรุณาเข้าสู่ระบบก่อนสมัครกิจกรรม');
      window.location.href = 'login.html';
      return;
  }
  
  const registerBtn = document.getElementById('registerBtn');
  if (!confirm(`ต้องการสมัครเข้าร่วมกิจกรรม "${currentActivity.name}" หรือไม่ ?`)) return;

  // เปลี่ยนปุ่มเป็น Loading
  registerBtn.disabled = true;
  registerBtn.textContent = 'กำลังสมัคร...';
  registerBtn.style.backgroundColor = '#cccccc';

  try {
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
    const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
    const token = sessionData.token || '';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ activityId: currentActivity.activityId, studentId })
    });
    
    const result = await response.json();

    if (result.success) {
      // ⭐️ สำเร็จ: เปลี่ยนปุ่มเป็นสีเทา + นำทาง
      alert('✅ สมัครเข้าร่วมกิจกรรมสำเร็จ!\nกำลังนำทางไปหน้ากิจกรรมของฉัน.');
      
      registerBtn.textContent = 'สมัครเข้าร่วมแล้ว';
      registerBtn.style.backgroundColor = '#9E9E9E';
      
      setTimeout(() => {
        window.location.href = 'my-activities.html';
      }, 1200);
      
    } else {
      // Error
      alert(`แจ้งเตือน: ${result.message}`);
      
      if (result.message.includes('สมัครกิจกรรมนี้ไปแล้ว')) {
          registerBtn.textContent = 'สมัครเข้าร่วมแล้ว';
          registerBtn.style.backgroundColor = '#9E9E9E';
      } else {
          // คืนค่าปุ่มเดิม
          registerBtn.disabled = false;
          registerBtn.textContent = 'สมัครเข้าร่วม';
          registerBtn.style.backgroundColor = ''; // สีเขียวเดิม
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    registerBtn.disabled = false;
    registerBtn.textContent = 'สมัครเข้าร่วม';
    registerBtn.style.backgroundColor = '';
  }
}

function showError(message, activityId) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="error-message">
      <p>เกิดข้อผิดพลาดในการโหลดรายละเอียดกิจกรรม</p>
      <p>${message || ''}</p>
      ${activityId ? `<button class="join-button" style="max-width:260px;margin-top:16px;" onclick="loadActivityDetail('${activityId}')">ลองใหม่</button>` : ''}
    </div>
  `;
}