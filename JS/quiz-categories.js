// ตั้งค่า API (ควรใช้ที่เดียวกับไฟล์อื่น)
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

// รอให้หน้าเว็บโหลดเสร็จก่อน
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. ตรวจสอบการล็อกอิน (Guard Clause)
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.studentId || userData.role !== 'student') {
        window.location.href = "login.html"; // ถ้าไม่ใช่ นศ. ให้กลับไปหน้าล็อกอิน
        return;
    }
    
    const studentId = userData.studentId;

    // 2. ตั้งค่าการทำงานของแท็บ
    setupTabs(studentId);

    // 3. โหลดข้อมูลของแท็บแรก (Available) เป็นค่าเริ่มต้น
    loadQuizzes('available', studentId);
});

// ฟังก์ชันสำหรับตั้งค่าการคลิกแท็บ
function setupTabs(studentId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const availableHeader = document.getElementById('available-header');
    const doneHeader = document.getElementById('done-header');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;

            if (filter === 'available') {
                availableHeader.style.display = 'grid';
                doneHeader.style.display = 'none';
                // ★★★ ทำให้มุมบนขวาของกล่องเทา "โค้ง" ★★★
                availableHeader.style.borderRadius = '0 16px 0 0';
            } else {
                availableHeader.style.display = 'none';
                doneHeader.style.display = 'grid';
                // ★★★ ทำให้มุมบนซ้ายของกล่องเทา "โค้ง" ★★★
                doneHeader.style.borderRadius = '16px 0 0 0';
            }

            loadQuizzes(filter, studentId);
        });
    });
}

// ฟังก์ชันหลักสำหรับโหลดและแสดงผลข้อมูล
async function loadQuizzes(filter, studentId) {
    
    // 👇 ★★★ แก้แค่บรรทัดนี้ครับ ★★★
    const listContainer = document.getElementById('quiz-list-data'); 
    
    listContainer.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>'; // แสดงสถานะกำลังโหลด

    try {
        if (filter === 'available') {
            // --- โหลดแบบทดสอบที่ "เปิดให้ทำ" ---
            // (โค้ด "สมอง" ทั้งหมดที่คุณส่งมา)
            // 1. ดึงข้อมูลนักศึกษา (เพื่อเอา yearLevel)
            const studentInfo = await fetchStudentInfo(studentId);
            
            // 2. ดึงทักษะทั้งหมด (บังคับ + ไม่บังคับ)
            const requiredSkills = await fetchRequiredSkills(studentInfo.yearLevel);
            const optionalSkills = await fetchOptionalSkills(studentInfo.yearLevel);
            const allSkills = [...requiredSkills, ...optionalSkills];

            // 3. ดึงกิจกรรมที่ทำเสร็จแล้ว (เพื่อนับจำนวน)
            const activities = await fetchStudentActivities(studentId);
            const activityCount = countActivitiesPerSkill(activities, allSkills);

            // 4. ดึงทักษะที่ "ทำแบบทดสอบผ่านแล้ว" (เพื่อเอามาคัดออก)
            const passedSkills = await fetchStudentSkills(studentId);
            const passedSkillIds = new Set(passedSkills.map(s => s.skillId));
            
            // 5. กรองเฉพาะทักษะที่ "พร้อมสอบ"
            // (จำนวนกิจกรรมถึงเกณฑ์ AND ยังไม่เคยสอบผ่าน)
            const availableQuizzes = allSkills.filter(skill => {
                const count = activityCount[skill.skillId] || 0;
                const required = skill.requiredActivities || 3;
                const hasPassed = passedSkillIds.has(skill.skillId);
                
                return (count >= required) && !hasPassed;
            });
            
            displayAvailableQuizzes(availableQuizzes);

        } else if (filter === 'done') {
            // --- โหลดแบบทดสอบที่ "ทำไปแล้ว" ---
            // ดึงเฉพาะทักษะที่สอบผ่านแล้วจาก API
            const doneQuizzes = await fetchStudentSkills(studentId);
            displayDoneQuizzes(doneQuizzes);
        }

    } catch (error) {
        console.error('Error loading quizzes:', error);
        
        // บรรทัดนี้จะทำงานถูกต้องอัตโนมัติ 
        // เพราะเราแก้ตัวแปร listContainer ข้างบนแล้ว
        listContainer.innerHTML = '<div class="error-message">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// ฟังก์ชันแสดงผลแบบทดสอบที่ "เปิดให้ทำ"
function displayAvailableQuizzes(quizzes) {
    const container = document.getElementById('quiz-list-data'); // ★ เปลี่ยนเป้าหมาย
    if (quizzes.length === 0) {
        container.innerHTML = '...'; // (เหมือนเดิม)
        return;
    }

    let html = ''; // ★★★ เริ่มต้นด้วยค่าว่าง (ไม่ต้องสร้าง header) ★★★

    quizzes.forEach(skill => {
        html += `
            <div class="quiz-data-row">
                <span>${skill.name || 'ไม่มีชื่อทักษะ'}</span>
                <span>${skill.description || 'ทักษะระดับกลาง'}</span>
                <span>${skill.PLO || 'PL01'}</span>
                <div class="quiz-action">
                    <a href="quiz.html?skillId=${skill.skillId}" class="quiz-start-btn">
                        กดเพื่อทำแบบทดสอบ
                    </a>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function displayDoneQuizzes(quizzes) {
    const container = document.getElementById('quiz-list-data'); // ★ เปลี่ยนเป้าหมาย
    if (quizzes.length === 0) {
        container.innerHTML = '...'; // (เหมือนเดิม)
        return;
    }

    let html = ''; // ★★★ เริ่มต้นด้วยค่าว่าง (ไม่ต้องสร้าง header) ★★★

    quizzes.forEach(skill => {
        html += `
            <div class="quiz-data-row done">
                <span>${skill.skillName || 'ไม่มีชื่อทักษะ'}</span>
                <span>${skill.PLO || 'PL01'}</span>
                <td><span class="score-badge">ผ่าน ${skill.FinalScore || 80} คะแนน</span></td>
                <span>${formatDate(skill.completedDate)}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ฟังก์ชันแสดงผลแบบทดสอบที่ "ทำไปแล้ว"
function displayDoneQuizzes(quizzes) {
    const container = document.getElementById('quiz-list');
    if (quizzes.length === 0) {
        container.innerHTML = '<div class="empty-message">ยังไม่มีแบบทดสอบที่ทำผ่านแล้ว</div>';
        return;
    }

    // สร้าง Header ของตาราง
    let html = `
        <div class="quiz-header-row">
            <span>กลุ่มกิจกรรม</span>
            <span>ผลลัพธ์การเรียนรู้ (PLOs)</span>
            <span>คะแนน</span>
            <span>วันที่ผ่าน</span>
        </div>
    `;

    // สร้างแถวข้อมูล
    quizzes.forEach(skill => {
        html += `
            <div class="quiz-data-row done">
                <span>${skill.skillName || 'ไม่มีชื่อทักษะ'}</span>
                <span>${skill.PLO || 'PL01'}</span>
                <td><span class="score-badge">ผ่าน ${skill.FinalScore || 80} คะแนน</span></td>
                <span>${formatDate(skill.completedDate)}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ฟังก์ชัน Logout (จำเป็นสำหรับปุ่มใน Header)
function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = "login.html";
    }
}