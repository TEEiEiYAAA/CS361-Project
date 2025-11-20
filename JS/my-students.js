// Configuration
const API_BASE_URL = 'https://jcxjc9ot0e.execute-api.us-east-1.amazonaws.com/prod';
const REQUIRED_ACTIVITIES_COUNT = 3;

// Global variables
let currentStudentId = null;

// ฟังก์ชันเริ่มต้นหน้าเว็บ (จะถูกเรียกโดย auth-check.js)
function initializePage() {
    console.log('🚀 my-students.js: Initializing page...');

    // 1. ใช้ข้อมูลจาก window.userData (ที่ auth-check.js เตรียมไว้ให้)
    const userData = window.userData;

    // 2. ตรวจสอบสิทธิ์ว่าเป็น advisor หรือไม่
    if (!userData || userData.role !== 'advisor') {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (สำหรับอาจารย์เท่านั้น)');
        window.location.href = "student-dashboard.html";
        return;
    }

    // 3. ดึง studentId จาก URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentStudentId = urlParams.get('studentId');

    if (!currentStudentId) {
        alert('ไม่พบข้อมูลนักศึกษาที่ต้องการดู');
        window.location.href = "advisor-dashboard.html";
        return;
    }

    // 4. โหลดข้อมูลนักศึกษา (Existing logic)
    loadStudentData(currentStudentId);
    
    // 5. ★★★ โหลดข้อมูล Dashboard (กราฟและ PLO) ★★★
    loadStudentDashboardData(currentStudentId);
}

// ★★★ ฟังก์ชันสลับ Tab (เพิ่มใหม่) ★★★
window.switchDashTab = function(tabName) {
    // จัดการปุ่ม Active
    document.querySelectorAll('.card-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // จัดการ Panel Active
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

// ★★★ ฟังก์ชันโหลดข้อมูล Dashboard (กราฟวงกลมและ PLO) ★★★
async function loadStudentDashboardData(studentId) {
    console.log("📊 Loading dashboard stats for:", studentId);
    
    // Elements references
    const totalEarnedEl = document.getElementById('total-earned-big');
    const circleEl = document.getElementById('progress-ring-circle');
    const countEasy = document.getElementById('count-easy');
    const countMed = document.getElementById('count-medium');
    const countHard = document.getElementById('count-hard');
    const totalSystem = document.getElementById('total-system');
    const ploContainer = document.getElementById('plo-stats-list');

    try {
        // ใช้ Endpoint เดียวกับ Student Dashboard
        const apiUrl = `${API_BASE_URL}/students/${studentId}/skills`;
        
        const response = await fetch(apiUrl, {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error("API Error fetching stats");
        
        const result = await response.json();
        // API อาจจะ return { data: {...} } หรือ return ตัว object เลย ขึ้นอยู่กับ Lambda
        // เช็ค structure ให้ชัวร์
        const data = result.data || result; 

        // 1. อัปเดต Tab Overview (กราฟวงกลมและตัวเลข)
        if (totalEarnedEl) totalEarnedEl.textContent = data.totalEarned || 0;
        if (totalSystem) totalSystem.textContent = data.totalAvailable || 0;
        
        if (countEasy) countEasy.textContent = (data.levels && data.levels.easy) || 0;
        if (countMed) countMed.textContent = (data.levels && data.levels.medium) || 0;
        if (countHard) countHard.textContent = (data.levels && data.levels.hard) || 0;

        // คำนวณวงกลม
        const total = data.totalAvailable || 1;
        const earned = data.totalEarned || 0;
        const percent = (earned / total) * 100;
        
        const radius = 70; 
        const circumference = 2 * Math.PI * radius; // approx 440
        
        if(circleEl) {
            circleEl.style.strokeDasharray = `${circumference} ${circumference}`;
            const offset = circumference - (percent / 100) * circumference;
            // Animation เล็กน้อย
            setTimeout(() => {
                circleEl.style.strokeDashoffset = offset;
            }, 100);
        }

        // 2. อัปเดต Tab PLO
        let ploHtml = '';
        if (data.plos) {
            const sortedPloKeys = Object.keys(data.plos).sort();

            for (const ploKey of sortedPloKeys) {
                const stats = data.plos[ploKey];
                // กรองเฉพาะ key ที่ขึ้นต้นด้วย PLO
                if (!ploKey.startsWith('PLO')) continue;

                const ploPercent = stats.total > 0 ? (stats.earned / stats.total) * 100 : 0;
                const displayName = stats.name ? `${ploKey}: ${stats.name}` : ploKey;

                ploHtml += `
                    <div class="plo-item-row">
                        <div class="plo-label">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%;" title="${displayName}">
                                ${displayName}
                            </span>
                            <span>${stats.earned}/${stats.total}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${ploPercent}%"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        if (ploContainer) {
            if (ploHtml === '') {
                ploContainer.innerHTML = '<p style="text-align:center;color:#888;">ยังไม่มีข้อมูล PLO</p>';
            } else {
                ploContainer.innerHTML = ploHtml;
            }
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        if(ploContainer) ploContainer.innerHTML = `<p style="text-align:center;color:red;">ไม่สามารถโหลดข้อมูลได้</p>`;
    }
}

// --- ฟังก์ชันเดิมสำหรับการดึงข้อมูล Profile (คงไว้เหมือนเดิม) ---

async function fetchStudentInfo(studentId) {
  try {
    const apiUrl = `${API_BASE_URL}/students/${studentId}/info`;
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    const data = await response.json();
    
    document.getElementById('student-name').textContent = data.name || '-';
    document.getElementById('student-year').textContent = data.yearLevel || '-';
    document.getElementById('student-faculty').textContent = 'วิทยาศาสตร์และเทคโนโลยี';
    document.getElementById('student-department').textContent = data.department || 'วิทยาการคอมพิวเตอร์';
    return data;
  } catch (error) {
    console.error('Error fetching student info:', error);
    return {};
  }
}

// ฟังก์ชันหลักโหลดข้อมูลทั่วไป (เรียกฟังก์ชันย่อยๆ)
async function loadStudentData(studentId) {
  // เรียกข้อมูลพื้นฐาน
  await fetchStudentInfo(studentId);
  
  // หมายเหตุ: ฟังก์ชัน fetchRequiredSkills, fetchStudentActivities, fetchCompletedSkills 
  // และ logic การคำนวณตารางด้านล่าง (ถ้ามีในหน้าเว็บ) สามารถใส่ไว้ตรงนี้ได้เหมือนไฟล์เดิม
  // แต่เนื่องจากใน HTML ที่ให้มา เน้นส่วน Dashboard เป็นหลัก ผมจึงละไว้เพื่อความกระชับ
  // หากคุณมีตารางด้านล่าง (Skill List) ให้คงฟังก์ชันเหล่านั้นไว้ครับ
}

// ฟังก์ชัน Logout
function logout() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    window.location.href = "login.html";
  }
}
