const EXAM_LIST_URL = 'https://quiz-exam-data.s3.us-east-1.amazonaws.com/exams_list.json';
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
let allExams = [];

// ============================================================
// 1. ฟังก์ชันหลัก (Main Initialization)
// ============================================================
// ต้องใช้ชื่อ 'initializePage' (ตัวเล็ก) เพื่อให้ auth-check.js เรียกใช้งานได้ถูกต้อง
async function initializePage() {
    console.log("🚀 1. เริ่มทำงาน initializePage...");

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const sessionData = JSON.parse(sessionStorage.getItem('AchieveHubUser') || '{}');
    
    const studentId = userData.studentId;
    const token = sessionData.token;

    // สร้างปุ่ม Tab รอไว้ก่อน
    setupTabs();

    // เตรียมพื้นที่ Loading
    const listContainer = document.getElementById('quiz-list-data');
    if (listContainer) listContainer.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        // --- A. โหลดรายการโจทย์จาก S3 ---
        console.log("📥 2. กำลังโหลดไฟล์ JSON...");
        const examResponse = await fetch(EXAM_LIST_URL);
        const examData = await examResponse.json();
        allExams = examData.availableExams || []; 
        console.log(`✅ โหลดเสร็จ: ได้มาทั้งหมด ${allExams.length} รายการ`);

        // --- B. ดึงประวัติการสอบจาก API (ถ้ามี Token) ---
        if (studentId && token) {
            try {
                console.log("📥 3. กำลังดึงประวัติการสอบ...");
                const historyResponse = await fetch(`${API_BASE_URL}/students/${studentId}/completed`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    console.log("✅ ดึงประวัติเสร็จสิ้น:", historyData);

                    // แกะข้อมูล (เผื่อ API ส่งมาซ้อนใน body)
                    let skillsList = [];
                    if (Array.isArray(historyData)) {
                        skillsList = historyData;
                    } else if (historyData.body) {
                        try {
                            skillsList = (typeof historyData.body === 'string') ? JSON.parse(historyData.body) : historyData.body;
                        } catch (e) { console.error("Parse Body Error", e); }
                    }
                    if (!Array.isArray(skillsList)) skillsList = [];

                    const passedSkillIds = skillsList.map(item => item.skillId);
                    
                    // อัปเดตสถานะข้อสอบที่ผ่านแล้ว
                    allExams.forEach(exam => {
                        // เช็กแบบ Case Insensitive
                        if (passedSkillIds.some(passedId => passedId && passedId.toLowerCase() === exam.id.toLowerCase())) {
                            exam.status = 'completed';
                        }
                    });
                }
            } catch (err) {
                console.warn("⚠️ ไม่สามารถดึงประวัติได้ (อาจจะยังไม่เคยสอบ):", err);
            }
        }

        // --- C. Logic ล็อกข้อสอบ (Sequential Unlock) ---
        try {
            console.log("🔒 4. เริ่มคำนวณการล็อก (Lock Logic)...");
            
            // 1. จับกลุ่มวิชา
            const examsBySubject = {};
            allExams.forEach(exam => {
                const subj = exam.subject || "Other";
                if (!examsBySubject[subj]) examsBySubject[subj] = [];
                examsBySubject[subj].push(exam);
            });

            // 2. วนลูปเช็กเงื่อนไขทีละวิชา
            for (const subject in examsBySubject) {
                const group = examsBySubject[subject];
                // ค้นหาตามคีย์เวิร์ดใน level
                const easy = group.find(e => e.level && e.level.includes('ง่าย'));
                const medium = group.find(e => e.level && e.level.includes('กลาง'));
                const hard = group.find(e => e.level && e.level.includes('ยาก'));

                // กฎที่ 1: ถ้าง่ายยังไม่ผ่าน -> ล็อก กลาง และ ยาก
                if (easy && easy.status !== 'completed') {
                    if (medium) medium.status = 'locked';
                    if (hard) hard.status = 'locked';
                } 
                // กฎที่ 2: ถ้ากลางยังไม่ผ่าน (แต่ง่ายผ่านแล้ว) -> ล็อก ยาก
                else if (medium && medium.status !== 'completed') {
                    if (hard) hard.status = 'locked';
                }
            }
            console.log("✅ คำนวณล็อกเสร็จเรียบร้อย");
        } catch (logicErr) {
            console.error("❌ Error ในส่วน Logic ล็อก:", logicErr);
        }

        // --- D. แสดงผลหน้าเว็บ ---
        renderQuizzes('available');

    } catch (error) {
        console.error('❌ Error ใหญ่ (Main):', error);
        if (listContainer) listContainer.innerHTML = `<div class="error-message">เกิดข้อผิดพลาด: ${error.message}</div>`;
    }
}

