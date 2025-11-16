// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    STUDENT_ACTIVITIES: '/students/{studentId}/activities',
    VERIFY_QR: '/activities/verify-qr',
    CONFIRM_ATTENDANCE: '/activities/confirm',
    CERTIFICATE: '/activities/{activityId}/certificate'
  }
};

// Global variables
let currentUser = null; // ⭐️ CHANGED: จะถูกตั้งค่าโดย initializeApp

let allActivities = [];
let currentFilter = 'upcoming';

// สถานะวงจรชีวิตของกิจกรรม
function getLifecycleState(a) {
  const now = new Date();
  const start = a.startDateTime ? new Date(a.startDateTime) : null;
  const end   = a.endDateTime ? new Date(a.endDateTime)   : null;

  if (start && now < start) return 'UPCOMING';
  if (start && now >= start && (!end || now <= end)) return 'IN_PROGRESS';
  return 'ENDED';
}

// ⭐️ NEW: กำหนดให้ auth-check.js เรียกฟังก์ชันนี้
window.initializePage = initializeMyActivities;

// ⭐️ CHANGED: เปลี่ยนชื่อฟังก์ชันจาก initializeApp เป็น initializeMyActivities
function initializeMyActivities() {
  console.log("🏁 my-activities.js: initializeMyActivities() called");

  // ⭐️ CHANGED: อ่านข้อมูลจาก window.userData (ที่ auth-check.js ตั้งให้)
  currentUser = window.userData;
  
  // ⭐️ CHANGED: ย้ายการตรวจสอบสิทธิ์มาไว้ที่นี่ (เหมือน student-dashboard.js)
  // (ปรับแต่งเงื่อนไข role ได้ตามต้องการ)
  if (!currentUser || !currentUser.userId) {
      console.error('❌ my-activities.js: Authentication failed - user data not found or invalid.');
      alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือ session หมดอายุ');
      if (typeof navigateTo === 'function') {
          navigateTo("login.html");
      } else {
          window.location.href = "login.html";
      }
      return;
  }
  
  setupTabButtons();
  
  // ⭐️ CHANGED: ใช้ currentUser.userId (ตามมาตรฐานเดียวกับ student-dashboard.js)
  const studentId = currentUser.userId;
  loadUserActivities(studentId);
  setupGeoPopupHandlers();
}

/*// ⭐️ NEW: เพิ่ม Event Listener ที่ท้ายไฟล์ (เหมือน student-dashboard.js)
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 my-activities.js: DOM fully loaded.");
    
    // ตรวจสอบว่า auth-check.js ทำงานเสร็จแล้ว (window.userData ถูกตั้งค่าแล้ว)
    if (window.userData) {
        console.log("✅ my-activities.js: User data found, calling initialization.");
        initializeMyActivities(); // เรียกฟังก์ชันเริ่มต้น
    } else {
        // กรณีผิดพลาด: auth-check.js อาจยังไม่เสร็จ หรือมีปัญหา
        console.error("❌ my-activities.js: User data not found after DOM load. Auth check might have failed.");
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้ กรุณาลองเข้าสู่ระบบใหม่");
        if(typeof navigateTo === 'function') navigateTo('login.html');
        else window.location.href = 'login.html';
    }
});*/


function setupTabButtons() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterAndRender();
    });
  });
}

function redirectToLogin() {
  window.location.href = "login.html";
}

// Load user activities from API
async function loadUserActivities(studentId) {
  const list = document.getElementById('activities-list');
  try {
    list.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.STUDENT_ACTIVITIES.replace('{studentId}', studentId);
    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // ⭐️ CHANGED: ใช้ window.userToken
        'Authorization': `Bearer ${window.userToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const activities = await resp.json();

    allActivities = activities || [];
    filterAndRender();

  } catch (err) {
    console.error('Error loading activities:', err);
    showError(err.message, studentId);
  }
}

// กรองตามแท็บ + เรนเดอร์
function filterAndRender() {
  const list = document.getElementById('activities-list');
  list.innerHTML = '';

  const items = allActivities.filter(a => {
    const life = getLifecycleState(a);
    if (currentFilter === 'upcoming') {
      return life === 'UPCOMING';
    } else if (currentFilter === 'inprogress') {
      return life === 'IN_PROGRESS';
    } else {
      return life === 'ENDED' && !!a.surveyCompleted;
    }
  });

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-message">ไม่มีรายการในหมวดนี้</div>`;
    return;
  }

  items.forEach(a => list.appendChild(createActivityElement(a)));
}


