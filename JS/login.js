document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('error-message');
  
  try {
    // แสดงข้อความกำลังโหลด
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#ffffff';
    errorMessage.style.background = 'rgba(0, 0, 255, 0.2)';
    errorMessage.textContent = "กำลังเข้าสู่ระบบ...";
    
    // เรียก API เพื่อล็อกอิน (TU API ผ่าน Lambda)
    const apiUrl = `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/login`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      
      // 1. เก็บแบบเดิม (เพื่อไม่ให้กระทบระบบ Advisor หรือ Dashboard อื่นๆ)
      sessionStorage.setItem('AchieveHubUser', JSON.stringify({
        token: data.token,
        user: data.user 
      }));

      // ★★★ 2. เพิ่มส่วนนี้: เก็บแบบใหม่ (เพื่อให้หน้า Quiz ใช้งานได้) ★★★
      // เราสร้าง "บัตรผ่าน" อีกใบ ใส่ลง LocalStorage ในชื่อที่หน้า Quiz รอรับอยู่
      const quizUserData = {
          studentId: data.user.username || data.user.id || userId, // พยายามหา ID มาใส่ให้ได้
          role: data.user.role || 'student', // ถ้าไม่มี role ส่งมา ให้บังคับเป็น student
          name: data.user.name || userId
      };
      localStorage.setItem('userData', JSON.stringify(quizUserData));
      // ★★★ จบส่วนที่เพิ่ม ★★★
      
      // แสดงข้อความสำเร็จก่อนนำทาง
      errorMessage.style.color = '#4CAF50';
      errorMessage.style.background = 'rgba(76, 175, 80, 0.1)';
      errorMessage.textContent = "เข้าสู่ระบบสำเร็จ! กำลังนำทาง...";
      
      // นำทางไปหน้าที่เหมาะสม
      setTimeout(() => {
        if (data.user.role === 'student') {
          window.location.href = `student-dashboard.html`; 
        } else if (data.user.role === 'advisor') {
          window.location.href = `advisor-dashboard.html`; 
        } else {
          // ถ้าหา role ไม่เจอ ก็ให้ไป student ก่อน (แก้ขัด)
          window.location.href = `student-dashboard.html`; 
        }
      }, 1000); 
      
    } else {
      // แสดงข้อความผิดพลาดจาก API
      errorMessage.style.color = '#ff6b6b';
      errorMessage.style.background = 'rgba(255, 0, 0, 0.1)';
      errorMessage.textContent = data.message || "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    }
  } catch (error) {
    console.error('Login error:', error);
    // แสดงข้อความผิดพลาดในการเชื่อมต่อ
    errorMessage.style.color = '#ff6b6b';
    errorMessage.style.background = 'rgba(255, 0, 0, 0.1)';
    errorMessage.style.display = 'block';
    errorMessage.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อ";
  }
});