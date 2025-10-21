// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    STUDENT_ACTIVITIES: '/students/{studentId}/activities',
    VERIFY_QR: '/activities/verify-qr',
    // ✅ เพิ่ม endpoint สำหรับยืนยันด้วยพิกัด
    CONFIRM_ATTENDANCE: '/activities/confirm'
  }
};

// Global variables
let currentUser = null;

let allActivities = [];         // ✅ เก็บทั้งหมดไว้
let currentFilter = 'upcoming'; // ✅ ค่าเริ่มต้นแท็บ

// สถานะวงจรชีวิตของกิจกรรม (จากกิจกรรมจริง + การเข้าร่วมของผู้ใช้)
function getLifecycleState(a) {
  const now = new Date();
  const start = a.startDateTime ? new Date(a.startDateTime) : null;
  const end   = a.endDateTime ? new Date(a.endDateTime)   : null;

  // ยังไม่เริ่ม
  if (start && now < start) return 'UPCOMING';

  // เริ่มแล้ว (กำลังจัด)
  if (start && now >= start && (!end || now <= end)) {
    return 'IN_PROGRESS';
  }

  // จบแล้ว
  return 'ENDED';
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// Initialize the application
function initializeApp() {
  currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  if (!currentUser.studentId && !currentUser.userId) {
    redirectToLogin();
    return;
  }
  setupTabButtons(); // ✅ new
  const studentId = currentUser.studentId || currentUser.userId;
  loadUserActivities(studentId);

  // ✅ เตรียม event สำหรับ popup ยืนยันพิกัด (ถ้ามี element ในหน้า)
  setupGeoPopupHandlers();
}

function setupTabButtons() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter; // 'upcoming' | 'inprogress' | 'done'
      filterAndRender(); // ✅ render ใหม่ตามแท็บ
    });
  });
}

// Redirect to login page
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const activities = await resp.json();

    allActivities = activities || [];          // ✅ เก็บไว้ก่อน
    filterAndRender();                         // ✅ เรนเดอร์ตามแท็บ

  } catch (err) {
    console.error('Error loading activities:', err);
    showError(err.message, studentId);
  }
}

// กรองตามแท็บ + เรนเดอร์
function filterAndRender() {
  const list = document.getElementById('activities-list');
  list.innerHTML = '';

  // แยกกิจกรรมตามสถานะเวลา + ค่าสถานะผู้ใช้
  const items = allActivities.filter(a => {
    const life = getLifecycleState(a); // UPCOMING/IN_PROGRESS/ENDED
    if (currentFilter === 'upcoming') {
      return life === 'UPCOMING';
    } else if (currentFilter === 'inprogress') {
      return life === 'IN_PROGRESS';
    } else {
      // done tab: เงื่อนไขคือ "จบแล้ว" + "ทำแบบประเมินแล้ว"
      return life === 'ENDED' && !!a.surveyCompleted;
    }
  });

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-message">ไม่มีรายการในหมวดนี้</div>`;
    return;
  }

  items.forEach(a => list.appendChild(createActivityElement(a)));
}

/* ---------- (ของเดิมที่ซ้ำ/ค้างไว้จากเดิม – ไม่แตะ) ----------

try {
  // Show loading state
  activitiesList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
  // ...
} catch (error) {
  // ...
}

--------------------------------------------------------------- */

// Display activities list
function displayActivities(activities) {
  const activitiesList = document.getElementById('activities-list');

  // Clear existing content
  activitiesList.innerHTML = '';

  if (!activities || activities.length === 0) {
    // Show empty message with option to add sample data
    activitiesList.innerHTML = `
      <div class="empty-message">
        <p>ยังไม่มีกิจกรรมที่เข้าร่วม</p>
        <p style="font-size: 0.9rem; color: #888; margin-top: 10px;">
          ตรวจสอบให้แน่ใจว่าในตาราง ActivityParticipations<br>
          มีข้อมูลที่ studentId = ${currentUser.studentId || currentUser.userId}
        </p>
      </div>
    `;
    return;
  }

  // Create activity items
  activities.forEach(activity => {
    const activityElement = createActivityElement(activity);
    activitiesList.appendChild(activityElement);
  });
}

