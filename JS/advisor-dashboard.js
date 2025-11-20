// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

// ฟังก์ชันหลักที่ถูกเรียกโดย auth-check.js
function initializeAdvisorDashboard() {
    if (!window.userData || window.userData.role !== 'advisor') {
        console.error('Authentication failed - not an advisor:', window.userData.role);
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        if (typeof navigateTo === 'function') {
            navigateTo("login.html");
        } else {
            window.location.href = "login.html";
        }
        return;
    }
    
    document.getElementById('user-name').textContent = window.userData.name || window.userData.userId;
    fetchStudents(window.userData.userId);
}

window.initializePage = initializeAdvisorDashboard;

// ★★★ ฟังก์ชันนี้ถูกรื้อเขียนใหม่ (Frontend Orchestration) ★★★
async function fetchStudents(advisorId) {
    const studentsListElement = document.getElementById('students-list');
    studentsListElement.textContent = "กำลังโหลดข้อมูลนักศึกษา...";
    studentsListElement.classList.add('loading');
    
    try {
        // 1. ดึง "รายชื่อนักศึกษา" มาก่อน (จาก API เดิมที่ส่งเลขผิดๆ มา)
        const listResponse = await fetch(`${API_BASE_URL}/advisors/${advisorId}/students`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${window.userToken}` }
        });

        const listResult = await listResponse.json();
        const basicStudents = Array.isArray(listResult) ? listResult : (listResult.data || []);

        // 2. วนลูปดึง "ข้อมูลสถิติที่ถูกต้อง" ของนักศึกษาทีละคน (จาก API Dashboard /skills)
        // ใช้ Promise.all เพื่อดึงพร้อมกันหลายคน (จะได้ไม่ช้ามาก)
        const detailedStudents = await Promise.all(basicStudents.map(async (student) => {
            try {
                // ยิงไปที่ API /skills ของนักศึกษาคนนั้น (API ตัวเดียวกับที่ Student Dashboard ใช้)
                const statsResponse = await fetch(`${API_BASE_URL}/students/${student.studentId}/skills`, {
                    headers: { 'Authorization': `Bearer ${window.userToken}` }
                });
                
                if (statsResponse.ok) {
                    const statsResult = await statsResponse.json();
                    const statsData = statsResult.data;
                    
                    // เอาค่า Badge (totalEarned) และ Total (32) ที่ถูกต้อง มาแปะทับ
                    return {
                        ...student,
                        realEarned: statsData.totalEarned || 0,     // ค่า Badge ที่ถูกต้อง (1)
                        realTotal: statsData.totalAvailable || 0,   // ค่า Total ที่ถูกต้อง (32)
                        realPercent: 0 // เดี๋ยวคำนวณใหม่ตอนแสดงผล
                    };
                }
            } catch (err) {
                console.warn(`Failed to fetch stats for ${student.studentId}`, err);
            }
            // ถ้าดึงไม่ได้ ให้ใช้ค่า 0 ไปก่อน
            return { ...student, realEarned: 0, realTotal: 32 };
        }));

        window.allStudents = detailedStudents; // เก็บข้อมูลชุดสมบูรณ์ไว้
        displayStudents(detailedStudents);

    } catch (error) {
        console.error('Error fetching students:', error);
        studentsListElement.textContent = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
        studentsListElement.classList.remove('loading');
    }
}

// ฟังก์ชันแสดงผลการ์ดนักศึกษา
function displayStudents(students) {
    const studentsListElement = document.getElementById('students-list');
    studentsListElement.classList.remove('loading');
    studentsListElement.innerHTML = ''; 

    if (!students || students.length === 0) {
        studentsListElement.textContent = "ไม่พบนักศึกษาในที่ปรึกษา";
        return;
    }

    students.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card';

        const name = student.name || 'ชื่อนักศึกษาไม่ระบุ';
        const id = student.studentId || 'N/A';
        const year = student.yearLevel || 'N/A';
        const major = student.department || 'ภาควิชาไม่ระบุ'; 
        
        // ★★★ ใช้ค่าใหม่ที่เราไปดึงมาเสริมเมื่อกี้ ★★★
        const earned = student.realEarned || 0;     
        const total = student.realTotal || 32; // ใช้ 32 เป็นค่า Default ถ้า API มีปัญหา

        // คำนวณเปอร์เซ็นต์
        let percent = 0;
        if (total > 0) {
            percent = Math.round((earned / total) * 100);
        }

        // กำหนดสี
        let progressColor = '#dc3545'; // แดง
        if (percent >= 50) progressColor = '#ffc107'; // เหลือง
        if (percent >= 80) progressColor = '#28a745'; // เขียว

        const initial = name.charAt(0) || '?';
        
        studentCard.innerHTML = `
            <div class="student-initial">${initial}</div>
            <div class="student-details">
                <h4>${name}</h4>
                <p>รหัสนักศึกษา: ${id}</p>
                <p>ชั้นปี: ${year} | ภาควิชา: ${major}</p>
            </div>
            <div class="student-progress">
                <div class="progress-info">
                    <span class="progress-percent" style="color: ${progressColor}">${percent}%</span>
                    <span class="progress-fraction">(${earned}/${total} กลุ่มทักษะ)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${progressColor};"></div>
                </div>
                <button class="review-button" onclick="viewStudentDetails('${id}')">ตรวจสอบ</button>
            </div>
        `;
        studentsListElement.appendChild(studentCard);
    });
}

// ฟังก์ชันกรองตามชั้นปี
function filterByYearDropdown() {
    if (!window.allStudents) return;
    const yearFilter = document.getElementById('year-filter').value;
    let filteredStudents = window.allStudents;
    if (yearFilter !== 'all') {
        filteredStudents = window.allStudents.filter(student => String(student.yearLevel) === String(yearFilter));
    }
    displayStudents(filteredStudents);
}

function viewStudentDetails(studentId) {
    if (typeof navigateTo === 'function') {
        navigateTo(`my-students.html?studentId=${studentId}`);
    } else {
        window.location.href = `my-students.html?studentId=${studentId}`;
    }
}