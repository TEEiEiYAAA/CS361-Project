// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

// ⭐️ MODIFIED: ห่อหุ้ม Logic หลักไว้ใน initializeAdvisorDashboard
// ฟังก์ชันนี้จะถูกเรียกโดย auth-check.js เมื่อ Authentication ผ่านแล้ว
function initializeAdvisorDashboard() {
    // ⭐️ MODIFIED: ตรวจสอบ Role เฉพาะหน้า
    if (!window.userData || window.userData.role !== 'advisor') {
        console.error('Authentication failed - not an advisor:', window.userData.role);
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        // ใช้ navigateTo ที่ไม่มี data=... (อยู่ใน auth-check.js)
        if (typeof navigateTo === 'function') {
            navigateTo("login.html");
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    // แสดงชื่อผู้ใช้ (user-name ถูกอัพเดทโดย updateBasicUserInfo ใน auth-check.js แล้ว)
    // แต่ถ้าต้องการใช้ข้อมูลอื่น ๆ ของอาจารย์ ให้ทำต่อตรงนี้
    document.getElementById('user-name').textContent = window.userData.name || window.userData.userId;
    
    // เรียกข้อมูลนักศึกษาจาก API
    fetchStudents(window.userData.userId);
}

// ⭐️ MODIFIED: กำหนดให้ auth-check.js เรียกฟังก์ชันนี้เมื่อ Authentication ผ่าน
window.initializePage = initializeAdvisorDashboard;

// ฟังก์ชันเรียกข้อมูลนักศึกษาจาก API
async function fetchStudents(advisorId) {
    const studentsListElement = document.getElementById('students-list');
    studentsListElement.textContent = "กำลังโหลดข้อมูลนักศึกษา...";
    studentsListElement.classList.add('loading');
    
    try {
        const response = await fetch(`${API_BASE_URL}/advisor/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.userToken}` // ใช้ Global Token
            },
            body: JSON.stringify({ advisorId: advisorId })
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

// ฟังก์ชันแสดงข้อมูลนักศึกษา
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
        studentCard.className = 'student-card';
        
        // กำหนดสีตามสถานะทักษะ (สมมติว่ามี field skillStatus: 'completed'/'pending')
        const statusClass = student.skillStatus === 'completed' ? 'status-pass' : 'status-fail';

        studentCard.innerHTML = `
            <div class="student-info">
                <h3>${student.name || 'ชื่อนักศึกษาไม่ระบุ'} (${student.year || 'N/A'})</h3>
                <p>รหัส: ${student.id}</p>
                <p>จำนวนทักษะที่ผ่าน: <span class="${statusClass}">${student.completedSkillsCount || 0}</span></p>
            </div>
            <button onclick="viewStudentDetails('${student.id}')">ดูรายละเอียด</button>
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
        filteredStudents = window.allStudents.filter(student => String(student.year) === yearFilter);
    }
    
    displayStudents(filteredStudents);
}

// ฟังก์ชันดูรายละเอียดนักศึกษา
function viewStudentDetails(studentId) {
    // ⭐️ MODIFIED: ใช้ navigateTo (ที่อยู่ใน auth-check.js) และไม่ส่ง data=...
    // my-students.html จะต้องเรียก auth-check.js เพื่อยืนยัน session เอง
    if (typeof navigateTo === 'function') {
        navigateTo(`my-students.html?studentId=${studentId}`);
    } else {
        // Fallback
        window.location.href = `my-students.html?studentId=${studentId}`;
    }
}

// ⭐️ MODIFIED: ลบฟังก์ชัน navigateTo และ logout (เพราะอยู่ใน auth-check.js แล้ว)