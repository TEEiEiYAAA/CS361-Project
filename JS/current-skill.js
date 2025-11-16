// current-skill.js (ฉบับ Clean & Complete)

// 👇👇👇 1. ใส่ลิงก์ S3 ของไฟล์ curriculum_structure.json ตรงนี้ครับ 👇👇👇
const MASTER_CURRICULUM_URL = 'https://quiz-exam-data.s3.us-east-1.amazonaws.com/curriculum_structure.json';

// 2. URL API ของระบบ Quiz (สำหรับเช็คว่าสอบผ่านหรือยัง)
const NEW_QUIZ_API_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

let globalPloData = [];
let currentSelectedPloIndex = 0;
let currentSubTab = 'received'; // ค่าเริ่มต้น: ทักษะที่ได้รับแล้ว

// เริ่มทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // ถ้าไม่มีข้อมูล User ให้เด้งไป Login
    if (!userData.studentId) {
        alert("กรุณาเข้าสู่ระบบ");
        window.location.href = "login.html";
        return;
    }
    await loadData(userData.studentId);
});

// รองรับกรณีเรียกจากไฟล์อื่น (เผื่อไว้)
window.initializePage = async function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if(userData.studentId) await loadData(userData.studentId);
};

async function loadData(studentId) {
    const container = document.getElementById('accordion-container');
    const menuList = document.getElementById('plo-menu-list');
    
    if(menuList) menuList.innerHTML = '<li class="loading-text">กำลังโหลด...</li>';
    if(container) container.innerHTML = '<div class="loading-placeholder">กำลังดึงข้อมูล...</div>';

    try {
        // --- A. ดึงโครงสร้างหลักสูตรจาก S3 ---
        console.log("Fetching Curriculum form:", MASTER_CURRICULUM_URL);
        const structResponse = await fetch(MASTER_CURRICULUM_URL);
        if (!structResponse.ok) throw new Error(`ไม่พบไฟล์โครงสร้างหลักสูตร (Status: ${structResponse.status})`);
        const structData = await structResponse.json();
        
        // ดึง array หลักสูตรออกมา (รองรับทั้งชื่อ curriculum และ data)
        globalPloData = structData.curriculum || structData.data || [];

        // --- B. ดึงผลสอบจาก Database ---
        console.log("Fetching User Progress...");
        const quizResponse = await fetch(`${NEW_QUIZ_API_URL}/students/${studentId}/completed`);
        let passedSkillIds = [];
        
        if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            // แกะกล่องข้อมูล
            let items = [];
            if (Array.isArray(quizData)) items = quizData;
            else if (quizData.body) {
                try { items = JSON.parse(quizData.body); } catch(e){}
            }
            if(Array.isArray(items)) {
                passedSkillIds = items.map(i => i.skillId); 
            }
        }
        
        console.log("✅ วิชาที่สอบผ่าน:", passedSkillIds);

        // เก็บรายการที่ผ่านไว้ใน Window เพื่อให้ฟังก์ชันอื่นเรียกใช้ได้ง่ายๆ
        window.currentPassedSkills = passedSkillIds;

        // --- C. แสดงผล ---
        renderPloMenu();
        
        // แสดง PLO แรกสุดเป็นค่าเริ่มต้น
        if (globalPloData.length > 0) {
            const firstPlo = globalPloData[0].plo || globalPloData[0].ploId || 'PLO1';
            renderSkillsByPlo(firstPlo, passedSkillIds);
        } else {
            if(container) container.innerHTML = '<div class="empty-message">ไม่พบข้อมูลหลักสูตร</div>';
        }

    } catch (error) {
        console.error("Critical Error:", error);
        if(container) container.innerHTML = `<div class="empty-message">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
        if(menuList) menuList.innerHTML = '<li style="color:red">Error</li>';
    }
}

// สร้างเมนูซ้าย
function renderPloMenu() {
    const menuList = document.getElementById('plo-menu-list');
    if(!menuList) return;
    menuList.innerHTML = '';
    
    globalPloData.forEach((plo, index) => {
        const li = document.createElement('li');
        li.textContent = plo.plo || plo.ploId; 
        if (index === currentSelectedPloIndex) li.classList.add('active');
        
        li.onclick = () => {
            // เปลี่ยนสี Active ที่เมนู
            currentSelectedPloIndex = index;
            document.querySelectorAll('#plo-menu-list li').forEach((item, i) => {
                if (i === index) item.classList.add('active');
                else item.classList.remove('active');
            });
            
            // วาดเนื้อหาด้านขวาใหม่
            renderSkillsByPlo(plo.plo || plo.ploId, window.currentPassedSkills || []);
        };
        menuList.appendChild(li);
    });
}

// วาดรายการวิชาด้านขวา
function renderSkillsByPlo(ploName, passedSkillIds) {
    const container = document.getElementById('accordion-container');
    if(!container) return;
    container.innerHTML = '';

    // หาข้อมูลของ PLO นั้น
    const ploData = globalPloData.find(p => (p.plo || p.ploId) === ploName);
    if (!ploData) return;

    // เช็คว่า User อยู่ Tab ไหน (ได้รับแล้ว / ยังไม่ได้รับ)
    const activeBtn = document.querySelector('.tab-btn.active');
    const isReceivedTab = activeBtn && activeBtn.innerText.includes("ได้รับแล้ว");
    let hasContent = false;

    // JSON S3 เก็บวิชาใน `subjects`
    const subjects = ploData.subjects || [];

    subjects.forEach(subject => {
        // กรอง Skill ในวิชานั้น ว่าอันไหนตรงกับ Tab ปัจจุบัน
        const skillsToShow = subject.skills.filter(skill => {
            // เทียบ ID (แบบไม่สนตัวพิมพ์เล็กใหญ่)
            const isPassed = passedSkillIds.some(id => id.toLowerCase() === skill.id.toLowerCase());
            
            if (isReceivedTab) return isPassed;  // ถ้าอยู่ Tab ได้รับ -> เอาเฉพาะที่ผ่าน
            else return !isPassed;               // ถ้าอยู่ Tab ยังไม่ได้ -> เอาเฉพาะที่ไม่ผ่าน
        });

        // ถ้าวิชานี้ไม่มีอะไรให้โชว์ใน Tab นี้เลย ก็ข้ามไป
        if (skillsToShow.length === 0) return;

        hasContent = true;

        // สร้างการ์ด Accordion
        const card = document.createElement('div');
        card.className = 'accordion-card'; // default ให้เปิด

        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.innerHTML = `
            <span class="group-name">${subject.subjectName}</span>
            <i class="fas fa-chevron-down arrow-icon"></i>
        `;

        const body = document.createElement('div');
        body.className = 'accordion-body';

        skillsToShow.forEach(skill => {
            const isPassed = passedSkillIds.some(id => id.toLowerCase() === skill.id.toLowerCase());
            const statusText = isPassed ? '(ผ่านแล้ว)' : '(ยังไม่ผ่าน)';
            const colorStyle = isPassed ? 'color: #28a745;' : 'color: #dc3545;';

            const item = document.createElement('div');
            item.className = 'level-item';
            item.innerHTML = `
                <span class="level-name">${skill.level}</span>
                <span class="level-status" style="${colorStyle}">${statusText}</span>
            `;
            body.appendChild(item);
        });

        // ใส่ Click Event ให้หัวข้อเพื่อพับเก็บได้
        header.onclick = () => { card.classList.toggle('open'); };

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });

    if (!hasContent) {
        container.innerHTML = `<div class="empty-message">ไม่มีรายการในหมวดนี้</div>`;
    }
}

// ฟังก์ชันสลับ Tab
function switchSubTab(type) {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    // หาปุ่มที่กดแล้วใส่ active
    const targetBtn = Array.from(btns).find(b => b.getAttribute('onclick').includes(type));
    if(targetBtn) targetBtn.classList.add('active');

    // วาดหน้าจอใหม่
    const activePloLi = document.querySelector('#plo-menu-list li.active');
    const activePlo = activePloLi ? activePloLi.innerText : (globalPloData[0]?.plo || 'PLO1');
    
    renderSkillsByPlo(activePlo, window.currentPassedSkills || []);
}

// Logout
function logout() {
    if(confirm('ต้องการออกจากระบบ?')) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Modal Info
window.openPloModal = function() {
    const modal = document.getElementById('ploModal');
    const modalBody = document.getElementById('plo-modal-body');
    
    let html = '';
    globalPloData.forEach(plo => {
        html += `<div class="plo-detail-item">
            <span class="plo-code">${plo.plo || plo.ploId}:</span> 
            <span class="plo-desc">${plo.name || ''}</span>
        </div>`;
    });
    modalBody.innerHTML = html || 'กำลังโหลด...';
    modal.style.display = 'flex';
};

window.closePloModal = function() { document.getElementById('ploModal').style.display = 'none'; };
window.onclick = function(event) { if (event.target === document.getElementById('ploModal')) document.getElementById('ploModal').style.display = 'none'; }