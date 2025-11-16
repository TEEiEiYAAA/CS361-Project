// Configuration
const CONFIG = {
    API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
    ENDPOINTS: {
        GET_ACTIVITIES: '/activities',
        REGISTER_ACTIVITY: '/activities/register',
        GET_MY_ACTIVITIES: '/students/{studentId}/activities' // เพิ่ม endpoint สำหรับเช็คประวัติ
    }
};

// Global variables
let allActivities = [];
let currentFilter = 'all';
let myParticipations = new Set(); // เก็บ ID กิจกรรมที่สมัครแล้ว

// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Recommend Page Loaded — initializing...");
    setupTabButtons();
    loadActivities(null); // โหลดกิจกรรมทั้งหมดตอนเริ่ม
});

// Setup tab button event listeners
function setupTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked
            this.classList.add('active');
            
            // Set filter and reload
            currentFilter = this.dataset.filter;
            filterActivities();
        });
    });
}

// =========================================================
// DATA LOADING LOGIC
// =========================================================

// 1. ฟังก์ชันช่วยโหลดประวัติการสมัคร (แยกออกมาเพื่อให้ดูง่าย)
async function loadMyParticipations(studentId, token) {
    if (!studentId) return;
    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_MY_ACTIVITIES.replace('{studentId}', studentId);
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            data.forEach(item => {
                // เช็ค id ที่ได้มา (บางทีเป็น activityId หรือ id)
                const id = item.activityId || item.id; 
                if(id) myParticipations.add(id);
            });
            console.log("✅ Loaded participations:", myParticipations);
        }
    } catch (error) {
        console.warn("Failed to load participations:", error);
        // ไม่ throw error เพื่อให้หน้าเว็บยังทำงานต่อได้แม้โหลดประวัติไม่สำเร็จ
    }
}

// 2. ฟังก์ชันช่วยดึงข้อมูลกิจกรรม (แยกออกมา)
async function fetchActivityData(skillType, token) {
    let apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITIES;
    const params = new URLSearchParams();
    if (skillType) params.append('skillCategory', skillType);
    if (params.toString()) apiUrl += `?${params.toString()}`;

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    // รองรับกรณี API return body เป็น string หรือ json object
    return raw.body ? JSON.parse(raw.body) : raw;
}

// 3. ฟังก์ชันหลักสำหรับโหลดกิจกรรม (Orchestrator)
async function loadActivities(skillType = null) {
    const activitiesList = document.getElementById('activities-list');
    if (!activitiesList) return;

    try {
        activitiesList.innerHTML = `<div class="loading">กำลังโหลดกิจกรรม...</div>`;

        // --- Step A: เตรียม User Info ---
        let studentId = null;
        let token = '';
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
            const user = sessionData.user || {};
            studentId = user.userId || user.studentId;
            token = sessionData.token;
        } catch (e) {}

        // --- Step B: เรียก API พร้อมกัน (ถ้าล็อกอินแล้ว) ---
        const activityPromise = fetchActivityData(skillType, token);
        
        // ถ้ามี studentId ให้โหลดประวัติการสมัครด้วย
        if (studentId) {
            await loadMyParticipations(studentId, token);
        }

        // รอให้ได้ข้อมูลกิจกรรมมา
        const activities = await activityPromise;

        // --- Step C: จัดเรียงข้อมูล (Sort) ---
        const now = new Date();
        const upcoming = [];
        const past = [];

        activities.forEach(act => {
            const end = act.endDateTime ? new Date(act.endDateTime) : null;
            // แยกกิจกรรมที่จบไปแล้ว
            if (end && !isNaN(end.getTime()) && end < now) {
                past.push(act);
            } else {
                upcoming.push(act);
            }
        });

        // Sort by start date
        const sortByStart = (a, b) => {
            const da = new Date(a.startDateTime || 0);
            const db = new Date(b.startDateTime || 0);
            return da - db;
        };

        upcoming.sort(sortByStart);
        past.sort(sortByStart);

        // รวมกัน เอาที่ยังไม่จบขึ้นก่อน
        allActivities = [...upcoming, ...past];

        // --- Step D: แสดงผล ---
        displayActivities(allActivities);

    } catch (error) {
        console.error('[RECOMMEND] Error loading activities:', error);
        showError(error.message);
    }
}

function filterActivities() {
    console.log("[RECOMMEND] filterActivities: ", currentFilter);

    let skillCategory = null;
    switch (currentFilter) {
        case 'hard':
            skillCategory = 'hard skill';
            break;
        case 'soft':
            skillCategory = 'soft skill';
            break;
        case 'multi':
            skillCategory = 'multi-skill';
            break;
    }

    // เรียก loadActivities ใหม่พร้อม filter
    loadActivities(skillCategory);
}

// =========================================================
// UI RENDERING LOGIC
// =========================================================

