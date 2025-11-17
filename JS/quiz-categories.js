// --- ค่าคงที่ (เหมือนเดิม) ---
const EXAM_LIST_URL = 'https://quiz-exam-data.s3.us-east-1.amazonaws.com/exams_list.json';
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
let allExams = [];

document.addEventListener('DOMContentLoaded', function() {
    // --- ❗️❗️ จุดแก้ไขที่ 1: แก้ "Guard" ---
    // อ่านข้อมูลจาก localStorage (ที่ login.js สร้างไว้)
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // เปลี่ยนจาก .userId เป็น .studentId
    if (!userData.studentId || userData.role !== 'student') {
        alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
        window.location.href = "login.html";
        return;
    }

    // ส่ง .studentId (ไม่ใช่ .userId) ไปให้ฟังก์ชัน
    loadAllQuizzes(userData.studentId);
    // --- จบจุดแก้ไขที่ 1 ---

    setupTabs();
});

async function loadAllQuizzes(studentId) { // <-- รับ studentId
    const listContainer = document.getElementById('quiz-list-data');
    listContainer.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    // --- ❗️❗️ จุดแก้ไขที่ 2: ดึง Token จาก "sessionStorage" ---
    // login.js เก็บ Token ไว้ใน sessionStorage ชื่อ 'AchieveHubUser'
    const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
    const token = sessionData.token; // <-- นี่คือ Token ที่ถูกต้อง

    // ดักไว้เผื่อ sessionStorage ก็ไม่มี (เช่น เปิดแท็บใหม่)
    if (!token) {
        alert('ไม่พบข้อมูลการยืนยันตัวตน (Token) กรุณาเข้าสู่ระบบใหม่');
        window.location.href = "login.html";
        return;
    }
    // --- จบจุดแก้ไขที่ 2 ---

    try {
        // 1. โหลดรายการโจทย์จาก S3 (เหมือนเดิม)
        const examResponse = await fetch(EXAM_LIST_URL);
        const examData = await examResponse.json();
        allExams = examData.availableExams;

        // 2. ยิงไปถาม API ใหม่ (/completed)
        try {
            // ❗️❗️ จุดแก้ไขที่ 3: ใส่ Header Authorization ❗️❗️
            const historyResponse = await fetch(`${API_BASE_URL}/students/${studentId}/completed`, {
                headers: {
                    // "ยื่นบัตรผ่าน" (Token) ให้ API
                    'Authorization': 'Bearer ' + token
                }
            });
            // --- จบจุดแก้ไขที่ 3 ---

            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                console.log("✅ ข้อมูลจาก Server:", historyData);

                // --- โซนแกะกล่องข้อมูล (เหมือนเดิม) ---
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
                // ---------------------------

                const passedSkillIds = skillsList.map(item => item.skillId);
                console.log("🔑 รายชื่อวิชาที่ผ่าน:", passedSkillIds);

                // 3. อัปเดตสถานะ (เหมือนเดิม)
                allExams.forEach(exam => {
                    if (passedSkillIds.some(passedId => passedId.toLowerCase() === exam.id.toLowerCase())) {
                        exam.status = 'completed';
                    }
                });
            } else {
                 // ถ้า Token ผิด หรือ API ไม่ให้เข้า
                console.error("Server ปฏิเสธ:", historyResponse.status, await historyResponse.text());
                // ถ้าโดน 401 หรือ 403 (Token หมดอายุ/ผิด) อาจจะต้องเด้งไป Login
                if (historyResponse.status === 401 || historyResponse.status === 403) {
                     alert('การยืนยันตัวตนหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                     window.location.href = "login.html";
                     return;
                }
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

// 
// --- ฟังก์ชัน setupTabs() และ renderQuizzes() ---
// --- (ไม่ต้องแก้ไข ใช้โค้ดเดิมของคุณได้เลย) ---
//
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
        if (!acc[subject]) {
            acc[subject] = []; 
        }
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