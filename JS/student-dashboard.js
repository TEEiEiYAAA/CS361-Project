console.log("🚀 student-dashboard.js: Script started loading..."); // LOG 1: ไฟล์เริ่มโหลด

// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

// ⭐️ ฟังก์ชันหลักที่ถูกเรียกโดย auth-check.js
function initializeStudentDashboard() {
    console.log("🏁 student-dashboard.js: initializeStudentDashboard() called"); // LOG 3: ฟังก์ชันเริ่มต้นถูกเรียก

    // ⭐️ ตรวจสอบ Role
    if (!window.userData || window.userData.role !== 'student') {
        console.error('Authentication failed - not a student:', window.userData.role);
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        if (typeof navigateTo === 'function') {
            navigateTo("login.html");
        } else {
            window.location.href = "login.html";
        }
        return;
    }
    
    // ดึงข้อมูลทักษะจาก API
    //const studentInfo = window.userData;
    //const studentId = studentInfo.userId || studentInfo.userId; 
    const studentId = window.userData.userId;
    loadAllSkillData(studentId);
}

// ⭐️ กำหนดให้ auth-check.js เรียกฟังก์ชันนี้เมื่อ Authentication ผ่าน
console.log("🔧 student-dashboard.js: Defining window.initializePage..."); // LOG 2: กำลังจะกำหนด initializePage
window.initializePage = initializeStudentDashboard;
console.log("✅ student-dashboard.js: window.initializePage is set.");


// ฟังก์ชันหลักที่โหลดข้อมูล (เวอร์ชันใหม่ที่รอรับ Summary)
async function loadAllSkillData(studentId) {
    console.log("🔄 student-dashboard.js: loadAllSkillData() called for student:", studentId); // LOG 4: เริ่มโหลดข้อมูล
    const progressText = document.getElementById('progress-text');
    const quizContainer = document.getElementById('quiz-container');

    // แสดงสถานะโหลด
    quizContainer.innerHTML = 
        `<div class="loading" style="text-align: center; padding: 20px; color: #666;">กำลังโหลดข้อมูล...</div>`;

    try {
        // 1. ดึง yearLevel ที่ auth-check.js คำนวณไว้
        const studentYear = window.userData.calculatedYearLevel;
        console.log("🔢 student-dashboard.js: Calculated year level:", studentYear); // LOG 5: แสดงชั้นปี

        if (!studentYear) {
            throw new Error("ไม่สามารถคำนวณชั้นปีของนักศึกษาได้ (จาก auth-check.js)");
        }

        // 2. เรียก API (getStudentSkillsSummary.py)
        const skillsApiUrl = `${API_BASE_URL}/students/${studentId}/skills?yearLevel=${studentYear}`;
        console.log("📡 student-dashboard.js: Calling API:", skillsApiUrl); // LOG 6: กำลังเรียก API
        
        const skillsResponse = await fetch(skillsApiUrl, {
             headers: {
                'Authorization': `Bearer ${window.userToken}`
            }
        });
        
        console.log("📈 student-dashboard.js: API response status:", skillsResponse.status); // LOG 7: สถานะ API

        if (!skillsResponse.ok) {
             throw new Error(`API call failed with status: ${skillsResponse.status}`);
        }
        
        const result = await skillsResponse.json(); 
        console.log("📊 student-dashboard.js: API response data:", result); // LOG 8: ข้อมูลที่ได้รับ

        if (result.success && result.data) {
            // 3. ส่ง "ผลสรุป" (Summary) ไปแสดงผล
            displaySkillProgress(result.data);
        } else {
            throw new Error(result.error || "รูปแบบข้อมูลที่ได้รับจาก API ไม่ถูกต้อง");
        }

    } catch (error) {
        console.error('❌ student-dashboard.js: Error loading skill data:', error); // LOG ERROR
        progressText.textContent = 'Error';
        quizContainer.innerHTML = `<div class="error-message" style="text-align: center; color: #ff6b6b; padding: 20px;">ไม่สามารถโหลดข้อมูลทักษะได้: ${error.message}</div>`;
    }
}

