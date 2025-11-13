// ========================================
// Helper: Calculate Year Level
// ========================================
function calculateYearLevel(studentId) {
    if (!studentId || studentId.length < 2) {
        console.warn('Invalid student ID for year calculation. Defaulting to Year 1.');
        return 1;
    }
    
    // 🚨 กำหนดปีปัจจุบัน (พ.ศ.) ตามตัวอย่าง 66=ปี3 คือ 2568
    const CURRENT_BE_YEAR = 2568; 
    
    try {
        const admissionYearCode = parseInt(studentId.substring(0, 2)); // เช่น 66
        
        // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
        if (isNaN(admissionYearCode)) {
             console.warn(`Invalid admission year code: ${studentId.substring(0, 2)}. Defaulting to Year 1.`);
             return 1;
        }

        const admissionYearBE = 2500 + admissionYearCode; // เช่น 2566
        
        // คำนวณชั้นปี: ปีปัจจุบัน - ปีที่เข้าศึกษา + 1
        let yearLevel = CURRENT_BE_YEAR - admissionYearBE + 1;
        
        // จำกัดค่าให้อยู่ในช่วง 1 ถึง 4
        yearLevel = Math.max(1, Math.min(4, yearLevel));
        
        console.log(`✅ auth-check.js: Calculated Year Level for ${studentId} (Entry: ${admissionYearBE}) as Year ${yearLevel}`); // เพิ่ม Log ยืนยัน
        
        return yearLevel;
    } catch (e) {
        console.error("❌ auth-check.js: Error in calculateYearLevel:", e);
        return 1; // ค่าเริ่มต้นหากเกิด Error
    }
}
// ========================================
// Update Basic User Info
// ========================================
function updateBasicUserInfo() {
    if (!window.userData) return;

    const isStudent = window.userData.role === 'student';

    // ⭐️ CORRECTED: ใช้ 'name' เป็นหลัก หาก 'displayname_th' ไม่มี
    const displayName = window.userData.name || window.userData.userId; // ใช้ 'name' ก่อน fallback ไป userId

    const elements = {
        // สำหรับ Header/Advisor Dashboard
        'user-name': displayName, // ใช้ displayName ที่ดึงมา
        'user-role': window.userData.role === 'student' ? 'นักศึกษา' : 'อาจารย์'
    };

    // ถ้าเป็นนักศึกษา, คำนวณและเพิ่มข้อมูลส่วนตัว
    if (isStudent) {
        const studentId = window.userData.userId;
        const yearLevel = calculateYearLevel(studentId); // ฟังก์ชันนี้อยู่ใน auth-check.js แล้ว

        // ⭐️ CORRECTED: ใช้ 'name' สำหรับชื่อนักศึกษา
        elements['student-name'] = displayName; // ใช้ displayName ที่ดึงมา
        elements['student-year'] = `ปี ${yearLevel}`;
        elements['student-faculty'] = window.userData.faculty || '-';
        elements['student-department'] = window.userData.department || '-';

        window.userData.calculatedYearLevel = yearLevel;
    }

    // วนลูปเพื่ออัปเดต Element ใน DOM
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });

    const userIcon = document.getElementById('user-icon');
    if (userIcon) {
        // ⭐️ CORRECTED: ใช้ 'name' สำหรับ title
        userIcon.title = `สวัสดี, ${displayName}`; // ใช้ displayName ที่ดึงมา
    }
}


// ========================================
// Authentication Check Script (Global)
// ========================================

(function() {
    console.log('🔐 Checking authentication...');
    
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
        
        window.userData = sessionData.user;
        window.userToken = sessionData.token;
        
        console.log('✅ User authenticated:', window.userData.displayname_th || window.userData.userId);
        
        // ⭐️ MODIFIED: เพิ่ม try...catch รอบ updateBasicUserInfo
        try {
            updateBasicUserInfo(); 
        } catch (updateError) {
            console.error("❌ auth-check.js: Error occurred within updateBasicUserInfo:", updateError);
        }
        
        // โค้ดส่วนนี้ควรจะทำงานต่อได้แม้ updateBasicUserInfo จะมี Error
        if (typeof initializePage === 'function') {
            console.log("🚀 auth-check.js: Calling initializePage()..."); // DEBUG LOG
            initializePage(); // เรียกฟังก์ชันเริ่มต้น (เช่น initializeStudentDashboard)
        } else {
             console.warn("🤔 auth-check.js: initializePage is not defined or not a function yet."); // DEBUG LOG
        }
        
    } catch (error) {
        console.error('❌ auth-check.js: Error loading session data:', error);
        sessionStorage.removeItem('AchieveHubUser');
        alert('ข้อมูล Session ไม่ถูกต้อง กรุณา Login ใหม่');
        window.location.href = 'login.html';
    }
})();


// ========================================
// Navigation & Logout Functions (Global) (คงเดิม)
// ========================================
function navigateTo(page) {
    if (!window.userToken || !window.userData) {
        window.location.href = 'login.html';
        return;
    }
    console.log('📍 Navigating to:', page);
    window.location.href = page;
}

function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        sessionStorage.removeItem('AchieveHubUser');
        localStorage.clear(); // เพิ่มเข้ามาเพื่อล้าง localStorage ด้วย
        window.userData = null;
        window.userToken = null;
        window.location.href = "login.html";
    }
}

// ========================================
// Helper Functions (คงเดิม)
// ========================================
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};
function getCurrentUser() { return window.userData; }
function getCurrentToken() { return window.userToken; }

console.log('✅ Auth check script loaded');