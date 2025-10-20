let allStudents = []; // เก็บข้อมูลนักศึกษาทั้งหมดไว้ใช้กรอง
// ตรวจสอบการล็อกอิน
        document.addEventListener('DOMContentLoaded', function() {
            // แสดง debug info ในกรณีที่มีปัญหา
            console.log('localStorage contents:', { 
                token: localStorage.getItem('token'),
                userData: localStorage.getItem('userData')
            });
            
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            console.log('Parsed userData:', userData);
            
            // แก้ไข: ตรวจสอบ userId แทน studentId และตรวจสอบ role เป็น advisor
            if (!userData.userId || userData.role !== 'advisor') {
                console.error('Authentication failed:', { 
                    hasUserId: !!userData.userId, 
                    role: userData.role 
                });
                // ถ้าไม่ได้ล็อกอินหรือไม่ใช่อาจารย์ ให้กลับไปหน้าล็อกอิน
                window.location.href = "login.html";
                return;
            }
            
            // แสดงชื่อผู้ใช้
            document.getElementById('user-name').textContent = userData.name || userData.userId;
            
            // เรียกข้อมูลนักศึกษาจาก API
            fetchStudents(userData.userId);
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
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
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

        function displayStudents(students) {
            allStudents = students; // ✅ เก็บข้อมูลทั้งหมดไว้สำหรับ filter
            renderStudentList(students);
        }
        
        
        // ฟังก์ชันแสดงข้อมูลนักศึกษา
        function renderStudentList(students) {
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
                const completedSkills = student.completedSkills || 0;
                const requiredSkills = student.requiredSkills || 8;
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
            // นำทางไปหน้ารายละเอียดนักศึกษา
            window.location.href = `my-students.html?studentId=${studentId}`;
        }
        
        // เพิ่มฟังก์ชัน navigateTo ในส่วน <script>
        function navigateTo(page) {
        // ตรวจสอบว่ามี token และ userData อยู่หรือไม่
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (!token || !userData.userId) {
            // ถ้าไม่มี token หรือ userData ให้กลับไปหน้า login
            window.location.href = 'login.html';
            return;
        }

        // ถ้ามี token และ userData ให้นำทางไปยังหน้าที่ต้องการ
        window.location.href = page;
        }

        // ฟังก์ชันล็อกเอาท์
    function logout() {
      const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
      if (confirmLogout) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = "login.html";
      }
    }

    function filterByYearDropdown() {
        const selected = document.getElementById('year-filter').value;
    
        // ยังไม่ได้เลือกจริง (อยู่ที่ "ระดับชั้นปี")
        if (!selected) return;
    
        if (selected === 'all') {
            renderStudentList(allStudents);
        } else {
            const y = parseInt(selected, 10);
            const filtered = allStudents.filter(
                s => parseInt(s.yearLevel, 10) === y
            );
            renderStudentList(filtered);
        }
    }
    