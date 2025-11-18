// --- ค่าคงที่ (เหมือนเดิม) ---
const EXAM_LIST_URL = 'https://quiz-exam-data.s3.us-east-1.amazonaws.com/exams_list.json';
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
let allExams = [];

// ❌ ไม่ต้องมี DOMContentLoaded แล้ว
// ✅ เปลี่ยนชื่อฟังก์ชันเป็น InitializePage เพื่อให้ auth-check.js เรียกใช้งาน
async function InitializePage() {
    console.log("🚀 Auth Check ผ่านแล้ว เริ่มทำงาน InitializePage...");

    // 1. ดึงข้อมูล User และ Token
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
    
    const studentId = userData.studentId;
    const token = sessionData.token;

    // เช็กความชัวร์อีกรอบ
    if (!studentId || !token) {
        alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
        window.location.href = "login.html";
        return;
    }

    // 2. สร้างปุ่ม Tabs (ย้ายมาทำตรงนี้)
    setupTabs();

    // 3. เริ่มโหลดข้อมูล
    const listContainer = document.getElementById('quiz-list-data');
    listContainer.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        // --- A. โหลดรายการโจทย์จาก S3 ---
        const examResponse = await fetch(EXAM_LIST_URL);
        const examData = await examResponse.json();
        allExams = examData.availableExams;

        // --- B. ยิง API /completed เพื่อดูประวัติ ---
        try {
            const historyResponse = await fetch(`${API_BASE_URL}/students/${studentId}/completed`, {
                headers: {
                    'Authorization': 'Bearer ' + token  // แนบ Token
                }
            });

            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                console.log("✅ ข้อมูลประวัติ:", historyData);

                // แกะกล่อง Body
                let skillsList = [];
                if (Array.isArray(historyData)) {
                    skillsList = historyData;
                } else if (historyData.body) {
                    try {
                        skillsList = (typeof historyData.body === 'string') ? JSON.parse(historyData.body) : historyData.body;
                    } catch (e) { console.error("Parse Error", e); }
                }
                if (!Array.isArray(skillsList)) skillsList = [];

                // เช็กว่าผ่านวิชาไหนบ้าง
                const passedSkillIds = skillsList.map(item => item.skillId);
                
                // อัปเดตสถานะใน allExams
                allExams.forEach(exam => {
                    if (passedSkillIds.some(passedId => passedId.toLowerCase() === exam.id.toLowerCase())) {
                        exam.status = 'completed';
                    }
                });
            } else {
                console.warn("Server ตอบกลับ:", historyResponse.status);
                // จัดการกรณี Token หมดอายุ
                if (historyResponse.status === 401 || historyResponse.status === 403) {
                    console.error("Token หมดอายุ");
                }
            }
        } catch (err) {
            console.warn("ดึงประวัติไม่สำเร็จ (ข้ามไปแสดงผล):", err);
        }

        // --- C. แสดงผลหน้าเว็บ ---
        renderQuizzes('available');

    } catch (error) {
        console.error('Error:', error);
        listContainer.innerHTML = '<div class="error-message">โหลดข้อมูลไม่สำเร็จ</div>';
    }
}

// --- ฟังก์ชัน Setup Tabs และ Render (คงเดิมไว้ ไม่ต้องแก้) ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderQuizzes(button.dataset.filter);
        });
    });
}

function renderQuizzes(filterType) {
    const container = document.getElementById('quiz-list-data');
    const availableHeader = document.getElementById('available-header');
    const doneHeader = document.getElementById('done-header');
    
    container.innerHTML = ''; 

    let filteredExams = [];
    if (filterType === 'available') {
        filteredExams = allExams.filter(exam => exam.status === 'available');
        if(availableHeader) availableHeader.style.display = 'grid'; 
        if(doneHeader) doneHeader.style.display = 'none';
    } else {
        filteredExams = allExams.filter(exam => exam.status === 'completed');
        if(availableHeader) availableHeader.style.display = 'none';
        if(doneHeader) doneHeader.style.display = 'grid';
    }

    if (filteredExams.length === 0) {
        container.innerHTML = '<div class="empty-message">ไม่มีรายการในหมวดหมู่นี้</div>';
        return;
    }

    const groupedExams = filteredExams.reduce((acc, exam) => {
        const subject = exam.subject; 
        if (!acc[subject]) { acc[subject] = []; }
        acc[subject].push(exam);
        return acc;
    }, {});

    let html = '';
    for (const [subjectName, examsInGroup] of Object.entries(groupedExams)) {
        html += `
            <div class="accordion-card">
                <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                    <span class="group-name">${subjectName}</span>
                    <i class="fas fa-chevron-down arrow-icon"></i>
                </div>
                <div class="accordion-body">
        `;
        examsInGroup.forEach(exam => {
            const quizLink = `quiz.html?examUrl=${encodeURIComponent(exam.fileUrl)}&skillId=${exam.id}`;
            let buttonHtml = (filterType === 'available') 
                ? `<a href="${quizLink}" class="quiz-start-btn">เริ่มทำแบบทดสอบ</a>`
                : `<span class="level-status" style="color: #28a745; font-weight:bold;">(ผ่านแล้ว)</span>`;

            html += `
                <div class="level-item">
                    <span class="level-name">${exam.level}</span>
                    <span class="level-plo">${exam.plo}</span>
                    <div class="quiz-action">${buttonHtml}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}