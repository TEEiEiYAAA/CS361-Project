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

// กำหนดให้ auth-check.js เรียกฟังก์ชันนี้เมื่อ Authentication ผ่าน
window.initializePage = initializeAdvisorDashboard;


// ฟังก์ชันเรียกข้อมูลนักศึกษาจาก API
async function fetchStudents(advisorId) {
    const studentsListElement = document.getElementById('students-list');
    studentsListElement.textContent = "กำลังโหลดข้อมูลนักศึกษา...";
    studentsListElement.classList.add('loading');
    
    // ⭐️⭐️ MODIFIED: เปลี่ยน URL และ Method ⭐️⭐️
    // 1. เปลี่ยน URL ให้ตรงกับ API Gateway (มี s และใส่ ID ใน path)
    // 2. เปลี่ยน Method เป็น 'GET'
    // 3. ลบ 'body' และ 'Content-Type' (GET ไม่มี body)
    
    try {
        const response = await fetch(`${API_BASE_URL}/advisors/${advisorId}/students`, {
            method: 'GET', // <--- เปลี่ยนเป็น GET
            headers: {
                'Authorization': `Bearer ${window.userToken}` // ใช้ Global Token
                // (ลบ Content-Type และ body)
            }
        });

        const students = await response.json();

        if (response.ok) {
            window.allStudents = students; // เก็บไว้สำหรับฟิลเตอร์
            displayStudents(students);
        } else {
            studentsListElement.textContent = students.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลนักศึกษา";
            studentsListElement.classList.remove('loading');
        }

    } catch (error) {
        console.error('Error fetching students:', error);
        studentsListElement.textContent = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
        studentsListElement.classList.remove('loading');
    }
}

// ⭐️⭐️ MODIFIED: อัปเดตฟังก์ชันแสดงผลให้ตรงกับ Schema ฐานข้อมูล ⭐️⭐️
function displayStudents(students) {
    const studentsListElement = document.getElementById('students-list');
    studentsListElement.classList.remove('loading');
    studentsListElement.innerHTML = ''; 

    if (students.length === 0) {
        studentsListElement.textContent = "ไม่พบนักศึกษาในที่ปรึกษา";
        return;
    }

    students.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card'; // คลาสนี้ต้องมี CSS ที่เหมาะสม (เช่น display: flex)

        // --- ประมวลผลข้อมูลตาม Schema ใหม่ ---
        const name = student.name || 'ชื่อนักศึกษาไม่ระบุ';
        
        // ⭐️ MODIFIED: ใช้ 'studentId'
        const id = student.studentId || 'N/A'; 
        
        // ⭐️ MODIFIED: ใช้ 'yearLevel'
        const year = student.yearLevel || 'N/A';
        
        // ⭐️ MODIFIED: ใช้ 'department'
        const major = student.department || 'ภาควิชาไม่ระบุ'; 
        
        // ⭐️ ATTENTION: API ต้องส่งค่านี้มาด้วย
        const completed = student.completedSkillsCount || 0;
        
        // ⭐️ ATTENTION: API ต้องส่งค่านี้มาด้วย
        const total = student.totalSkillsCount || 0; 

        // คำนวณเปอร์เซ็นต์
        let percentage = 0;
        if (total > 0) {
            percentage = Math.round((completed / total) * 100);
        }

        // ดึงอักษรตัวแรกของชื่อ
        const initial = name.split('')[0] || '?';
        
        // สร้าง HTML card ใหม่
        studentCard.innerHTML = `
            <div class="student-initial">${initial}</div>
            <div class="student-details">
                <h4>${name}</h4>
                <p>รหัสนักศึกษา: ${id}</p>
                <p>ชั้นปี: ${year} | ภาควิชา: ${major}</p>
            </div>
            <div class="student-progress">
                <p class="progress-text">${percentage}% (${completed}/${total} ทักษะ)</p>
                <button class="review-button" onclick="viewStudentDetails('${id}')">ตรวจสอบ</button>
            </div>
        `;
        studentsListElement.appendChild(studentCard);
    });
}

// ฟังก์ชันกรองตามชั้นปี (ใช้กับ dropdown ใน HTML)
function filterByYearDropdown() {
    if (!window.allStudents) return;

    const yearFilter = document.getElementById('year-filter').value;
    let filteredStudents = window.allStudents;

    if (yearFilter !== 'all') {
        // ⭐️ MODIFIED: กรองด้วย 'yearLevel'
        filteredStudents = window.allStudents.filter(student => String(student.yearLevel) === yearFilter);
    }
    
    displayStudents(filteredStudents);
}

// ฟังก์ชันดูรายละเอียดนักศึกษา
function viewStudentDetails(studentId) {
    if (typeof navigateTo === 'function') {
        navigateTo(`my-students.html?studentId=${studentId}`);
    } else {
        window.location.href = `my-students.html?studentId=${studentId}`;
    }
}