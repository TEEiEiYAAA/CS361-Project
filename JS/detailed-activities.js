// Configuration
const CONFIG = {
  API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
  ENDPOINTS: {
    GET_ACTIVITY_DETAIL: '/activities/{activityId}',
    REGISTER_ACTIVITY: '/activities/register'
  }
};

// ✅ เพิ่ม: map ชื่อเต็มของ PLO
const PLO_NAME_MAP = {
  PLO1: 'ความรู้พื้นฐานด้านการเขียนโปรแกรม',
  PLO2: 'ทักษะการพัฒนาและออกแบบระบบ',
  PLO3: 'ความรับผิดชอบและจริยธรรมวิชาชีพ',
  PLO4: 'การทำงานร่วมกับผู้อื่นและภาวะผู้นำ',
};

let currentActivity = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  if (!currentUser.studentId && !currentUser.userId) {
    window.location.href = "login.html";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('id');
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
    const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITY_DETAIL.replace('{activityId}', activityId);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
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
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
}

function extractPLOs(activity) {
  const raw = activity.plo || [];
  if (Array.isArray(raw)) return raw.map(x => String(x).trim().toUpperCase());
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map(x => String(x).trim().toUpperCase()); } catch {}
    return raw.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

function getLevelDisplay(levelRaw) {
  const level = (levelRaw || '').trim();
  if (!level) return '';
  return level === 'กลาง' ? 'ปานกลาง' : level;
}

// Display activity details
function displayActivityDetail(activity) {
  const mainContent = document.getElementById('main-content');

  const startDate = formatDateTime(activity.startDateTime);
  const endDate   = formatDateTime(activity.endDateTime);

  // ✅ ใช้ skillCategory จากกิจกรรม (fallback เป็น skill.category)
  const skillCategory = activity.skillCategory || activity.skill?.category || '';
  const skillBadgeClass = (skillCategory || '').toLowerCase().replace(/\s+/g, '-');
  const skillDisplayName =
    skillCategory === 'soft skill'  ? 'Soft Skill'  :
    skillCategory === 'hard skill'  ? 'Hard Skill'  :
    skillCategory === 'multi-skill' ? 'Multi-Skill' : 'ทักษะทั่วไป';

  // ✅ badge ระดับ
  const levelDisplay = getLevelDisplay(activity.level);
  const levelBadge   = levelDisplay ? `<span class="level-badge">${levelDisplay}</span>` : '';

  // รูป
  const imageUrl = activity.imageUrl || null;
  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${activity.name}" class="skill-image">`
    : `<div class="img-placeholder">🖼️</div>`;

  // ✅ PLO แสดงชื่อเต็ม
  const plos = extractPLOs(activity);
  const ploFullNames = plos.map(code => PLO_NAME_MAP[code] || code);
  const ploBlock = ploFullNames.length
    ? `<div class="plo-box">
         <div class="sec-title">🎯 ทักษะที่ได้รับ</div>
         <div class="sec-body">
           ${activity.activityGroup ? `<p><strong>กลุ่มกิจกรรม:</strong> ${activity.activityGroup}</p>` : ''}
           ${ploFullNames.map((n, i) => {
              const code = plos[i] || '';
              // ถ้ามีคำอธิบายแยกมาใน activity.ploDescriptions จะต่อท้ายด้วย
              const desc = Array.isArray(activity.ploDescriptions) && activity.ploDescriptions[i]
                           ? ` — ${activity.ploDescriptions[i]}` : '';
              return `<div class="plo-line"><strong>${code}</strong>: ${n}${desc}</div>`;
            }).join('')}
           ${activity.suitableYearLevel ? `<p><strong>เหมาะสำหรับชั้นปี:</strong> ${activity.suitableYearLevel}</p>` : ''}
           ${activity.requiredActivities ? `<p><strong>กิจกรรมที่ต้องเข้าร่วม:</strong> ${activity.requiredActivities} กิจกรรม</p>` : ''}
         </div>
       </div>`
    : '';

  // ปุ่มสมัคร: เปิดก่อนวันเริ่มเท่านั้น
  const now = new Date();
  const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
  const end   = activity.endDateTime ? new Date(activity.endDateTime)   : null;
  let canRegister = true, btnText = 'สมัครเข้าร่วม';
  if (start && now >= start) {
    canRegister = false;
    btnText = (end && now <= end) ? 'กำลังจัดกิจกรรม' : 'ปิดรับสมัครแล้ว';
  }

  mainContent.innerHTML = `
    <div class="detail-card">
      ${imageHtml}

      <div class="title-row">
        <h2 class="activity-name">${activity.name || 'ไม่มีชื่อกิจกรรม'}</h2>
        <div class="badges-row">
          ${skillCategory ? `<span class="skill-badge ${skillBadgeClass}">${skillDisplayName}</span>` : ''}
          ${levelBadge}
        </div>
      </div>

      <p class="activity-desc">${activity.description || 'ไม่มีคำอธิบาย'}</p>

      <div class="time-box">
        <div class="sec-title">📅 รายละเอียดเวลา</div>
        <div class="sec-body">
          <p><strong>เริ่ม:</strong> ${startDate}</p>
          <p><strong>สิ้นสุด:</strong> ${endDate}</p>
          <p><strong>สถานที่:</strong> ${activity.location || 'ไม่ระบุสถานที่'}</p>
        </div>
      </div>

      ${ploBlock}

      <button type="button" id="registerBtn" class="join-button" ${canRegister ? '' : 'disabled'}>
        ${btnText}
      </button>
    </div>
  `;

  // bind ปุ่มสมัคร
  const registerBtn = document.getElementById('registerBtn');
  if (canRegister) {
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
      headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ activityId: currentActivity.activityId, studentId })
    });
    const result = await response.json();

    if (result.success) {
      alert('สมัครเข้าร่วมกิจกรรมสำเร็จ!\nกำลังนำทางไปหน้ากิจกรรมของฉัน...');
      registerBtn.textContent = 'สมัครเรียบร้อยแล้ว';
      registerBtn.style.backgroundColor = '#4CAF50';
      setTimeout(() => { window.location.href = 'my-activities.html'; }, 1200);
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

// Logout via icon
function showUserMenu() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    window.location.href = "login.html";
  }
}
