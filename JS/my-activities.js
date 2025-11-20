// Configuration
const CONFIG = {
    API_BASE_URL: 'https://jcxjc9ot0e.execute-api.us-east-1.amazonaws.com/prod',
    ENDPOINTS: {
        GET_ACTIVITIES: '/activities', // Master Data
        GET_LOCATIONS: '/locations',   // Location Data
        STUDENT_ACTIVITIES: '/students/{studentId}/activities', // User Data
        VERIFY_QR: '/activities/verify-qr',
        CONFIRM_ATTENDANCE: '/activities/confirm',
        CERTIFICATE: '/activities/{activityId}/certificate'
    }
};

// Global variables
let currentUser = null;
let myParticipations = []; 
let masterActivitiesMap = {}; // Map เก็บข้อมูลกิจกรรม (รูป, ชื่อ)
let locationsMap = {};        // Map เก็บข้อมูลสถานที่ (พิกัด)
let currentFilter = 'inprogress'; // Default Tab

// กำหนดให้ auth-check.js เรียกใช้
window.initializePage = initializeMyActivities;

/* ============================================================
   INITIALIZATION & DATA LOADING
   ============================================================ */

async function initializeMyActivities() {
    console.log("🏁 my-activities.js: initializing...");

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
        currentUser = sessionData.user || {};
    } catch (e) {}

    if (!currentUser || !currentUser.userId) {
        alert('กรุณาเข้าสู่ระบบ');
        window.location.href = "login.html";
        return;
    }

    setupTabButtons();
    setupGeoPopupHandlers(); 

    // โหลดข้อมูล 3 ส่วนพร้อมกัน (Master, Locations, User Status)
    await Promise.all([
        loadMasterActivities(),
        loadLocations(),
        loadUserParticipations(currentUser.userId)
    ]);

    // แสดงผลครั้งแรก
    filterAndRender();
}

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

// 1. โหลด Master Data (กิจกรรมทั้งหมด)
async function loadMasterActivities() {
    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITIES;
        const resp = await fetch(url);
        if (resp.ok) {
            const raw = await resp.json();
            const activities = raw.body ? JSON.parse(raw.body) : raw;
            activities.forEach(act => {
                const id = act.activityId || act.id;
                masterActivitiesMap[id] = act;
            });
            console.log("✅ Loaded Master Activities:", Object.keys(masterActivitiesMap).length);
        }
    } catch (err) {
        console.error("Failed to load master activities:", err);
    }
}

// 2. โหลด Location Data (พิกัดสถานที่)
async function loadLocations() {
    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_LOCATIONS;
        const resp = await fetch(url);
        if (resp.ok) {
            const locations = await resp.json();
            locations.forEach(loc => {
                // สมมติ Partition Key ของตาราง Locations ชื่อ locationId
                // ถ้าใน DB ชื่ออื่นให้แก้ตรงนี้ (เช่น loc.id)
                const id = loc.locationId || loc.id; 
                locationsMap[id] = loc;
            });
            console.log("✅ Loaded Locations:", Object.keys(locationsMap).length);
        }
    } catch (err) {
        console.error("Failed to load locations:", err);
    }
}

// 3. โหลด User Data (สถานะการเข้าร่วม)
async function loadUserParticipations(studentId) {
    const list = document.getElementById('activities-list');
    list.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.STUDENT_ACTIVITIES.replace('{studentId}', studentId);
        const token = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}').token;
        
        const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resp.ok) {
            myParticipations = await resp.json();
            console.log("✅ Loaded User Participations:", myParticipations.length);
        } else {
            myParticipations = [];
        }
    } catch (err) {
        console.error("Error loading participations:", err);
        list.innerHTML = `<div class="error-message">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
        myParticipations = [];
    }
}

/* ============================================================
   RENDERING & LOGIC
   ============================================================ */

function filterAndRender() {
    const list = document.getElementById('activities-list');
    list.innerHTML = '';

    if (myParticipations.length === 0) {
        list.innerHTML = `<div class="empty-message">คุณยังไม่ได้ลงทะเบียนกิจกรรมใดๆ</div>`;
        list.style.display = 'flex';
        list.style.justifyContent = 'center';
        return;
    }

    // Join Data: เอา User Data เป็นหลัก + Master Data
    const mergedItems = myParticipations.map(p => {
        const master = masterActivitiesMap[p.activityId] || {};
        return { ...master, ...p, name: master.name || 'กิจกรรมไม่ทราบชื่อ' }; 
    });

    // Filter
    const filtered = mergedItems.filter(item => {
        const life = getLifecycleState(item);
        
        if (currentFilter === 'upcoming') return life === 'UPCOMING';
        if (currentFilter === 'inprogress') return life === 'IN_PROGRESS';
        if (currentFilter === 'done') return life === 'ENDED' || item.surveyCompleted;
        
        return false;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-message">ไม่มีรายการในหมวดนี้</div>`;
        list.style.display = 'flex';
        list.style.justifyContent = 'center';
        return;
    }

    // Render Grid
    list.style.display = 'grid';
    filtered.forEach(item => {
        list.appendChild(createActivityCard(item));
    });
}

