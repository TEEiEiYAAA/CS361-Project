console.log("🚀 student-dashboard.js: Script started loading...");

// Configuration
const API_BASE_URL = 'https://jcxjc9ot0e.execute-api.us-east-1.amazonaws.com/prod';

// กำหนดให้ auth-check.js เรียกฟังก์ชันนี้
window.initializePage = initializeStudentDashboard;

function initializeStudentDashboard() {
    console.log("🏁 student-dashboard.js: initializeStudentDashboard() called");

    if (!window.userData || window.userData.role !== 'student') {
        window.location.href = "login.html";
        return;
    }
    
    const studentId = window.userData.userId;
    loadAllSkillData(studentId);
}

// ฟังก์ชันสลับ Tab (Overview / PLO)
window.switchDashTab = function(tabName) {
    document.querySelectorAll('.card-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`panel-${tabName}`).classList.add('active');
}

// ฟังก์ชันหลักโหลดข้อมูล
async function loadAllSkillData(studentId) {
    console.log("🔄 Loading data for student:", studentId);
    
    const totalEarnedEl = document.getElementById('total-earned-big');
    const circleEl = document.getElementById('progress-ring-circle');
    const countEasy = document.getElementById('count-easy');
    const countMed = document.getElementById('count-medium');
    const countHard = document.getElementById('count-hard');
    const totalSystem = document.getElementById('total-system');
    const ploContainer = document.getElementById('plo-stats-list');

    try {
        const apiUrl = `${API_BASE_URL}/students/${studentId}/skills`;
        
        const response = await fetch(apiUrl, {
             headers: { 'Authorization': `Bearer ${window.userToken}` }
        });

        if (!response.ok) throw new Error("API Error");
        
        const result = await response.json();
        const data = result.data;

        console.log("📊 Stats Data:", data);

        // --- 1. อัปเดต Tab Overview ---
        totalEarnedEl.textContent = data.totalEarned || 0;
        totalSystem.textContent = data.totalAvailable || 0;
        
        countEasy.textContent = data.levels.easy || 0;
        countMed.textContent = data.levels.medium || 0;
        countHard.textContent = data.levels.hard || 0;

        const total = data.totalAvailable || 1;
        const earned = data.totalEarned || 0;
        const percent = (earned / total) * 100;
        
        const radius = 70; 
        const circumference = 2 * Math.PI * radius; // ≈ 440
        
        if(circleEl) {
            circleEl.style.strokeDasharray = `${circumference} ${circumference}`;
            const offset = circumference - (percent / 100) * circumference;
            setTimeout(() => {
                circleEl.style.strokeDashoffset = offset;
            }, 100);
        }

        // --- 2. อัปเดต Tab PLO (อ่านชื่อจาก data.plos) ---
        let ploHtml = '';
        if (data.plos) {
            // ⭐️ จัดเรียง Key (PLO1, PLO2, ...) ก่อนแสดงผล
            const sortedPloKeys = Object.keys(data.plos).sort();

            for (const ploKey of sortedPloKeys) {
                const stats = data.plos[ploKey];
                if (!ploKey.startsWith('PLO')) continue;

                const ploPercent = stats.total > 0 ? (stats.earned / stats.total) * 100 : 0;
                
                // ⭐️ ดึงชื่อเต็มจาก `stats.name` ที่ Lambda ส่งมา
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
        
        if (ploHtml === '') {
             ploContainer.innerHTML = '<p style="text-align:center;color:#888;">ยังไม่มีข้อมูล PLO</p>';
        } else {
             ploContainer.innerHTML = ploHtml;
        }

    } catch (error) {
        console.error('Error:', error);
        if(totalEarnedEl) totalEarnedEl.textContent = "-";
        if(ploContainer) ploContainer.innerHTML = `<p style="text-align:center;color:red;">โหลดข้อมูลไม่สำเร็จ</p>`;
    }
}

console.log("✅ student-dashboard.js loaded");