function displayActivities(activities) {
    const activitiesList = document.getElementById('activities-list');
    
    if (!activities || activities.length === 0) {
        activitiesList.innerHTML = `
            <div class="empty-message">
                <p>ไม่พบกิจกรรมในหมวดหมู่นี้</p>
                <p style="font-size: 0.9rem; color: #888; margin-top: 10px;">
                    ลองเปลี่ยนหมวดหมู่หรือกลับมาดูใหม่ภายหลัง
                </p>
            </div>
        `;
        return;
    }
    
    // Create activities grid
    let html = '<div class="activities-grid">';
    activities.forEach(activity => {
        html += createActivityCard(activity);
    });
    html += '</div>';
    
    activitiesList.innerHTML = html;

    // 🔗 ผูกคลิกการ์ด -> ไปหน้า detailed-activities
    const cards = activitiesList.querySelectorAll('.activity-card');
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // ถ้าคลิกโดนปุ่ม (button) ไม่ต้องไปหน้า detail
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            
            const id = card.getAttribute('data-activity-id');
            if (id) window.location.href = `detailed-activities.html?activityId=${encodeURIComponent(id)}`;
        });
    });
}

// Create individual activity card HTML
function createActivityCard(activity) {
    const activityId = activity.activityId || activity.id;
    
    // --- Badge Skill Category ---
    const skillCategory = activity.skillCategory || '';
    const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
    const skillBadge = skillCategory
      ? `<span class="badge-skill ${skillBadgeClass}">${skillCategory}</span>`
      : '';
  
    // --- Badge Level ---
    const levelRaw = activity.level || activity.skillLevel || '';
    const levelText = normalizeLevel(levelRaw);
    const levelClass = getLevelClass(levelRaw);
    const levelBadge = levelText
      ? `<span class="badge-level ${levelClass}">${levelText}</span>`
      : '';
  
    const badgeRow = `
      <div class="badge-row">
        ${skillBadge}
        ${levelBadge}
      </div>
    `;
  
    // --- Date / Location / PLO ---
    const startTxt = formatDateTime(activity.startDateTime);
    
    const LOCATIONS_MAP = {
        "SC1": "อาคารเรียนรวมสังคมศาสตร์ 1",
        "SC3": "อาคารเรียนรวมสังคมศาสตร์ 3",
        "LC2": "อาคารเรียนรวม 2",
        "LC4": "อาคารเรียนรวม 4",
        "LC5": "อาคารเรียนรวม 5"
    };

    const locationName = LOCATIONS_MAP[activity.locationId] || activity.locationName || activity.locationId || '-';
    
    const PLO_FULL = {
        "PLO1": "ความรู้พื้นฐานด้านการเขียนโปรแกรม",
        "PLO2": "ทักษะการพัฒนาและออกแบบระบบ",
        "PLO3": "ความรับผิดชอบและจริยธรรมวิชาชีพ",
        "PLO4": "การทำงานร่วมกับผู้อื่นและภาวะผู้นำ"
    };

    const ploList = Array.isArray(activity.plo) ? activity.plo : [];
    const ploHtml = ploList
      .map(p => `<div class="plo-item">• ${p}: ${PLO_FULL[p] || ''}</div>`)
      .join('');
    const ploSection = ploList.length
      ? `<div class="plo-section">
           <div class="plo-title">ทักษะที่ได้รับ:</div>
           ${ploHtml}
         </div>`
      : '';
  
    const imageUrl = activity.imageUrl || '';
    const imageStyle = imageUrl ? `style="background-image:url('${imageUrl}')"` : '';
  
    // --- Logic ปุ่มสมัคร (หัวใจสำคัญ) ---
    let btnText = 'สมัครเข้าร่วม';
    let btnDisabled = false;
    let btnStyle = ''; // CSS inline สำหรับปุ่มเทา

    const now = new Date();
    const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
    const end = activity.endDateTime ? new Date(activity.endDateTime) : null;

    // 1. เช็คว่าสมัครหรือยัง (จาก Set ที่เราโหลดมา)
    if (myParticipations.has(activityId)) {
        btnText = 'สมัครเข้าร่วมแล้ว';
        btnDisabled = true; // กดซ้ำไม่ได้
        btnStyle = 'background-color: #9E9E9E; cursor: default;'; // สีเทา
    } 
    // 2. ถ้ายังไม่สมัคร ให้เช็คเวลา
    else if (start && now >= start) {
        btnDisabled = true;
        btnText = end && now <= end ? 'กำลังจัดกิจกรรม' : 'ปิดรับสมัครแล้ว';
    }

    // สร้างปุ่มพร้อม ID เฉพาะตัว (btn-activityId)
    const buttonHtml = `
        <button id="btn-${activityId}" class="register-btn ${btnDisabled ? 'disabled' : ''}" 
                style="${btnStyle}"
                ${btnDisabled ? 'disabled' : ''}
                onclick="event.stopPropagation(); registerForActivity('${activityId}','${activity.name || ''}')">
        ${btnText}
        </button>`;
  
    return `
    <div class="activity-card" data-activity-id="${activityId}">
        <div class="activity-image" ${imageStyle}>
          ${badgeRow}
        </div>
  
        <div class="activity-content">
          <h3 class="activity-title">${activity.name || 'ไม่มีชื่อกิจกรรม'}</h3>
          <p class="activity-description">${activity.description || ''}</p>
  
          <div class="activity-meta">
            <div class="activity-date">📅 ${startTxt}</div>
            <div class="activity-location">📍 ${locationName}</div>
          </div>
  
          ${ploSection}
  
          <div class="activity-actions">
            ${buttonHtml}
          </div>
        </div>
      </div>
    `;
}   