// Create single activity element
function createActivityElement(activity) {
  const element = document.createElement('div');
  element.className = 'activity-item';

  // Format date
  const formattedDate = formatDateTime(activity.startDateTime);

  // Determine button state
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

// Get button state based on activity status
function getButtonState(a) {
  const life = getLifecycleState(a); // UPCOMING / IN_PROGRESS / ENDED
  const isConfirmed     = !!a.isConfirmed;
  const surveyCompleted = !!a.surveyCompleted;
  const quizCompleted   = !!a.quizCompleted;

  // 1) ยังไม่เริ่ม → "สมัครเข้าร่วมแล้ว" (disabled)
  if (life === 'UPCOMING') {
    return { class: 'activity-button', text: 'สมัครเข้าร่วมแล้ว', disabled: true, action: 'none' };
  }

  // 2) ระหว่างจัด → ถ้ายังไม่ยืนยัน ให้กด "กดเพื่อยืนยันเข้าร่วม"
  if (life === 'IN_PROGRESS') {
    if (!isConfirmed) {
      return { class: 'activity-button active', text: 'กดเพื่อยืนยันเข้าร่วม', disabled: false, action: 'confirm' };
    }
    // ยืนยันแล้วระหว่างจัด: ยังรอสิ้นสุดกิจกรรม
    return { class: 'activity-button', text: 'ยืนยันแล้ว (รอสิ้นสุดกิจกรรม)', disabled: true, action: 'none' };
  }

  // 3) จบแล้ว → ตามขั้น
  if (life === 'ENDED') {
    if (!isConfirmed) {
      // จบแล้วแต่ยังไม่ยืนยัน → ไม่สามารถยืนยันย้อนหลัง
      return { class: 'activity-button', text: 'หมดเวลายืนยันเข้าร่วม', disabled: true, action: 'none' };
    }
    if (!surveyCompleted) {
      // จบแล้วและยืนยันแล้ว แต่ยังไม่ทำแบบประเมิน → ทำแบบประเมิน
      return { class: 'activity-button active', text: 'ทำแบบประเมิน', disabled: false, action: 'survey' };
    }
    // ทำแบบประเมินแล้ว → ให้ “รับเกียรติบัตร” (ปุ่มนี้กดได้ตลอด)
    return { class: 'activity-button active', text: 'รับเกียรติบัตร', disabled: false, action: 'certificate' };
  }

  return { class: 'activity-button', text: 'ไม่ทราบสถานะ', disabled: true, action: 'none' };
}

/* ============================================================
   MAIN: Handle activity button click
   - เปลี่ยนจาก openCodeInput(activityId) → openConfirmPopup(activityId)
   ============================================================ */
function handleActivityAction(activityId) {
  const button = document.querySelector(`button[data-activity-id="${activityId}"]`);
  if (!button || button.disabled) return;

  const action = button.dataset.action; // 'confirm' | 'survey' | 'certificate' | 'none'

  if (action === 'confirm') {
    // ✅ ใหม่: ใช้ popup ยืนยันด้วยพิกัด
    openConfirmPopup(activityId);
    return;
  }

  if (action === 'survey') {
    // ไปหน้าแบบประเมิน
    window.location.href = `Assessment.html?id=${activityId}`;
    return;
  }

  if (action === 'certificate') {
    // ไปหน้า/ลิงก์รับเกียรติบัตร
    window.location.href = `certificate.html?id=${activityId}`;
    return;
  }
}

/* ============================================================
   ✅ ยืนยันด้วยพิกัด (Popup + Haversine + call backend)
   - อ้างอิง element ที่อยู่ในไฟล์ HTML ของคุณ
   ============================================================ */
let popupRefs = null;
let confirmContext = {
  activityId: null,
  centerLat: null,
  centerLon: null,
  radiusM: 200,
  userLat: null,
  userLon: null
};

function setupGeoPopupHandlers() {
  const popupEl = document.getElementById('popupConfirm');
  if (!popupEl) return; // เผื่อหน้าอื่น ๆ reuse ไฟล์นี้

  popupRefs = {
    root: popupEl,
    btnConfirm: popupEl.querySelector('.btn-confirm'),
    btnClose: popupEl.querySelector('.btn-close'),
    mapFrame: popupEl.querySelector('#mapFrame'),
    locationText: popupEl.querySelector('#locationText'),
    radiusHint: popupEl.querySelector('#radiusHint'),
    titleEl: popupEl.querySelector('#popup-activity-name')
  };

  // ปิด popup
  popupRefs.btnClose.addEventListener('click', () => {
    popupRefs.root.style.display = 'none';
  });

  // กด “ยืนยัน”
  popupRefs.btnConfirm.addEventListener('click', onConfirmByGeo);
}

async function openConfirmPopup(activityId) {
  if (!popupRefs || !popupRefs.root) {
    alert('ไม่พบหน้าต่างยืนยันพิกัด');
    return;
  }

  const activity = (allActivities || []).find(a => a.activityId === activityId);
  if (!activity) { alert('ไม่พบข้อมูลกิจกรรม'); return; }

  // ชื่อกิจกรรม
  popupRefs.titleEl.textContent = activity.name || '';

  // ✅ หา center จาก activity (ควรส่งมาจาก API)
  let centerLat = activity.locationLatitude || activity.locationLat || null;
  let centerLon = activity.locationLongitude || activity.locationLon || null;
  let radiusM  = activity.locationRadiusMeters || activity.radiusMeters || 200;

  // TODO (ถ้าจำเป็น): ถ้าไม่มี centerLat/Lon และมี activity.locationId ให้ fetch จาก /locations/{id}
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

  // ขอพิกัดผู้ใช้
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

  // แสดง popup
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

  // ✅ อยู่ในรัศมี → เรียก backend เพื่อ mark isConfirmed=true
  try {
    const studentId = (currentUser.studentId || currentUser.userId);
    const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.CONFIRM_ATTENDANCE;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      loadUserActivities(studentId); // รีเฟรชรายการ
    } else {
      alert('ยืนยันไม่สำเร็จ: ' + (result.message || ''));
    }
  } catch (e) {
    console.error(e);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
}

// คำนวณระยะ Haversine (เมตร)
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
   (ของเดิม) QR Modal / Verification — คงไว้เพื่อย้อนกลับได้
   ============================================================ */

// Open code input modal
function openCodeInput(activityId = null) {
  const modal = document.getElementById('code-modal');
  if (!modal) { console.warn('code-modal not found'); return; }
  modal.style.display = 'flex';

  if (activityId) {
    modal.dataset.activityId = activityId;
  }

  // Clear previous input and status
  const inputEl = document.getElementById('activity-code');
  if (inputEl) inputEl.value = '';
  hideStatusMessage();

  // Focus on input
  setTimeout(() => {
    const inputEl2 = document.getElementById('activity-code');
    if (inputEl2) inputEl2.focus();
  }, 300);
}

// Close code input modal
function closeCodeInput() {
  const modal = document.getElementById('code-modal');
  if (!modal) return;
  modal.style.display = 'none';

  // Clear activity ID
  delete modal.dataset.activityId;

  // Clear input and status
  const inputEl = document.getElementById('activity-code');
  if (inputEl) inputEl.value = '';
  hideStatusMessage();
}

// Submit activity code
async function submitActivityCode() {
  const codeInput = document.getElementById('activity-code');
  const activityCode = (codeInput ? codeInput.value : '').trim().toUpperCase();

  if (!activityCode) {
    showStatusMessage('กรุณาใส่รหัสกิจกรรม', 'error');
    return;
  }

  // Verify the code
  await verifyActivityCode(activityCode);
}

// Verify activity code with server
async function verifyActivityCode(activityCode) {
  const modal = document.getElementById('code-modal');
  const activityId = modal ? modal.dataset.activityId : undefined;
  const studentId = currentUser.studentId || currentUser.userId;

  try {
    showStatusMessage('กำลังตรวจสอบรหัส...', 'processing');

    // First, validate the code format
    if (!isValidActivityCode(activityCode)) {
      showStatusMessage('รูปแบบรหัสไม่ถูกต้อง (ตัวอย่าง: ACT001QR4T25X)', 'error');
      return;
    }

    // Check if user is registered for activities with this code (client-side pre-check)
    const preCheckResult = await preCheckRegistration(activityCode, studentId);
    if (!preCheckResult.success) {
      showStatusMessage(preCheckResult.message, 'error');
      return;
    }

    // Build API URL
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.VERIFY_QR;

    // Prepare request data
    const requestData = {
      qrCode: activityCode,
      studentId: studentId,
      currentTime: new Date().toISOString() // ส่งเวลาปัจจุบันไปด้วย
    };

    if (activityId) {
      requestData.activityId = activityId;
    }

    // Make API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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

// Validate activity code format
function isValidActivityCode(code) {
  // รูปแบบ: ACT###QR#T##X (เช่น ACT001QR4T25X)
  const pattern = /^ACT\d{3}QR\d{1}T\d{2}X$/;
  return pattern.test(code);
}

// Pre-check if user is registered for this activity
async function preCheckRegistration(activityCode, studentId) {
  try {
    // Get current user activities
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.STUDENT_ACTIVITIES.replace('{studentId}', studentId);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { success: false, message: 'ไม่สามารถตรวจสอบการลงทะเบียนได้' };
    }

    const activities = await response.json();

    // Find activity with matching QR code
    const matchingActivity = activities.find(activity => activity.qrCode === activityCode);

    if (!matchingActivity) {
      return {
        success: false,
        message: 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้ กรุณาลงทะเบียนก่อนยืนยันการเข้าร่วม'
      };
    }

    // Check if already confirmed
    if (matchingActivity.isConfirmed) {
      return {
        success: false,
        message: 'คุณได้ยืนยันการเข้าร่วมกิจกรรมนี้แล้ว'
      };
    }

    return {
      success: true,
      activity: matchingActivity,
      message: 'สามารถยืนยันการเข้าร่วมได้'
    };

  } catch (error) {
    console.error('Pre-check error:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
  }
}

// Handle successful verification
function handleSuccessfulVerification(result, activityId) {
  showStatusMessage(result.message || 'ยืนยันการเข้าร่วมสำเร็จ!', 'success');

  // ⭐ Update button to show "ทำแบบประเมิน" state
  if (activityId) {
    updateButtonToAssessmentState(activityId);
  }

  // Close modal after delay and refresh activities
  setTimeout(() => {
    closeCodeInput();
    const studentId = currentUser.studentId || currentUser.userId;
    loadUserActivities(studentId);
  }, 2000);
}

// ⭐ NEW FUNCTION: Update button to assessment state
function updateButtonToAssessmentState(activityId) {
  const button = document.querySelector(`button[data-activity-id="${activityId}"]`);
  if (button) {
    button.classList.add('active');
    button.textContent = 'ทำแบบประเมิน';
    button.disabled = false;
    console.log(`Updated button for activity ${activityId} to assessment state`);
  }
}

// Handle failed verification
function handleFailedVerification(message) {
  showStatusMessage(message || 'รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่', 'error');
}

// Show status message
function showStatusMessage(message, type) {
  const statusElement = document.getElementById('status-message');
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.style.display = 'block';

  // Remove existing classes
  statusElement.className = 'status-message';

  // Add type class
  if (type === 'success') {
    statusElement.classList.add('status-success');
  } else if (type === 'error') {
    statusElement.classList.add('status-error');
  } else if (type === 'processing') {
    statusElement.classList.add('status-processing');
  }
}

// Hide status message
function hideStatusMessage() {
  const statusElement = document.getElementById('status-message');
  if (!statusElement) return;
  statusElement.style.display = 'none';
}

// Add Enter key support for code input
document.addEventListener('keypress', function(e) {
  const modal = document.getElementById('code-modal');
  if (e.key === 'Enter' && modal && modal.style.display === 'flex') {
    submitActivityCode();
  }
});

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

// Show user menu
function showUserMenu() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    localStorage.removeUser('userData');
    localStorage.removeItem('token');
    redirectToLogin();
  }
}

// ฟังก์ชันล็อกเอาท์
function logout() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    window.location.href = "login.html";
  }
}
