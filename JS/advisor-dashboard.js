// ตรวจสอบการล็อกอิน
document.addEventListener('DOMContentLoaded', function() {
    // ดึงข้อมูลจาก URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (!dataParam) {
        console.error('No session data found');
        window.location.href = "login.html";
        return;
    }
    
    try {
        // ถอดรหัสข้อมูลจาก URL
        const decodedData = decodeURIComponent(atob(dataParam));
        const sessionData = JSON.parse(decodedData);
        
        // เก็บข้อมูลไว้ใน window object
        window.userData = sessionData.user;
        window.userToken = sessionData.token;
        
        console.log('User data loaded:', window.userData);
        
        // ตรวจสอบ role เป็น advisor
        if (window.userData.role !== 'advisor') {
            console.error('Authentication failed - not an advisor:', window.userData.role);
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = "login.html";
            return;
        }
        
        // แสดงชื่อผู้ใช้
        document.getElementById('user-name').textContent = window.userData.name || window.userData.userId;
        
        // เรียกข้อมูลนักศึกษาจาก API
        fetchStudents(window.userData.userId);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณา Login ใหม่');
        window.location.href = "login.html";
    }
});

// ฟังก์ชันเรียกข้อมูลนักศึกษาจาก API
async function fetchStudents(advisorId) {
    try {
        // แสดงสถานะกำลังโหลด
        document.getElementById('students-list').innerHTML = `
            <div class="loading">กำลังโหลดข้อมูลนักศึกษาในที่ปรึกษา...</div>
        `;
        
        // เรียกข้อมูลนักศึกษาจาก API
        const apiUrl = `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/advisors/${advisorId}/students`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${window.userToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}: ${await response.text()}`);
        }
        
        const students = await response.json();
        displayStudents(students);
        
    } catch (error) {
        console.error('Error fetching students:', error);
        
        // แสดงข้อความผิดพลาด
        document.getElementById('students-list').innerHTML = `
            <div class="error-message">
                <p>เกิดข้อผิดพลาดในการดึงข้อมูลนักศึกษา: ${error.message}</p>
                <p>กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ</p>
            </div>
        `;
    }
}

// ฟังก์ชันแสดงข้อมูลนักศึกษา
function displayStudents(students) {
    const studentsList = document.getElementById('students-list');
    
    if (!students || students.length === 0) {
        studentsList.innerHTML = `
            <div class="no-students">
                <p>ไม่พบข้อมูลนักศึกษาในที่ปรึกษา</p>
            </div>
        `;
        return;
    } 
    
    let html = '';
    
    students.forEach(student => {
        // คำนวณความก้าวหน้า
        const completedSkills = student.completedSkills || 0;
        const requiredSkills = student.requiredSkills || 8; // ค่าเริ่มต้นถ้าไม่มี
        const progress = Math.round((completedSkills / requiredSkills) * 100);
        
        html += `
            <div class="student-card">
                <div class="student-info">
                    <div class="avatar">${student.name?.charAt(0) || '?'}</div>
                    <div class="student-text">
                        <h3>${student.name || 'ไม่ระบุชื่อ'}</h3>
                        <p>รหัสนักศึกษา: ${student.studentId}</p>
                        <p>ชั้นปี: ${student.yearLevel || '-'} | ภาควิชา: ${student.department || '-'}</p>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%"></div>
                    </div>
                    <p>${progress}% (${completedSkills}/${requiredSkills} ทักษะ)</p>
                    <button class="view-btn" onclick="viewStudentDetails('${student.studentId}')">ตรวจสอบ</button>
                </div>
            </div>
        `;
    });
    
    studentsList.innerHTML = html;
}

// ฟังก์ชันดูรายละเอียดนักศึกษา
function viewStudentDetails(studentId) {
    // เข้ารหัสข้อมูล session เพื่อส่งต่อ
    const sessionData = {
        token: window.userToken,
        user: window.userData
    };
    const userDataEncoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));
    
    // นำทางไปหน้ารายละเอียดนักศึกษา พร้อมส่งข้อมูล session
    window.location.href = `my-students.html?studentId=${studentId}&data=${userDataEncoded}`;
}

// ฟังก์ชัน navigateTo
function navigateTo(page) {
    // ตรวจสอบว่ามีข้อมูล session อยู่หรือไม่
    if (!window.userToken || !window.userData) {
        window.location.href = 'login.html';
        return;
    }

    // เข้ารหัสข้อมูล session เพื่อส่งต่อ
    const sessionData = {
        token: window.userToken,
        user: window.userData
    };
    const userDataEncoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));

    // ถ้ามี session ให้นำทางไปยังหน้าที่ต้องการพร้อม data
    window.location.href = `${page}?data=${userDataEncoded}`;
}

// ฟังก์ชันล็อกเอาท์
function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        // ลบข้อมูล session
        window.userData = null;
        window.userToken = null;
        
        // กลับไปหน้า login
        window.location.href = "login.html";
    }
}

// ป้องกันการกดปุ่ม Back
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};