// (ส่วน displayActivities และ โค้ดที่ซ้ำซ้อนกัน ถูกลบไปแล้ว ดีแล้วครับ)


// Create single activity element
function createActivityElement(activity) {
  const element = document.createElement('div');
  element.className = 'activity-item';
  const formattedDate = formatDateTime(activity.startDateTime);
  const buttonState = getButtonState(activity);

  element.innerHTML = `
    <div class="activity-info">
      <div class="activity-name">${activity.name || 'ไม่มีชื่อกิจกรรม'}</div>
      <div class="activity-date">${formattedDate}</div>
      <div class="activity-location">📍 ${activity.location || 'ไม่ระบุสถานที่'}</div>
    </div>
    <button class="${buttonState.class}"
            data-activity-id="${activity.activityId}"
            data-action="${buttonState.action}"
            onclick="handleActivityAction('${activity.activityId}')"
            ${buttonState.disabled ? 'disabled' : ''}>
      ${buttonState.text}
    </button>
  `;

  return element;
}

// Format date and time
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return 'ไม่ระบุเวลา';
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (error) {
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
}

// Get button state based on activity status
function getButtonState(a) {
  const life = getLifecycleState(a);
  const isConfirmed     = !!a.isConfirmed;
  const surveyCompleted = !!a.surveyCompleted;

  if (life === 'UPCOMING') {
    return { class: 'activity-button', text: 'สมัครเข้าร่วมแล้ว', disabled: true, action: 'none' };
  }
  if (life === 'IN_PROGRESS') {
    if (!isConfirmed) {
      return { class: 'activity-button active', text: 'กดเพื่อยืนยันเข้าร่วม', disabled: false, action: 'confirm' };
    }
    return { class: 'activity-button', text: 'ยืนยันแล้ว (รอสิ้นสุดกิจกรรม)', disabled: true, action: 'none' };
  }
  if (life === 'ENDED') {
    if (!isConfirmed) {
      return { class: 'activity-button', text: 'หมดเวลายืนยันเข้าร่วม', disabled: true, action: 'none' };
    }
    if (!surveyCompleted) {
      return { class: 'activity-button active', text: 'ทำแบบประเมิน', disabled: false, action: 'survey' };
    }
    return { class: 'activity-button active', text: 'รับเกียรติบัตร', disabled: false, action: 'certificate' };
  }
  return { class: 'activity-button', text: 'ไม่ทราบสถานะ', disabled: true, action: 'none' };
}

// ⭐ NEW: ขอเกียรติบัตรจาก backend แล้วเปิด PDF
async function requestCertificate(activityId) {
  try {
    if (!currentUser || !currentUser.userId) {
      alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    const studentId = currentUser.userId;
    const button = document.querySelector(`button[data-activity-id="${activityId}"]`);

    // กันกดรัว ๆ
    if (button) {
      button.disabled = true;
      const originalText = button.textContent;
      button.dataset.originalText = originalText;
      button.textContent = "กำลังออกเกียรติบัตร...";
    }

    const url =
      CONFIG.API_BASE_URL +
      CONFIG.ENDPOINTS.CERTIFICATE.replace("{activityId}", encodeURIComponent(activityId)) +
      `?studentId=${encodeURIComponent(studentId)}`;

    console.log("[DEBUG] requestCertificate url =", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // จะส่งหรือไม่ส่ง Authorization ก็ได้ แล้วแต่ว่าคุณเปิดตรวจที่ Lambda ไหม
        "Authorization": `Bearer ${window.userToken || ""}`
      }
    });

    const data = await res.json();
    console.log("[DEBUG] certificate response:", data);

    if (!res.ok || !data.success) {
      alert(data.message || "เกิดข้อผิดพลาดในการออกเกียรติบัตร");
      return;
    }

    const cert = data.certificate;
    if (!cert || !cert.pdfUrl) {
      alert("ไม่พบไฟล์เกียรติบัตร");
      return;
    }

    // เปิด PDF ในแท็บใหม่
    window.open(cert.pdfUrl, "_blank");

  } catch (err) {
    console.error("Error while requesting certificate:", err);
    alert("เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง");
  } finally {
    // คืนสภาพปุ่ม
    const button = document.querySelector(`button[data-activity-id="${activityId}"]`);
    if (button) {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }
}

/* ============================================================
   MAIN: Handle activity button click
   ============================================================ */
