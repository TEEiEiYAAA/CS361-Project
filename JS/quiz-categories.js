// quiz-categories.js (เวอร์ชันนักสืบ 🕵️‍♂️)

const EXAM_LIST_URL = 'https://quiz-exam-data.s3.us-east-1.amazonaws.com/exams_list.json';
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod'; 

let allExams = [];

document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.studentId || userData.role !== 'student') {
        alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
        window.location.href = "login.html"; 
        return;
    }
    loadAllQuizzes(userData.studentId);
    setupTabs();
});

async function loadAllQuizzes(studentId) {
    const listContainer = document.getElementById('quiz-list-data'); 
    listContainer.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        // 1. โหลดรายการโจทย์จาก S3
        const examResponse = await fetch(EXAM_LIST_URL);
        const examData = await examResponse.json();
        allExams = examData.availableExams;

        // 2. ยิงไปถาม API ใหม่ (/completed)
        try {
            // ★★★ แก้ Link ตรงนี้ ★★★
            const historyResponse = await fetch(`${API_BASE_URL}/students/${studentId}/completed`);
            
            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                console.log("✅ ข้อมูลจาก Server:", historyData);

                // --- โซนแกะกล่องข้อมูล (เผื่อ Server ส่งมาหลายท่า) ---
                let skillsList = [];
                if (Array.isArray(historyData)) {
                    skillsList = historyData;
                } else if (historyData.body) {
                    try {
                        skillsList = (typeof historyData.body === 'string') 
                            ? JSON.parse(historyData.body) 
                            : historyData.body;
                    } catch (e) { console.error("แกะ Body ไม่ได้", e); }
                }
                
                if (!Array.isArray(skillsList)) skillsList = [];
                // -----------------------------------------------

                const passedSkillIds = skillsList.map(item => item.skillId);
                console.log("🔑 รายชื่อวิชาที่ผ่าน:", passedSkillIds);

                // 3. อัปเดตสถานะ
                allExams.forEach(exam => {
                    if (passedSkillIds.includes(exam.id)) {
                        exam.status = 'completed';
                    }
                });
            }
        } catch (err) {
            console.warn("ดึงประวัติไม่สำเร็จ:", err);
        }

        // แสดงผล (เริ่มที่แท็บ Available)
        renderQuizzes('available');

    } catch (error) {
        console.error('Error:', error);
        listContainer.innerHTML = '<div class="error-message">โหลดข้อมูลไม่สำเร็จ</div>';
    }
}

// ... (ส่วน setupTabs และ renderQuizzes เหมือนเดิม ไม่ต้องแก้) ...
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

    let html = '';
    filteredExams.forEach(exam => {
        const quizLink = `quiz.html?examUrl=${encodeURIComponent(exam.fileUrl)}&skillId=${exam.id}`;
        let buttonHtml = (filterType === 'available') 
            ? `<a href="${quizLink}" class="quiz-start-btn">เริ่มทำแบบทดสอบ</a>`
            : `<span class="score-badge" style="background:#E6F7F0; color:#28A745; padding:5px 15px; border-radius:15px;">ผ่านการทดสอบแล้ว</span>`;

        html += `
            <div class="quiz-data-row">
                <span>${exam.subject}</span>
                <span>${exam.level}</span>
                <span>${exam.plo}</span>
                <div class="quiz-action">${buttonHtml}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}