// ========================================
// Authentication Check Script
// เพิ่ม script นี้ในทุกหน้าที่ต้องการ login
// ========================================

(function() {
    console.log('🔐 Checking authentication...');
    
    // ดึงข้อมูลจาก URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (!dataParam) {
        console.error('❌ No session data found - redirecting to login');
        alert('กรุณาเข้าสู่ระบบ');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // ถอดรหัสข้อมูลจาก URL
        const decodedData = decodeURIComponent(atob(dataParam));
        const sessionData = JSON.parse(decodedData);
        
        // ตรวจสอบความถูกต้องของข้อมูล
        if (!sessionData.user || !sessionData.token) {
            throw new Error('Invalid session data structure');
        }
        
        // เก็บข้อมูลไว้ใน window object
        window.userData = sessionData.user;
        window.userToken = sessionData.token;
        
        console.log('✅ User authenticated:', window.userData.name || window.userData.userId);
        console.log('   Role:', window.userData.role);
        console.log('   Type:', window.userData.type);
        
        // ตรวจสอบ role ถ้าจำเป็น (สำหรับหน้าเฉพาะ)
        // ตัวอย่าง: ถ้าหน้านี้เฉพาะ student
        // if (window.userData.role !== 'student') {
        //     alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        //     window.location.href = 'login.html';
        //     return;
        // }
        
        // เรียกฟังก์ชัน initialize ถ้ามี
        if (typeof initializePage === 'function') {
            initializePage();
        }
        
        // อัพเดทข้อมูลพื้นฐาน (ถ้ามี element)
        updateBasicUserInfo();
        
    } catch (error) {
        console.error('❌ Error loading session data:', error);
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

    // เข้ารหัสข้อมูล session เพื่อส่งต่อ
    const sessionData = {
        token: window.userToken,
        user: window.userData
    };
    const userDataEncoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));

    // Navigate พร้อมส่งข้อมูล
    console.log('📍 Navigating to:', page);
    window.location.href = `${page}?data=${userDataEncoded}`;
}

// ========================================
// Logout Function
// ========================================
function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        console.log('👋 Logging out...');
        // ลบข้อมูล session
        window.userData = null;
        window.userToken = null;
        
        // กลับไปหน้า login
        window.location.href = "login.html";
    }
}

// ========================================
// Update Basic User Info
// ========================================
function updateBasicUserInfo() {
    if (!window.userData) return;
    
    // อัพเดทชื่อผู้ใช้ (ถ้ามี element)
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
    
    // อัพเดท title ของ user icon (ถ้ามี)
    const userIcon = document.getElementById('user-icon');
    if (userIcon) {
        userIcon.title = `สวัสดี, ${window.userData.name || window.userData.userId}`;
    }
}

// ========================================
// Prevent Back Button After Logout
// ========================================
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};

// ========================================
// Helper: Get Current User Data
// ========================================
function getCurrentUser() {
    return window.userData;
}

function getCurrentToken() {
    return window.userToken;
}

console.log('✅ Auth check script loaded');