function handleActivityAction(activityId) {
  const button = document.querySelector(`button[data-activity-id="${activityId}"]`);
  if (!button || button.disabled) return;
  const action = button.dataset.action;

  if (action === 'confirm') {
    openConfirmPopup(activityId);
    return;
  }
  if (action === 'survey') {
    window.location.href = `Assessment.html?id=${activityId}`;
    return;
  }
  if (action === 'certificate') {
    requestCertificate(activityId);   
    return;
  }
}

/* ============================================================
   ✅ ยืนยันด้วยพิกัด (Popup + Haversine + call backend)
   ============================================================ */
let popupRefs = null;
let confirmContext = {
  activityId: null, centerLat: null, centerLon: null,
  radiusM: 200, userLat: null, userLon: null
};

function setupGeoPopupHandlers() {
  const popupEl = document.getElementById('popupConfirm');
  if (!popupEl) return;

  popupRefs = {
    root: popupEl,
    btnConfirm: popupEl.querySelector('.btn-confirm'),
    btnClose: popupEl.querySelector('.btn-close'),
    mapFrame: popupEl.querySelector('#mapFrame'),
    locationText: popupEl.querySelector('#locationText'),
    radiusHint: popupEl.querySelector('#radiusHint'),
    titleEl: popupEl.querySelector('#popup-activity-name')
  };

  popupRefs.btnClose.addEventListener('click', () => {
    popupRefs.root.style.display = 'none';
  });
  popupRefs.btnConfirm.addEventListener('click', onConfirmByGeo);
}

async function openConfirmPopup(activityId) {
  if (!popupRefs || !popupRefs.root) {
    alert('ไม่พบหน้าต่างยืนยันพิกัด');
    return;
  }
  const activity = (allActivities || []).find(a => a.activityId === activityId);
  if (!activity) { alert('ไม่พบข้อมูลกิจกรรม'); return; }

  popupRefs.titleEl.textContent = activity.name || '';

  let centerLat = activity.locationLatitude || activity.locationLat || null;
  let centerLon = activity.locationLongitude || activity.locationLon || null;
  let radiusM  = activity.locationRadiusMeters || activity.radiusMeters || 200;

  if (!centerLat || !centerLon) {
    alert('ยังไม่ได้ตั้งค่าพิกัดสถานที่กิจกรรม');
    return;
  }

  confirmContext = {
    activityId,
    centerLat: Number(centerLat),
    centerLon: Number(centerLon),
    radiusM: Number(radiusM) || 200,
    userLat: null,
    userLon: null
  };

  popupRefs.locationText.textContent = 'ตำแหน่งของคุณ: กำลังขอตำแหน่ง...';
  popupRefs.radiusHint.textContent = `ต้องอยู่ในรัศมีไม่เกิน ${confirmContext.radiusM} เมตรจากจุดจัดกิจกรรม`;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        confirmContext.userLat = pos.coords.latitude;
        confirmContext.userLon = pos.coords.longitude;
        popupRefs.locationText.textContent =
          `ตำแหน่งคุณ: ${confirmContext.userLat.toFixed(6)}, ${confirmContext.userLon.toFixed(6)}`;
        popupRefs.mapFrame.src =
          `https://maps.google.com/maps?q=${confirmContext.userLat},${confirmContext.userLon}&hl=th&z=16&output=embed`;
      },
      err => {
        console.error(err);
        popupRefs.locationText.textContent = '⚠️ ไม่สามารถดึงตำแหน่งได้';
      }
    );
  } else {
    popupRefs.locationText.textContent = '⚠️ เบราว์เซอร์ไม่รองรับ Geolocation';
  }
  popupRefs.root.style.display = 'flex';
}