// ⭐️ Logic เวลา (แสดงก่อนเริ่ม 30 นาที)
function getLifecycleState(a) {
    const now = new Date();
    const start = a.startDateTime ? new Date(a.startDateTime) : null;
    const end   = a.endDateTime ? new Date(a.endDateTime)   : null;

    if (!start) return 'UPCOMING';

    // เริ่มแสดงในแท็บ "ดำเนินการ" ก่อนเวลาเริ่มจริง 30 นาที
    const showInProgressTime = new Date(start.getTime() - 30 * 60000);

    if (now < showInProgressTime) return 'UPCOMING';

    // แสดงในแท็บดำเนินการ ถ้ายังไม่จบ
    if (now >= showInProgressTime && (!end || now <= end)) return 'IN_PROGRESS';

    return 'ENDED';
}

// สร้างการ์ดกิจกรรม
function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    
    card.onclick = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        window.location.href = `detailed-activities.html?id=${activity.activityId}`;
    };

    // Badge
    const skillCategory = activity.skillCategory || '';
    const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
    const skillBadge = skillCategory ? `<span class="badge-skill ${skillBadgeClass}">${skillCategory}</span>` : '';
    
    const levelRaw = activity.level || '';
    const levelText = normalizeLevel(levelRaw);
    const levelClass = getLevelClass(levelRaw);
    const levelBadge = levelText ? `<span class="badge-level ${levelClass}">${levelText}</span>` : '';

    // Image
    const imageUrl = activity.imageUrl || '';
    const imageStyle = imageUrl ? `style="background-image:url('${imageUrl}')"` : '';

    // Meta
    const dateTxt = formatDateTime(activity.startDateTime);
    const LOCATIONS_MAP = { "SC1": "อาคารเรียนรวมสังคมศาสตร์ 1", "SC3": "อาคารเรียนรวมสังคมศาสตร์ 3", "LC2": "อาคารเรียนรวม 2", "LC4": "อาคารเรียนรวม 4", "LC5": "อาคารเรียนรวม 5" };
    const locName = LOCATIONS_MAP[activity.locationId] || activity.locationName || activity.locationId || '-';

    // PLO
    const ploText = (activity.plo && activity.plo.length > 0) ? `• ${activity.plo[0]}` : '';

    // Button Config
    const btnConfig = getButtonConfig(activity);
    
    // ⭐️ ปุ่มกด: มี ID เฉพาะตัว
    const buttonHtml = `<button id="btn-${activity.activityId}" class="action-btn ${btnConfig.className}" 
        onclick="event.stopPropagation(); handleActivityAction('${activity.activityId}', '${btnConfig.action}')"
        ${btnConfig.disabled ? 'disabled' : ''}>
        ${btnConfig.text}
    </button>`;

    card.innerHTML = `
        <div class="activity-image" ${imageStyle}>
            <div class="badge-row">${skillBadge}${levelBadge}</div>
        </div>
        <div class="activity-content">
            <h3 class="activity-title">${activity.name}</h3>
            <p class="activity-description">${activity.description || ''}</p>
            
            <div class="activity-meta">
                <div class="activity-date">📅 ${dateTxt}</div>
                <div class="activity-location">📍 ${locName}</div>
                <div class="activity-plo" style="margin-top:4px; color:#37798B; font-size:0.8rem;">${ploText}</div>
            </div>

            <div class="activity-actions">
                ${buttonHtml}
            </div>
        </div>
    `;
    return card;
}