// ============================================================
// 2. ฟังก์ชันแสดงผล (Render UI)
// ============================================================
function renderQuizzes(filterType) {
    console.log(`🎨 5. เริ่ม Render รายการ (${filterType})`);
    const container = document.getElementById('quiz-list-data');
    const availableHeader = document.getElementById('available-header');
    const doneHeader = document.getElementById('done-header');
    
    if(!container) return;
    container.innerHTML = ''; 

    // กรองข้อมูลตาม Tab
    let filteredExams = [];
    if (filterType === 'available') {
        // Tab แรก: แสดงทั้ง Available และ Locked
        filteredExams = allExams.filter(exam => !exam.status || exam.status === 'available' || exam.status === 'locked');
        if(availableHeader) availableHeader.style.display = 'grid'; 
        if(doneHeader) doneHeader.style.display = 'none';
    } else {
        // Tab สอง: แสดงเฉพาะ Completed
        filteredExams = allExams.filter(exam => exam.status === 'completed');
        if(availableHeader) availableHeader.style.display = 'none';
        if(doneHeader) doneHeader.style.display = 'grid';
    }

    if (filteredExams.length === 0) {
        container.innerHTML = '<div class="empty-message">ไม่มีรายการในหมวดหมู่นี้</div>';
        return;
    }

    // จัดกลุ่มเพื่อทำ Accordion
    const groupedExams = filteredExams.reduce((acc, exam) => {
        const subject = exam.subject || "อื่นๆ"; 
        if (!acc[subject]) acc[subject] = []; 
        acc[subject].push(exam);
        return acc;
    }, {});

    // สร้าง HTML
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
            let buttonHtml = '';

            // ตรวจสอบสถานะเพื่อเลือกปุ่ม
            if (exam.status === 'completed') {
                buttonHtml = `<span class="level-status" style="color: #28a745; font-weight:bold;">(ผ่านแล้ว)</span>`;
            } else if (exam.status === 'locked') {
                // ปุ่มล็อก: สีเทา + ข้อความ "ยังไม่เปิดให้ทำ"
                buttonHtml = `
                    <button class="quiz-start-btn" disabled style="background-color: #eee; cursor: not-allowed; border: 1px solid #ccc; color: #888; width: auto; padding: 5px 15px; font-size: 0.9rem;">
                        🔒 ยังไม่เปิดให้ทำ
                    </button>
                `;
            } else {
                // ปุ่มปกติ: สีแดงอ่อน
                buttonHtml = `<a href="${quizLink}" class="quiz-start-btn">เริ่มทำแบบทดสอบ</a>`;
            }

            html += `
                <div class="level-item">
                    <span class="item-subject">${subjectName}</span>
                    
                    <span class="level-name">${exam.level}</span>
                    
                    <span class="level-plo">${exam.plo}</span>
                    
                    <div class="quiz-action">${buttonHtml}</div>
                </div>
            `;
        });

        html += `</div></div>`;
    }
    
    container.innerHTML = html;
    console.log("✅ Render เสร็จสิ้น");
}

// ============================================================
// 3. ฟังก์ชันจัดการ Tab (Tab Setup)
// ============================================================
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

// ============================================================
// 4. ตัวช่วยเรียกทำงาน (Safety Net)
// ============================================================
// กรณี auth-check.js ทำงานเสร็จไปก่อนหน้านี้แล้ว และ userData มีอยู่แล้ว
// ให้เรียก initializePage เองเลย เพื่อป้องกันหน้าขาว
if (window.userData && typeof initializePage === 'function') {
    console.log("🚀 Manual Start: เรียก initializePage เองเพราะตรวจพบ User Data");
    initializePage();
}