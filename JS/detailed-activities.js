// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    GET_ACTIVITY_DETAIL: '/activities/{activityId}',
    REGISTER_ACTIVITY: '/activities/register'
  }
};

let currentActivity = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

function initializeApp() {
  // 🔒 ของเดิม: บังคับต้องล็อกอิน (เก็บไว้ใช้ตอนต่อ auth จริง)
  /*
  currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  if (!currentUser.studentId && !currentUser.userId) {
    window.location.href = "login.html";
    return;
  }
  */

  // ⭐ DEV MODE: ยังไม่บังคับล็อกอิน แต่เก็บ userData ไว้ใช้ถ้ามี
  currentUser = JSON.parse(localStorage.getItem('userData') || '{}');

  const urlParams = new URLSearchParams(window.location.search);
  // รองรับทั้ง ...?activityId= และ ...?id=
  const activityId = urlParams.get('activityId') || urlParams.get('id');
  if (!activityId) {
    showError('ไม่พบรหัสกิจกรรมในลิงก์');
    return;
  }
  loadActivityDetail(activityId);
}

async function loadActivityDetail(activityId) {
  const mainContent = document.getElementById('main-content');
  try {
    mainContent.innerHTML = '<div class="loading">กำลังโหลดรายละเอียดกิจกรรม...</div>';

    const apiUrl =
      CONFIG.API_BASE_URL +
      CONFIG.ENDPOINTS.GET_ACTIVITY_DETAIL.replace('{activityId}', activityId);

    // ใช้ token เฉพาะถ้ามี (เตรียมไว้ใช้กับ auth จริง)
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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

// ✅ helper: format / extract
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
  } catch {
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
}

function normalizeLevel(levelRaw) {
  const s = String(levelRaw || '').trim().toLowerCase();
  if (!s) return '';
  if (['พื้นฐาน', 'basic'].includes(s)) return 'พื้นฐาน';
  if (['กลาง', 'ปานกลาง', 'medium'].includes(s)) return 'ปานกลาง';
  if (['ขั้นสูง', 'advanced'].includes(s)) return 'ขั้นสูง';
  return s;
}
function getLevelDisplay(levelRaw) {
  return normalizeLevel(levelRaw);
}
function getLevelClass(levelRaw) {
  const lv = normalizeLevel(levelRaw);
  if (lv === 'พื้นฐาน') return 'level-basic';
  if (lv === 'ปานกลาง') return 'level-medium';
  if (lv === 'ขั้นสูง') return 'level-advanced';
  return '';
}

// Display activity details
function displayActivityDetail(activity) {
  const mainContent = document.getElementById("main-content");

  // ===== Format date =====
  const startDate = formatDateTime(activity.startDateTime);
  const endDate = formatDateTime(activity.endDateTime);

  // ===== Badge Skill Category =====
  const skillCategoryRaw = activity.skillCategory || "";
  const skillCategory = skillCategoryRaw.toLowerCase();
  const skillBadge = skillCategoryRaw
    ? `<span class="badge" style="
          background: ${
            skillCategory === "soft skill"
              ? "#ff6b6b"
              : skillCategory === "hard skill"
              ? "#4ecdc4"
              : "#95a5a6"
          };
          padding:6px 14px;
          border-radius:20px;
          color:white;
          font-size: 14px;
        ">
        ${skillCategoryRaw}
      </span>`
    : "";

  // ===== Badge Level =====
  const levelRaw = activity.level || "";
  const levelBadge = levelRaw
    ? `<span class="badge" style="
          background: ${
            levelRaw === "พื้นฐาน"
              ? "#4CAF50"
              : levelRaw === "ปานกลาง"
              ? "#FFC107"
              : "#F44336"
          };
          padding:6px 14px;
          border-radius:20px;
          color:white;
          font-size: 14px;
        ">
        ${levelRaw}
      </span>`
    : "";

  // ===== Image =====
  const imageUrl = activity.imageUrl;
  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" class="skill-image" alt="${activity.name || ""}">`
    : `<div class="img-placeholder">🖼️ ไม่มีรูปภาพ</div>`;

  // ===== PLO Data =====
  const plos = Array.isArray(activity.plo) ? activity.plo : [];
  const ploNames = Array.isArray(activity.ploFullNames) ? activity.ploFullNames : [];
  const ploDescs = Array.isArray(activity.ploDescriptions) ? activity.ploDescriptions : [];

  let ploHTML = "";

  // กลุ่มกิจกรรม: ใช้ skillId
  if (activity.skillId) {
    ploHTML += `<p><strong>กลุ่มกิจกรรม:</strong> ${activity.skillId}</p>`;
  }

  // ไล่ PLO ทั้งหมดเรียงกัน
  for (let i = 0; i < plos.length; i++) {
    const code = plos[i] || "";
    const name = ploNames[i] || "";
    const desc = ploDescs[i] || "";

    if (code || name) {
      ploHTML += `<p><strong>${code}:</strong> ${name}</p>`;
    }
    if (desc) {
      ploHTML += `<p><strong>คำอธิบาย:</strong> ${desc}</p>`;
    }
    if (i < plos.length - 1) {
      ploHTML += `<p></p>`; // เว้นระยะเบา ๆ ระหว่าง PLO
    }
  }

  // เหมาะสำหรับชั้นปี
  const suitableYear =
    activity.suitableYearLevel || activity.yearLevel || activity.year || null;
  if (suitableYear) {
    ploHTML += `<p><strong>เหมาะสำหรับชั้นปี:</strong> ${suitableYear}</p>`;
  }

  // กิจกรรมที่ต้องเข้าร่วม
  if (activity.requiredActivities) {
    ploHTML += `<p><strong>กิจกรรมที่ต้องเข้าร่วม:</strong> ${activity.requiredActivities} กิจกรรม</p>`;
  }

  // ===== ปุ่มสมัคร =====
  const now = new Date();
  const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
  let canRegister = true;
  if (start && now >= start) {
    canRegister = false;
  }
  const btnText = canRegister ? "สมัครเข้าร่วม" : "ปิดรับสมัครแล้ว";

  const registerButton = `
    <button class="join-button" id="registerBtn" ${canRegister ? "" : "disabled"}>
      ${btnText}
    </button>
  `;

  // ===== FINAL HTML (ปรับลำดับ -> ชื่อ, badge, description) =====
  mainContent.innerHTML = `
    <div class="detail-card">

      ${imageHtml}

      <h2 class="activity-name">${activity.name || ""}</h2>

      <!-- badge อยู่ใต้ชื่อ -->
      <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${skillBadge}
        ${levelBadge}
      </div>

      <!-- description อยู่ถัดจาก badge ลงมา -->
      <p class="activity-desc" style="margin-top: 10px;">
        ${activity.description || "-"}
      </p>

      <!-- TIME BOX -->
      <div class="time-box">
        <div class="sec-title">📅 รายละเอียดเวลา</div>
        <div class="sec-body">
          <p><strong>เริ่ม:</strong> ${startDate}</p>
          <p><strong>สิ้นสุด:</strong> ${endDate}</p>
          <p><strong>สถานที่:</strong> ${activity.locationName || activity.location || "-"}</p>
        </div>
      </div>

      <!-- PLO BOX -->
      <div class="plo-box">
        <div class="sec-title">🎯 ทักษะที่ได้รับ</div>
        <div class="sec-body">
          ${ploHTML || "<p>-</p>"}
        </div>
      </div>

      ${registerButton}
    </div>
  `;

  // bind ปุ่มสมัครให้ทำงานเหมือนเดิม
  const registerBtn = document.getElementById("registerBtn");
  if (canRegister && registerBtn) {
    registerBtn.onclick = registerForActivity;
  }
}


// Register for activity
async function registerForActivity() {
  if (!currentActivity) return alert('ไม่พบข้อมูลกิจกรรม');

  const studentId = currentUser.studentId || currentUser.userId;
  const registerBtn = document.getElementById('registerBtn');

  if (!confirm(`ต้องการสมัครเข้าร่วมกิจกรรม "${currentActivity.name}" หรือไม่ ?`)) return;

  registerBtn.disabled = true;
  registerBtn.textContent = 'กำลังสมัคร...';

  try {
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // auth ไว้ใช้ตอนเชื่อมระบบจริง
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ activityId: currentActivity.activityId, studentId })
    });
    const result = await response.json();

    if (result.success) {
      alert('สมัครเข้าร่วมกิจกรรมสำเร็จ!\nกำลังนำทางไปหน้ากิจกรรมของฉัน.');
      registerBtn.textContent = 'สมัครเรียบร้อยแล้ว';
      registerBtn.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        window.location.href = 'my-activities.html';
      }, 1200);
    } else {
      alert(`เกิดข้อผิดพลาด: ${result.message}`);
      registerBtn.disabled = false;
      registerBtn.textContent = 'สมัครเข้าร่วม';
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('เกิดข้อผิดพลาดในการสมัครเข้าร่วมกิจกรรม');
    registerBtn.disabled = false;
    registerBtn.textContent = 'สมัครเข้าร่วม';
  }
}

// Show error message
function showError(message, activityId) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="error-message">
      <p>เกิดข้อผิดพลาดในการโหลดรายละเอียดกิจกรรม</p>
      <p>${message || ''}</p>
      ${
        activityId
          ? `<button class="join-button" style="max-width:260px;margin-top:16px;"
               onclick="loadActivityDetail('${activityId}')">ลองใหม่</button>`
          : ''
      }
    </div>
  `;
}