// ฟังก์ชันแสดงความคืบหน้า (รับ "ผลสรุป" มาแสดงผล)
function displaySkillProgress(summary) {
    console.log("✍️ student-dashboard.js: displaySkillProgress() called with summary:", summary); // LOG 9: เริ่มแสดงผล
    
    const totalRequiredSkills = summary.totalRequiredSkills || 0;
    const completedRequiredSkills = summary.completedRequiredSkills || 0;
    const completedOptionalSkills = summary.completedOptionalSkills || 0;
    const pendingSkills = summary.pendingSkills || [];
    
    const pendingRequiredSkillsCount = totalRequiredSkills - completedRequiredSkills;

    // อัปเดต Progress Circle
    const percentage = totalRequiredSkills > 0 ? (completedRequiredSkills / totalRequiredSkills) * 100 : 0;
    const progressIndicator = document.getElementById('progress-indicator');
    
    document.getElementById('progress-text').textContent = `${completedRequiredSkills}/${totalRequiredSkills}`;
    
    if (progressIndicator) {
        const circumference = 282.74; 
        const offset = circumference * (100 - percentage) / 100;
        progressIndicator.style.strokeDashoffset = offset;
        progressIndicator.style.strokeDasharray = circumference;
    }

    // อัปเดตรายละเอียดทักษะในกล่อง
    document.getElementById('completed-required-skills').textContent = completedRequiredSkills;
    document.getElementById('pending-required-skills').textContent = pendingRequiredSkillsCount;
    document.getElementById('completed-optional-skills').textContent = completedOptionalSkills;

    // เรียกใช้ฟังก์ชันแสดงรายการ "แบบทดสอบ" (ทักษะที่ขาดไป)
    displayPendingQuizzes(pendingSkills);
}


// ฟังก์ชันแสดงรายการทักษะที่ต้องทำ (ลบส่วนแบบทดสอบ)
function displayPendingQuizzes(pendingSkills) {
    console.log("📋 student-dashboard.js: displayPendingQuizzes() called with skills:", pendingSkills); // LOG 10: เริ่มแสดง Pending Skills
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = ''; 
    let html = '';

    if (!pendingSkills || pendingSkills.length === 0) {
        html = `<div class="info-message">คุณได้ทักษะบังคับครบถ้วนแล้วสำหรับชั้นปีนี้!</div>`;
    } else {
        pendingSkills.forEach(skill => {
            html += `
                <div class="quiz-card">
                    <h3>${skill.name}</h3>
                    <p>ทักษะที่ยังขาด: ${skill.category}</p>
                    <p class="quiz-note">ต้องเข้าร่วมกิจกรรมอย่างน้อย ${skill.requiredActivities || 3} ครั้งในหมวดนี้</p>
                    <button onclick="navigateToRecommendActivities()" class="primary-btn">ค้นหากิจกรรมที่แนะนำ</button>
                </div>
            `;
        });
    }
    
    quizContainer.innerHTML = html;
}

// ฟังก์ชันนำทางไปยังหน้ากิจกรรมที่แนะนำ (เรียกใช้ navigateTo ที่อยู่ใน auth-check.js)
function navigateToRecommendActivities() {
    if (typeof navigateTo === 'function') {
        navigateTo("recommend-activities.html");
    } else {
        window.location.href = "recommend-activities.html";
    }
}

/* // ⭐️ NEW: เพิ่ม Event Listener ที่ท้ายไฟล์
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 student-dashboard.js: DOM fully loaded.");
    
    // ตรวจสอบว่า auth-check.js ทำงานเสร็จแล้ว (window.userData ถูกตั้งค่าแล้ว)
    if (window.userData) {
        console.log("✅ student-dashboard.js: User data found, calling initialization.");
        initializeStudentDashboard(); // เรียกฟังก์ชันเริ่มต้น
    } else {
        // กรณีผิดพลาด: auth-check.js อาจยังไม่เสร็จ หรือมีปัญหา
        console.error("❌ student-dashboard.js: User data not found after DOM load. Auth check might have failed.");
        // อาจจะต้อง Redirect กลับไปหน้า Login หรือแสดงข้อความ Error
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้ กรุณาลองเข้าสู่ระบบใหม่");
        if(typeof navigateTo === 'function') navigateTo('login.html');
        else window.location.href = 'login.html';
    }
});

console.log("✅ student-dashboard.js: Script finished loading."); // LOG END: ไฟล์โหลดเสร็จ */