// =========================================================
// INTERACTION LOGIC (Register)
// =========================================================

async function registerForActivity(activityId, activityName) {
    // 1. ดึง User จาก Session Storage
    let studentId = null;
    let token = '';
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
        const user = sessionData.user || {};
        studentId = user.userId || user.studentId;
        token = sessionData.token;
    } catch (e) { console.error("Session Error:", e); }

    // 2. ตรวจสอบ Login
    if (!studentId) {
        alert('กรุณาเข้าสู่ระบบก่อนสมัครกิจกรรม');
        window.location.href = 'login.html';
        return;
    }
    
    // 3. ป้องกันการกดซ้ำกรณีปุ่มเป็น 'สมัครแล้ว' แต่ event ยังทำงาน (กันเหนียว)
    const btn = document.getElementById(`btn-${activityId}`);
    if (btn && btn.textContent === 'สมัครเข้าร่วมแล้ว') return;

    // 4. Popup ยืนยัน
    if (!confirm(`ยืนยันการสมัครเข้าร่วมกิจกรรม "${activityName}" หรือไม่?`)) {
        return;
    }
    
    // 5. หาปุ่มเพื่อเปลี่ยนสถานะเป็น Loading
    const originalText = btn ? btn.textContent : 'สมัครเข้าร่วม';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'กำลังสมัคร...';
        btn.style.backgroundColor = '#cccccc';
    }

    try {
        const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                activityId: activityId,
                studentId: studentId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // ✅ 6. สมัครสำเร็จ -> แจ้งเตือนและเปลี่ยนปุ่มเป็นสีเทา (ไม่เด้งหน้า)
            alert('✅ สมัครเข้าร่วมกิจกรรมสำเร็จ!');
            
            // อัปเดตสถานะใน Set ด้วย เพื่อให้กด Filter แล้วปุ่มยังคงสถานะเดิม
            myParticipations.add(activityId);
            
            if (btn) {
                btn.textContent = 'สมัครเข้าร่วมแล้ว';
                btn.style.backgroundColor = '#9E9E9E'; 
                btn.style.cursor = 'default';
                // btn.disabled = true; // คง disabled ไว้
            }
        } else {
            // กรณีมี Error (เช่น สมัครซ้ำไปแล้วจากที่อื่น)
            alert(`แจ้งเตือน: ${result.message}`);
            
            // ถ้า error บอกว่าสมัครไปแล้ว ก็เปลี่ยนปุ่มให้เป็นสมัครแล้วไปเลย
            if (result.message.includes('สมัครกิจกรรมนี้ไปแล้ว')) {
                myParticipations.add(activityId);
                if (btn) {
                    btn.textContent = 'สมัครเข้าร่วมแล้ว';
                    btn.style.backgroundColor = '#9E9E9E';
                    btn.style.cursor = 'default';
                }
            } else if (btn) {
                // Error อื่นๆ -> คืนค่าปุ่มเดิม ให้ลองกดใหม่ได้
                btn.disabled = false;
                btn.textContent = originalText;
                btn.style.backgroundColor = ''; // กลับไปใช้สีเขียวเดิม
            }
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        // คืนค่าปุ่มให้กดใหม่ได้
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }
    }
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================

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

// Normalize Level Name
function normalizeLevel(levelRaw) {
    const s = String(levelRaw || '').trim().toLowerCase();
    if (!s) return '';
    if (['พื้นฐาน','basic'].includes(s)) return 'พื้นฐาน';
    if (['ปานกลาง','medium'].includes(s)) return 'ปานกลาง';
    if (['ขั้นสูง','advanced'].includes(s)) return 'ขั้นสูง';
    return s;
}

function getLevelClass(levelRaw) {
    const lv = normalizeLevel(levelRaw);
    if (lv === 'พื้นฐาน') return 'level-basic';
    if (lv === 'ปานกลาง') return 'level-medium';
    if (lv === 'ขั้นสูง') return 'level-advanced';
    return '';
}

function showError(message) {
    const activitiesList = document.getElementById('activities-list');
    if (!activitiesList) return;
    
    activitiesList.innerHTML = `
        <div class="error-message">
            <p>เกิดข้อผิดพลาดในการโหลดกิจกรรม</p>
            <p>${message}</p>
            <button class="retry-btn" onclick="loadActivities()">ลองใหม่</button>
        </div>
    `;
}