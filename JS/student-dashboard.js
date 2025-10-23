// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
const REQUIRED_ACTIVITIES_COUNT = 3;

// ⭐️ MODIFIED: ฟังก์ชันหลักที่ถูกเรียกโดย auth-check.js
function initializeStudentDashboard() {
    // ⭐️ ตรวจสอบ Role
    if (!window.userData || window.userData.role !== 'student') {
        console.error('Authentication failed - not a student:', window.userData.role);
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        // ใช้ navigateTo ที่อยู่ใน auth-check.js
        if (typeof navigateTo === 'function') {
            navigateTo("login.html");
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    // ⭐️ DELETED: Logic การแสดงผลข้อมูลส่วนตัวถูกลบออก (ย้ายไป auth-check.js)
    
    // ดึงข้อมูลทักษะจาก API
    const studentInfo = window.userData;
    const studentId = studentInfo.userId || studentInfo.userId;
    loadAllSkillData(studentId);
}

// ⭐️ MODIFIED: กำหนดให้ auth-check.js เรียกฟังก์ชันนี้เมื่อ Authentication ผ่าน
window.initializePage = initializeStudentDashboard;


// ฟังก์ชันดึงข้อมูลทักษะทั้งหมด (unchanged)
async function loadAllSkillData(studentId) {
    try {
        // 1. ดึงข้อมูลทักษะที่นักศึกษามี
        const skillResponse = await fetchAllSkillsFromAPI(studentId);
        
        // 2. ดึงข้อมูลกิจกรรมที่เข้าร่วม (ใช้ mock data เดิม)
        const activityResponse = await fetchStudentActivities(studentId);
        
        // 3. แสดงผลทักษะ
        displaySkillProgress(skillResponse.data, activityResponse.data);
        
        // 4. แสดงผลแบบทดสอบ
        displayQuizzes(skillResponse.data.pendingSkills);

    } catch (error) {
        console.error('Error loading all skill data:', error);
        document.getElementById('progress-text').textContent = "Error";
        document.getElementById('quiz-container').innerHTML = `<div class="error-message">ไม่สามารถโหลดข้อมูลทักษะได้: ${error.message}</div>`;
    }
}

// ฟังก์ชันเรียก API ดึงข้อมูลทักษะ (unchanged, relies on global window.userToken)
async function fetchAllSkillsFromAPI(studentId) {
    const response = await fetch(`${API_BASE_URL}/student/skills`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.userToken}` // ใช้ Global Token
        },
        body: JSON.stringify({ studentId: studentId })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

// ฟังก์ชันเรียก API ดึงข้อมูลกิจกรรม (unchanged)
async function fetchStudentActivities(studentId) {
    // โค้ดสำหรับเรียกข้อมูลกิจกรรม
    // ... (สมมติว่า API นี้คืนค่า { data: { completedActivities: 5 } } )
    return { data: { completedActivities: 5 } };
}

// ฟังก์ชันแสดงผลความคืบหน้าทักษะ (unchanged)
function displaySkillProgress(skillData, activityData) {
    const totalRequiredSkills = skillData.totalRequiredSkills || 0;
    const completedRequiredSkills = skillData.completedRequiredSkills || 0;
    const completedOptionalSkills = skillData.completedOptionalSkills || 0;
    
    const progressPercent = totalRequiredSkills > 0 ? (completedRequiredSkills / totalRequiredSkills) : 0;
    const offset = 282.74 - (282.74 * progressPercent);
    
    document.getElementById('progress-indicator').style.strokeDashoffset = offset;
    document.getElementById('progress-text').textContent = `${completedRequiredSkills}/${totalRequiredSkills}`;
    
    document.getElementById('completed-required-skills').textContent = completedRequiredSkills;
    document.getElementById('pending-required-skills').textContent = totalRequiredSkills - completedRequiredSkills;
    document.getElementById('completed-optional-skills').textContent = completedOptionalSkills;
    
    const activityCount = activityData.completedActivities || 0;
    document.getElementById('activity-progress').textContent = `${activityCount}/${REQUIRED_ACTIVITIES_COUNT}`;
}

// ฟังก์ชันแสดงผลแบบทดสอบ (unchanged)
function displayQuizzes(pendingSkills) {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = '';
    
    if (!pendingSkills || pendingSkills.length === 0) {
        quizContainer.innerHTML = `<div class="info-message">คุณได้ทักษะบังคับครบถ้วนแล้ว!</div>`;
        return;
    }

    pendingSkills.forEach(skill => {
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.innerHTML = `
            <h3>${skill.name}</h3>
            <p>ทักษะที่ยังขาด: ${skill.category}</p>
            <button onclick="startQuiz('${skill.id}')">เริ่มทำแบบทดสอบ</button>
        `;
        quizContainer.appendChild(quizCard);
    });
}

// เริ่มทำแบบทดสอบ
function startQuiz(skillId) {
    const skillNames = {
        'skill001': 'ด้านการทำงานเป็นทีม',
        // ... (Define more skill names)
    };
    
    const skillName = skillNames[skillId] || 'ทักษะ';
    
    const confirmStart = confirm(
        `🎯 ต้องการเริ่มทำแบบทดสอบ "${skillName}" หรือไม่?\n\n` +
        `📋 จำนวนข้อ: 10 ข้อ\n` +
        `⏰ เวลา: 15 นาที\n` +
        `📊 เกณฑ์ผ่าน: 70% (7 ข้อขึ้นไป)\n` +
        `🏆 หากผ่าน: จะได้รับทักษะนี้\n\n` +
        `⚠️ หมายเหตุ: เมื่อเริ่มแล้วจะนับเวลาทันที`
    );
    
    if (confirmStart) {
        // ⭐️ MODIFIED: ใช้ navigateTo (ที่อยู่ใน auth-check.js) และไม่ส่ง data=...
        if (typeof navigateTo === 'function') {
            navigateTo(`quiz.html?skillId=${skillId}`); 
        } else {
            window.location.href = `quiz.html?skillId=${skillId}`;
        }
    }
}