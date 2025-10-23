// ========================================
// Helper: Calculate Year Level
// ========================================
function calculateYearLevel(userId) {
    if (!userId || userId.length < 2) return 'N/A';
    const admissionYear = userId.substring(0, 2);
    
    // กฎการเทียบปี: 68=ปี 1, 67=ปี 2, 66=ปี 3, 65=ปี 4
    switch (admissionYear) {
        case '68': return 'ปี 1';
        case '67': return 'ปี 2';
        case '66': return 'ปี 3';
        case '65': return 'ปี 4';
        default: return 'N/A';
    }
}


// ========================================
// Authentication Check Script (Global)
// ========================================

(function() {
    console.log('🔐 Checking authentication...');
    
    // ⭐️ MODIFIED: ดึงข้อมูลจาก Session Storage แทน URL parameter
    const storedData = sessionStorage.getItem('AchieveHubUser');
    
    if (!storedData) {
        console.error('❌ No session data found - redirecting to login');
        alert('กรุณาเข้าสู่ระบบ');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const sessionData = JSON.parse(storedData);
        
        if (!sessionData.user || !sessionData.token) {
            throw new Error('Invalid session data structure');
        }
        
        // เก็บข้อมูลไว้ใน window object
        window.userData = sessionData.user;
        window.userToken = sessionData.token;
        
        console.log('✅ User authenticated:', window.userData.name || window.userData.userId);
        
        // ⭐️ MODIFIED: อัปเดตข้อมูลพื้นฐานทันทีที่ Session ถูกโหลด
        updateBasicUserInfo();
        
        // เรียกฟังก์ชัน initializePage ถ้ามี (จะถูกกำหนดในไฟล์ Dashboard)
        if (typeof initializePage === 'function') {
            initializePage();
        }
        
    } catch (error) {
        console.error('❌ Error loading session data:', error);
        sessionStorage.removeItem('AchieveHubUser'); // Clear corrupted data
        alert('ข้อมูล Session ไม่ถูกต้อง กรุณา Login ใหม่');
        window.location.href = 'login.html';
    }
})();

// ========================================
// Navigation Function (Global)
// ========================================
function navigateTo(page) {
    if (!window.userToken || !window.userData) {
        console.error('No session data for navigation');
        window.location.href = 'login.html';
        return;
    }

    // ⭐️ MODIFIED: Navigate โดยไม่ต้องมี ?data=...
    console.log('📍 Navigating to:', page);
    window.location.href = page;
}

// ========================================
// Logout Function (Global)
// ========================================
function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        console.log('👋 Logging out...');
        // ⭐️ MODIFIED: ลบข้อมูล session จาก Session Storage
        sessionStorage.removeItem('AchieveHubUser');
        window.userData = null;
        window.userToken = null;
        
        // กลับไปหน้า login
        window.location.href = "login.html";
    }
}

// ========================================
// ⭐️ MODIFIED: Update Basic User Info (จัดการการแสดงผลข้อมูลนักศึกษา)
// ========================================
function updateBasicUserInfo() {
    if (!window.userData) return;
    
    const isStudent = window.userData.role === 'student';
    
    // 1. กำหนดค่าเริ่มต้นสำหรับ Element ทั้งหมด
    const elements = {
        // สำหรับ Header/Advisor Dashboard
        'user-name': window.userData.name || window.userData.userId,
        'user-role': window.userData.role === 'student' ? 'นักศึกษา' : 'อาจารย์'
    };
    
    // 2. ถ้าเป็นนักศึกษา, เพิ่มข้อมูลส่วนตัวที่ต้องแสดงบน student-dashboard.html
    if (isStudent) {
        const yearLevel = calculateYearLevel(window.userData.userId);
        
        // ⭐️ ใช้ ID และคีย์ที่ถูกต้องตาม TU API และ HTML ที่คุณแจ้ง
        elements['student-name'] = window.userData.name || window.userData.userId;
        elements['student-year'] = yearLevel;
        elements['student-faculty'] = window.userData.faculty || '-';
        elements['student-department'] = window.userData.department || '-';
    }
    
    // 3. วนลูปเพื่ออัปเดต Element ใน DOM
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });

    // อัพเดท title ของ user icon (ถ้ามี)
    const userIcon = document.getElementById('user-icon');
    if (userIcon) {
        userIcon.title = `สวัสดี, ${window.userData.name || window.userData.userId}`;
    }
}

// ========================================
// Prevent Back Button After Logout (Unchanged)
// ========================================
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};

// ========================================
// Helper: Get Current User Data (Unchanged)
// ========================================
function getCurrentUser() {
    return window.userData;
}

function getCurrentToken() {
    return window.userToken;
}

console.log('✅ Auth check script loaded');