async function onConfirmByGeo() {
  const ctx = confirmContext;
  if (!ctx.userLat || !ctx.userLon) { alert('ยังไม่พบพิกัดของคุณ'); return; }

  const d = haversineMeters(ctx.userLat, ctx.userLon, ctx.centerLat, ctx.centerLon);
  if (d > ctx.radiusM) {
    alert(`❌ คุณอยู่นอกพื้นที่กิจกรรม (${d.toFixed(1)} เมตร)`);
    return;
  }

  try {
    // ⭐️ CHANGED: ใช้ currentUser.userId
    const studentId = currentUser.userId;
    const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.CONFIRM_ATTENDANCE;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ⭐️ CHANGED: ใช้ window.userToken
        'Authorization': `Bearer ${window.userToken}`
      },
      body: JSON.stringify({
        activityId: ctx.activityId,
        studentId,
        latitude: ctx.userLat,
        longitude: ctx.userLon,
        currentTime: new Date().toISOString()
      })
    });
    const result = await res.json();
    if (res.ok && result.success !== false) {
      alert('✅ ยืนยันเข้าร่วมสำเร็จ!');
      popupRefs.root.style.display = 'none';
      loadUserActivities(studentId);
    } else {
      alert('ยืนยันไม่สำเร็จ: ' + (result.message || ''));
    }
  } catch (e) {
    console.error(e);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = deg => deg * Math.PI / 180;
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lon2 - lon1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ============================================================
   (ส่วน QR Code ที่เหลือ - ไม่ได้แก้ไข token)
   ============================================================ */

// ... (openCodeInput, closeCodeInput, submitActivityCode) ...
// ... (ฟังก์ชันเหล่านี้ยังใช้ localStorage อยู่ ถ้าจะใช้ต้องแก้ด้วย) ...

// Verify activity code with server
async function verifyActivityCode(activityCode) {
  const modal = document.getElementById('code-modal');
  const activityId = modal ? modal.dataset.activityId : undefined;
  // ⭐️ CHANGED: ใช้ currentUser.userId
  const studentId = currentUser.userId;

  try {
    showStatusMessage('กำลังตรวจสอบรหัส...', 'processing');
    if (!isValidActivityCode(activityCode)) {
      showStatusMessage('รูปแบบรหัสไม่ถูกต้อง (ตัวอย่าง: ACT001QR4T25X)', 'error');
      return;
    }
    const preCheckResult = await preCheckRegistration(activityCode, studentId);
    if (!preCheckResult.success) {
      showStatusMessage(preCheckResult.message, 'error');
      return;
    }
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.VERIFY_QR;
    const requestData = {
      qrCode: activityCode,
      studentId: studentId,
      currentTime: new Date().toISOString()
    };
    if (activityId) {
      requestData.activityId = activityId;
    }
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ⭐️ CHANGED: ใช้ window.userToken
        'Authorization': `Bearer ${window.userToken}`
      },
      body: JSON.stringify(requestData)
    });
    const result = await response.json();
    if (result.success) {
      handleSuccessfulVerification(result, activityId);
    } else {
      handleFailedVerification(result.message);
    }
  } catch (error) {
    console.error('Code verification error:', error);
    showStatusMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// ... (isValidActivityCode) ...

// Pre-check if user is registered for this activity
async function preCheckRegistration(activityCode, studentId) {
  try {
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.STUDENT_ACTIVITIES.replace('{studentId}', studentId);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // ⭐️ CHANGED: ใช้ window.userToken
        'Authorization': `Bearer ${window.userToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      return { success: false, message: 'ไม่สามารถตรวจสอบการลงทะเบียนได้' };
    }
    const activities = await response.json();
    const matchingActivity = activities.find(activity => activity.qrCode === activityCode);
    if (!matchingActivity) {
      return { success: false, message: 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้' };
    }
    if (matchingActivity.isConfirmed) {
      return { success: false, message: 'คุณได้ยืนยันการเข้าร่วมกิจกรรมนี้แล้ว' };
    }
    return { success: true, activity: matchingActivity, message: 'สามารถยืนยันการเข้าร่วมได้' };
  } catch (error) {
    console.error('Pre-check error:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
  }
}

// ... (handleSuccessfulVerification, updateButtonToAssessmentState, handleFailedVerification) ...
// ... (showStatusMessage, hideStatusMessage, event listener 'keypress') ...

// Show error message
function showError(message, studentId) {
  const activitiesList = document.getElementById('activities-list');
  activitiesList.innerHTML = `
    <div class="error-message">
      <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
      <p>${message}</p>
      <button class="retry-btn" onclick="loadUserActivities('${studentId}')">ลองใหม่</button>
    </div>
  `;
}

// Navigate to other pages
function navigateTo(page) {
  window.location.href = page;
}

// Show user menu (ซ้ำซ้อนกับ logout)
function showUserMenu() {
  logout();
}

// ฟังก์ชันล็อกเอาท์
function logout() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    // ⭐️ CHANGED: เคลียร์ทั้ง 2 storages เพื่อความแน่นอน
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
  }
}

// ⭐️ REMOVED: ลบการเรียก initializeApp() ที่ใช้ DOMContentLoaded แบบเก่าออก
// document.addEventListener('DOMContentLoaded', function() {
//   initializeApp();
// });