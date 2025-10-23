// ========================================
// Authentication Check Script
// เพิ่ม script นี้ในทุกหน้าที่ต้องการ login
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
        // ⭐️ MODIFIED: ใช้ข้อมูลจาก Session Storage
        const sessionData = JSON.parse(storedData);
        
        // ตรวจสอบความถูกต้องของข้อมูล
        if (!sessionData.user || !sessionData.token) {
            throw new Error('Invalid session data structure');
        }
        
        // เก็บข้อมูลไว้ใน window object
        window.userData = sessionData.user;
        window.userToken = sessionData.token;
        
        console.log('✅ User authenticated:', window.userData.name || window.userData.userId);
        console.log('   Role:', window.userData.role);
        
        // เรียกฟังก์ชัน initializePage ถ้ามี
        if (typeof initializePage === 'function') {
            initializePage();
        }
        
        // อัพเดทข้อมูลพื้นฐาน (ถ้ามี element)
        updateBasicUserInfo();
        
    } catch (error) {
        console.error('❌ Error loading session data:', error);
        // ⭐️ MODIFIED: ลบข้อมูลที่เสียหายก่อน Redirect
        sessionStorage.removeItem('AchieveHubUser');
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณา Login ใหม่');
        window.location.href = 'login.html';
    }
})();

// ========================================
// Navigation Function
// ========================================
function navigateTo(page) {
    if (!window.userToken || !window.userData) {
        console.error('No session data for navigation');
        window.location.href = 'login.html';
        return;
    }

    // ⭐️ MODIFIED: ไม่ต้องเข้ารหัสข้อมูล session และส่ง data=... อีก
    // หน้าปลายทางจะตรวจสอบ Session Storage เอง
    console.log('📍 Navigating to:', page);
    window.location.href = page;
}

// ========================================
// Logout Function
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
// Update Basic User Info (Unchanged)
// ========================================
function updateBasicUserInfo() {
    if (!window.userData) return;
    
    // ... (unchanged logic)
    const elements = {
        'user-name': window.userData.name || window.userData.userId,
        'student-name': window.userData.name || '-',
        'user-email': window.userData.email || '-',
        'user-faculty': window.userData.faculty || '-',
        'user-department': window.userData.department || '-',
        'user-role': window.userData.role === 'student' ? 'นักศึกษา' : 'อาจารย์'
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
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