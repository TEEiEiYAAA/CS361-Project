// Configuration
const API_URL_TEMPLATE = 'https://jcxjc9ot0e.execute-api.us-east-1.amazonaws.com/prod/plo-skills/{studentId}';

// Global State
let globalPloData = [];
let currentSelectedPloIndex = 0;
let currentSubTab = 'received';

// 1. กำหนดให้ auth-check.js เรียกฟังก์ชันนี้
window.initializePage = async function() {
  console.log("🚀 current-skill.js: initializing...");

  const userData = window.userData;
  if (!userData || !userData.userId) {
    alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    window.location.href = "login.html";
    return;
  }

  const studentId = userData.userId;
  console.log("👤 Loading skills for:", studentId);

  await loadPloSkills(studentId);
};

// 2. ฟังก์ชันดึงข้อมูล API
async function loadPloSkills(studentId) {
  const url = API_URL_TEMPLATE.replace('{studentId}', studentId);
  const menuList = document.getElementById('plo-menu-list');
  const container = document.getElementById('accordion-container');

  try {
    menuList.innerHTML = '<li class="loading-text">กำลังโหลด...</li>';
    container.innerHTML = '<div class="loading-placeholder">กำลังดึงข้อมูลจากระบบ...</div>';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const json = await response.json();
    
    if (!json.success || !json.data) {
      throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
    }

    globalPloData = json.data;
    
    if (globalPloData.length === 0) {
      menuList.innerHTML = '<li>ไม่พบข้อมูล</li>';
      container.innerHTML = '<div class="empty-message">ไม่พบข้อมูลทักษะ</div>';
      return;
    }

    renderPloMenu();
    selectPlo(0); // เลือกตัวแรกเสมอ

  } catch (error) {
    console.error("Error:", error);
    menuList.innerHTML = '<li style="color:red;">เกิดข้อผิดพลาด</li>';
    container.innerHTML = `<div class="empty-message">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
  }
}

// 3. สร้างเมนูซ้าย (PLO)
function renderPloMenu() {
  const menuList = document.getElementById('plo-menu-list');
  menuList.innerHTML = '';

  globalPloData.forEach((plo, index) => {
    const li = document.createElement('li');
    li.textContent = plo.ploId; // แสดงชื่อ PLO (เช่น PLO1)
    li.onclick = () => selectPlo(index);
    
    if (index === currentSelectedPloIndex) {
      li.classList.add('active');
    }
    menuList.appendChild(li);
  });
}

// 4. เมื่อกดเลือก PLO
function selectPlo(index) {
  currentSelectedPloIndex = index;
  
  // อัปเดตสีเมนูซ้าย
  const menuItems = document.querySelectorAll('#plo-menu-list li');
  menuItems.forEach((li, i) => {
    if (i === index) li.classList.add('active');
    else li.classList.remove('active');
  });

  renderContent();
}

// 5. เมื่อกดเปลี่ยน Tab (ได้รับแล้ว/ยังไม่ได้รับ)
function switchSubTab(tabName) {
  currentSubTab = tabName;

  // อัปเดตปุ่ม Tab (CSS เดิมของคุณใช้ class active)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // หาปุ่มที่กดแล้วเติม active (ใช้ event delegation จาก HTML หรือหาตาม onclick ก็ได้)
  // ใน HTML ใหม่ ผมใส่ onclick="switchSubTab('...')" ไว้
  const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  renderContent();
}

// 6. สร้าง Accordion (Content ขวา)
function renderContent() {
  const container = document.getElementById('accordion-container');
  container.innerHTML = '';

  const currentPlo = globalPloData[currentSelectedPloIndex];
  if (!currentPlo) return;

  // เลือกข้อมูลตาม Tab
  const groupsToShow = currentSubTab === 'received' ? currentPlo.received : currentPlo.pending;

  if (!groupsToShow || groupsToShow.length === 0) {
    container.innerHTML = `<div class="empty-message">ไม่มีรายการในหมวดนี้</div>`;
    return;
  }

  // วนลูปสร้างการ์ด Accordion
  groupsToShow.forEach(group => {
    const card = document.createElement('div');
    card.className = 'accordion-card';

    // ส่วนหัว
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
      <span class="group-name">${group.skillGroupName}</span>
      <i class="fas fa-chevron-down arrow-icon"></i>
    `;
    
    // ส่วนเนื้อหา
    const body = document.createElement('div');
    body.className = 'accordion-body';
    
    // เรียงลำดับ Easy -> Medium -> Hard
    const levelOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
    const sortedLevels = group.levels.sort((a, b) => (levelOrder[a.skillLevel] || 9) - (levelOrder[b.skillLevel] || 9));

    sortedLevels.forEach(lvl => {
      const item = document.createElement('div');
      item.className = 'level-item';
      
      const statusClass = lvl.isPassed ? 'passed' : 'not-passed';
      const statusText = lvl.isPassed ? '(ผ่านแล้ว)' : '(ยังไม่ผ่าน)';
      
      item.innerHTML = `
        <span class="level-name">${lvl.name}</span>
        <span class="level-status ${statusClass}">${statusText}</span>
      `;
      body.appendChild(item);
    });

    // คลิกเพื่อเปิด/ปิด
    header.onclick = () => {
      card.classList.toggle('open');
    };

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });
}

// Logout
function logout() {
  if(confirm('ต้องการออกจากระบบ?')) {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

/*// ⭐️ CHANGED: อัปเดตฟังก์ชัน Logout ให้ตรงกับ auth-check.js
function logout() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    sessionStorage.removeItem('AchieveHubUser'); // ⭐️ CHANGED
    localStorage.clear(); // เคลียร์ของเก่าเผื่อไว้
    window.userData = null;
    window.userToken = null;
    window.location.href = "login.html";
  }
}*/

/* =========================================
   Modal Logic
   ========================================= */

window.openPloModal = function() {
  const modal = document.getElementById('ploModal');
  const modalBody = document.getElementById('plo-modal-body');
  
  if (!globalPloData || globalPloData.length === 0) {
    modalBody.innerHTML = '<p style="text-align:center">ยังไม่มีข้อมูล หรือกำลังโหลด...</p>';
  } else {
    let html = '';
    globalPloData.forEach(plo => {
      const fullName = plo.ploName || "ไม่มีคำอธิบาย"; 
      html += `
        <div class="plo-detail-item">
          <span class="plo-code">${plo.ploId}:</span>
          <span class="plo-desc">${fullName}</span>
        </div>
      `;
    });
    modalBody.innerHTML = html;
  }

  modal.style.display = 'flex';
};

// เปลี่ยนจาก function closePloModal() {...} เป็นแบบนี้:
window.closePloModal = function() {
  const modal = document.getElementById('ploModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// ปิด Modal เมื่อคลิกที่พื้นหลังดำๆ
window.onclick = function(event) {
  const modal = document.getElementById('ploModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}