// ⭐️ Logic ปุ่มกด (เช็คเวลา ±30 นาที)
function getButtonConfig(activity) {
    const life = getLifecycleState(activity);
    const isConfirmed = !!activity.isConfirmed;
    const surveyCompleted = !!activity.surveyCompleted;
    
    const now = new Date();
    const start = activity.startDateTime ? new Date(activity.startDateTime) : null;

    // 1. Upcoming
    if (life === 'UPCOMING') {
        return { text: 'ลงทะเบียนแล้ว', className: 'btn-gray', disabled: true, action: 'none' };
    }

    // 2. In Progress
    if (life === 'IN_PROGRESS') {
        if (isConfirmed) {
            return { text: 'ยืนยันเข้าร่วมสำเร็จ', className: 'btn-success-static', disabled: true, action: 'none' };
        } else {
            // เช็ค Deadline: Start + 30 นาที
            if (start) {
                const deadline = new Date(start.getTime() + 30 * 60000);
                
                if (now <= deadline) {
                    return { text: 'กดเพื่อยืนยันการเข้าร่วม', className: 'btn-red', disabled: false, action: 'confirm' };
                } else {
                    // เกิน 30 นาทีแล้ว -> หมดสิทธิ์
                    return { text: 'หมดเวลาเช็คชื่อ', className: 'btn-gray', disabled: true, action: 'none' };
                }
            }
        }
    }

    // 3. Ended
    if (life === 'ENDED') {
        if (isConfirmed) {
            if (surveyCompleted) {
                return { text: 'รับเกียรติบัตร', className: 'btn-certificate', disabled: false, action: 'certificate' };
            } else {
                return { text: 'ทำแบบประเมิน', className: 'btn-assessment', disabled: false, action: 'survey' };
            }
        } else {
            return { text: 'ไม่ได้เข้าร่วมกิจกรรม', className: 'btn-gray', disabled: true, action: 'none' };
        }
    }
    return { text: 'สถานะไม่ระบุ', className: 'btn-gray', disabled: true, action: 'none' };
}

// Action Handler
function handleActivityAction(activityId, action) {
    if (action === 'confirm') openConfirmPopup(activityId);
    else if (action === 'survey') window.location.href = `Assessment.html?id=${activityId}`;
    else if (action === 'certificate') requestCertificate(activityId);
}

/* ============================================================
   ACTION FUNCTIONS (Certificate & Confirm)
   ============================================================ */

// ขอเกียรติบัตร
async function requestCertificate(activityId) {
    try {
        if (!currentUser || !currentUser.userId) {
            alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
            return;
        }
        const studentId = currentUser.userId;
        const button = document.getElementById(`btn-${activityId}`);

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "กำลังออกเกียรติบัตร...";
        }

        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.CERTIFICATE.replace("{activityId}", encodeURIComponent(activityId)) + `?studentId=${encodeURIComponent(studentId)}`;
        const token = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}').token;

        const res = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            alert(data.message || "เกิดข้อผิดพลาดในการออกเกียรติบัตร");
            return;
        }

        const cert = data.certificate;
        if (!cert || !cert.pdfUrl) {
            alert("ไม่พบไฟล์เกียรติบัตร");
            return;
        }

        window.open(cert.pdfUrl, "_blank");

    } catch (err) {
        console.error("Error while requesting certificate:", err);
        alert("เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง");
    } finally {
        const button = document.getElementById(`btn-${activityId}`);
        if (button) {
            button.disabled = false;
            if (button.dataset.originalText) button.textContent = button.dataset.originalText;
        }
    }
}

/* ============================================================
   POPUP GEOLOCATION LOGIC (With Mock Fallback)
   ============================================================ */
let popupRefs = null;
let confirmContext = { activityId: null, centerLat: null, centerLon: null, radiusM: 200, userLat: null, userLon: null };

function setupGeoPopupHandlers() {
    const popupEl = document.getElementById('popupConfirm');
    if (!popupEl) return;
    popupEl.querySelector('.btn-close').onclick = () => popupEl.style.display = 'none';
    popupEl.querySelector('.btn-confirm').onclick = onConfirmByGeo;
}

async function openConfirmPopup(activityId) {
    const activity = masterActivitiesMap[activityId] || {};
    const locationId = activity.locationId;

    // 1. ค้นหาพิกัดจาก Locations Map
    const locationData = locationsMap[locationId];

    // ⭐️ ถ้าไม่เจอ (เช่น ยังไม่ได้ใส่ใน DB) ให้ใช้พิกัด Default (มธ.รังสิต) กัน error
    // หรือถ้า HTTP บล็อก GPS จะใช้ค่านี้เป็น Mock
    const targetLat = parseFloat(locationData?.latitude || 14.078013);
    const targetLon = parseFloat(locationData?.longitude || 100.602345);
    const radius = parseInt(locationData?.radiusMeters || activity.locationRadiusMeters || 200);

    confirmContext = {
        activityId,
        centerLat: targetLat,
        centerLon: targetLon,
        radiusM: radius,
        userLat: null,
        userLon: null
    };

    const popupEl = document.getElementById('popupConfirm');
    const locationName = locationData?.locationName || locationId || activity.location || "ไม่ระบุสถานที่";
    
    document.getElementById('popup-activity-name').innerHTML = `${activity.name}<br><small style="font-size:0.8em; color:#666">📍 ${locationName}</small>`;
    document.getElementById('radiusHint').textContent = `ต้องอยู่ในรัศมี ${confirmContext.radiusM} เมตร`;
    document.getElementById('locationText').textContent = 'กำลังขอพิกัด...';
    
    popupEl.style.display = 'flex';
    
    // 2. ขอพิกัด (พร้อมระบบ Mock Fallback สำหรับ HTTP)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Success (HTTPS)
            pos => {
                confirmContext.userLat = pos.coords.latitude;
                confirmContext.userLon = pos.coords.longitude;
                updateLocationStatus(confirmContext.userLat, confirmContext.userLon, true);
            },
            // Error (HTTP or Denied) -> Use Mock Location
            err => {
                console.warn("GPS Error (Likely HTTP), using Mock Location for Testing:", err);
                confirmContext.userLat = targetLat; 
                confirmContext.userLon = targetLon;
                updateLocationStatus(targetLat, targetLon, false); // false = mock
            }
        );
    } else {
        // Browser ไม่รองรับ -> Use Mock
        confirmContext.userLat = targetLat;
        confirmContext.userLon = targetLon;
        updateLocationStatus(targetLat, targetLon, false);
    }
}

function updateLocationStatus(lat, lon, isReal) {
    const textEl = document.getElementById('locationText');
    const mapFrame = document.getElementById('mapFrame');

    if (isReal) {
        textEl.innerHTML = `พิกัดของคุณ: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        textEl.style.color = 'black';
    } else {
        textEl.innerHTML = `⚠️ <b>Developer Mode:</b> ใช้พิกัดจำลอง (เนื่องจากเว็บไม่ใช่ HTTPS)<br>พิกัด: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        textEl.style.color = '#d35400';
    }

    if (mapFrame) {
        mapFrame.src = `https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed`;
    }
}

async function onConfirmByGeo() {
    if (!confirmContext.userLat) return alert('รอพิกัดสักครู่...');
    
    const dist = haversineMeters(confirmContext.userLat, confirmContext.userLon, confirmContext.centerLat, confirmContext.centerLon);
    
    if (dist > confirmContext.radiusM) {
        alert(`คุณอยู่นอกพื้นที่ (${dist.toFixed(0)} เมตร) กรุณาเข้าใกล้จุดเช็คอิน`);
        return;
    }

    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.CONFIRM_ATTENDANCE;
        const token = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}').token;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                activityId: confirmContext.activityId,
                studentId: currentUser.userId,
                latitude: confirmContext.userLat,
                longitude: confirmContext.userLon,
                currentTime: new Date().toISOString()
            })
        });

        const result = await res.json();
        if (result.success !== false) {
            alert('✅ ยืนยันตัวตนสำเร็จ!');
            document.getElementById('popupConfirm').style.display = 'none';
            // Reload Data
            await loadUserParticipations(currentUser.userId);
            filterAndRender();
        } else {
            alert('ยืนยันไม่สำเร็จ: ' + (result.message || ''));
        }

    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

// Helpers
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(dt) {
    if(!dt) return '-';
    try { return new Date(dt).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); } 
    catch { return '-'; }
}
function normalizeLevel(l) { 
    const s = String(l||'').toLowerCase(); 
    if(s.includes('basic')||s.includes('พื้นฐาน')) return 'พื้นฐาน';
    if(s.includes('medium')||s.includes('ปานกลาง')) return 'ปานกลาง';
    if(s.includes('advanced')||s.includes('ขั้นสูง')) return 'ขั้นสูง';
    return s; 
}
function getLevelClass(l) {
    const n = normalizeLevel(l);
    if(n==='พื้นฐาน') return 'level-basic';
    if(n==='ปานกลาง') return 'level-medium';
    if(n==='ขั้นสูง') return 'level-advanced';
    return '';
}
