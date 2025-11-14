// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
const REQUIRED_ACTIVITIES_COUNT = 3;

// ⭐️ NEW: กำหนดให้ auth-check.js เรียกฟังก์ชันนี้
window.initializePage = initializeCurrentSkills;

// ⭐️ CHANGED: ย้าย DOMContentLoaded มาเป็นฟังก์ชันที่ auth-check.js เรียก
function initializeCurrentSkills() {
  console.log("🏁 current-skill.js: initializeCurrentSkills() called");

  // ⭐️ CHANGED: อ่านจาก window.userData
  const userData = window.userData; 
  
  if (!userData || (!userData.userId && !userData.studentId) || userData.role !== 'student') {
    console.error('❌ current-skill.js: Authentication failed or not a student.');
    alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือ session หมดอายุ');
    if (typeof navigateTo === 'function') navigateTo("login.html");
    else window.location.href = "login.html";
    return;
  }
  
  // ⭐️ CHANGED: ใช้ userId เป็นหลักตามมาตรฐานใหม่
  const studentId = userData.userId || userData.studentId;
  loadAllSkillData(studentId);
}
// ⭐️ REMOVED: ลบ document.addEventListener('DOMContentLoaded', ...) ของเดิมทิ้ง

// ดึงข้อมูลนักศึกษา
async function fetchStudentInfo(studentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/info`, {
      // ⭐️ CHANGED: ใช้ window.userToken
      headers: { 'Authorization': `Bearer ${window.userToken}` }
    });
    
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching student info:', error);
    // ⭐️ CHANGED: อ่าน fallback จาก window.userData
    const userData = window.userData || {};
    return { 
      name: userData.name || "นักศึกษา",
      // ⭐️ CHANGED: ใช้ yearLevel ที่ auth-check.js คำนวณไว้ให้
      yearLevel: userData.calculatedYearLevel || 2 
    };
  }
}

// ดึงทักษะที่บังคับสำหรับชั้นปี
async function fetchRequiredSkills(yearLevel) {
  try {
    const response = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
      // ⭐️ CHANGED: ใช้ window.userToken
      headers: { 'Authorization': `Bearer ${window.userToken}` }
    });
    
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching required skills:', error);
    // ข้อมูลตัวอย่าง (คงเดิม)
    return [
      // ... (sample data as in original) ...
    ].filter(skill => skill.yearLevel <= yearLevel && skill.isRequired);
  }
}

// ดึงกิจกรรมที่นักศึกษาเข้าร่วม
async function fetchStudentActivities(studentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/activities`, {
      // ⭐️ CHANGED: ใช้ window.userToken
      headers: { 'Authorization': `Bearer ${window.userToken}` }
    });
    
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

// ดึงทักษะที่ไม่บังคับ (isRequired = false)
async function fetchOptionalSkills(yearLevel) {
  try {
    const response = await fetch(`${API_BASE_URL}/skills/all`, {
      // ⭐️ CHANGED: ใช้ window.userToken
      headers: { 'Authorization': `Bearer ${window.userToken}` }
    });
    
    if (!response.ok) {
      // ถ้า endpoint ไม่มี ลองใช้วิธีเดิมก่อน
      const altResponse = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
        // ⭐️ CHANGED: ใช้ window.userToken
        headers: { 'Authorization': `Bearer ${window.userToken}` }
      });
      
      if (altResponse.ok) {
        const allSkills = await altResponse.json();
        console.log('🔍 All skills from requiredSkills endpoint:', allSkills);
        const optionalSkills = allSkills.filter(skill => skill.isRequired === false);
        console.log('🔍 Optional skills filtered:', optionalSkills);
        return optionalSkills;
      }
      
      throw new Error(`API error ${response.status}`);
    }
    
    const allSkills = await response.json();
    console.log('🔍 All skills from skills/all endpoint:', allSkills);
    
    const optionalSkills = allSkills.filter(skill => 
      skill.isRequired === false 
    );
    
    console.log('🔍 Optional skills filtered:', optionalSkills);
    return optionalSkills;
    
  } catch (error) {
    console.error('Error fetching optional skills:', error);
    // ข้อมูลตัวอย่าง (คงเดิม)
    const sampleOptionalSkills = [
        // ... (sample data as in original) ...
    ].filter(skill => skill.yearLevel <= yearLevel);
    
    console.log('🔍 Using sample optional skills:', sampleOptionalSkills);
    return sampleOptionalSkills;
  }
}

// ดึงทักษะที่นักศึกษาได้รับ (ทำแบบทดสอบผ่านแล้ว)
async function fetchStudentSkills(studentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/skills`, {
      // ⭐️ CHANGED: ใช้ window.userToken
      headers: { 'Authorization': `Bearer ${window.userToken}` }
    });
    
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching student skills:', error);
    return [];
  }
}

// ฟังก์ชันหลักที่โหลดข้อมูลทั้งหมด
async function loadAllSkillData(studentId) {
  try {
    // ⭐️ CHANGED: ดึง yearLevel จาก window.userData ที่ auth-check.js คำนวณไว้ให้
    const studentYearLevel = window.userData.calculatedYearLevel;
    if (!studentYearLevel) {
        console.warn("⚠️ current-skill.js: Cannot find calculatedYearLevel from auth-check.js! Will use fallback.");
    }

    // ดึงข้อมูลนักศึกษา (เผื่อใช้ชื่อ)
    const studentInfo = await fetchStudentInfo(studentId);
    
    // ⭐️ CHANGED: อัปเดตข้อมูลผู้ใช้ (ใช้ข้อมูลจาก auth-check.js เป็นหลัก)
    document.getElementById('student-name').textContent = window.userData.name || studentInfo.name || "นักศึกษา";
    // ใช้ yearLevel ที่คำนวณแล้ว (แม่นยำกว่า) หรือ fallback จาก studentInfo
    document.getElementById('student-info').textContent = `ชั้นปีที่ ${studentYearLevel || studentInfo.yearLevel}`;
    
    // ⭐️ CHANGED: ใช้ studentYearLevel ที่ดึงมา (fallback ไป 2 หากไม่มี)
    const currentYear = studentYearLevel || studentInfo.yearLevel || 2;
    const requiredSkills = await fetchRequiredSkills(currentYear);
    
    // ดึงกิจกรรมที่นักศึกษาเข้าร่วม
    const activities = await fetchStudentActivities(studentId);
    
    // ดึงทักษะที่นักศึกษาได้รับ (ทำแบบทดสอบผ่านแล้ว)
    const completedSkillsFromAPI = await fetchStudentSkills(studentId);
    
    // ... (ส่วนที่เหลือของฟังก์ชันนี้ทำงานได้ตามเดิม) ...
    const skillActivityCount = countActivitiesPerSkill(activities, requiredSkills);
    const skillPendingSurveyCount = countPendingSurveyActivities(activities, requiredSkills);
    
    console.log('Required Skills:', requiredSkills);
    console.log('Activities:', activities);
    console.log('Skill Activity Count:', skillActivityCount);
    console.log('Skill Pending Survey Count:', skillPendingSurveyCount);
    console.log('Completed Skills from API:', completedSkillsFromAPI);
    
    displaySkillsByStatus(requiredSkills, skillActivityCount, skillPendingSurveyCount, completedSkillsFromAPI);
    displayAllSkills(completedSkillsFromAPI);
    
    // ⭐️ CHANGED: ใช้ currentYear
    const optionalSkills = await fetchOptionalSkills(currentYear);
    const optionalSkillActivityCount = countActivitiesPerSkill(activities, optionalSkills);
    const optionalSkillPendingSurveyCount = countPendingSurveyActivities(activities, optionalSkills);
    
    console.log('Optional Skills:', optionalSkills);
    console.log('Optional Skill Activity Count:', optionalSkillActivityCount);
    
    displayOptionalSkillsByStatus(optionalSkills, optionalSkillActivityCount, optionalSkillPendingSurveyCount, completedSkillsFromAPI);
    
  } catch (error) {
    console.error('Error loading skill data:', error);
    showError();
  }
}

// (ฟังก์ชันที่เหลือทั้งหมด: countActivitiesPerSkill, countPendingSurveyActivities,
// displaySkillsByStatus, displayCompletedSkills, displayOptionalSkillsByStatus,
// displayOptionalCompletedSkills, displayOptionalPendingSkills, displayPendingSkills,
// displayAllSkills, showError, formatDate ไม่ต้องแก้ไข เพราะไม่ยุ่งกับ Auth)

// ... (คัดลอกฟังก์ชันที่เหลือทั้งหมดจากไฟล์เดิมมาวางที่นี่) ...

// (ตัวอย่างฟังก์ชันที่เหลือ... เพื่อความสมบูรณ์)

// ⭐ นับจำนวนกิจกรรมต่อทักษะ - ต้องทำแบบประเมินเสร็จด้วย
function countActivitiesPerSkill(activities, requiredSkills) {
  const skillCount = {};
  requiredSkills.forEach(skill => {
    skillCount[skill.skillId] = 0;
  });
  activities.forEach(activity => {
    if (activity.isConfirmed && 
        activity.skillId && 
        activity.surveyCompleted === true) {
      if (skillCount.hasOwnProperty(activity.skillId)) {
        skillCount[activity.skillId]++;
      }
    }
  });
  console.log('🔍 Activity counting details:');
  activities.forEach(activity => {
    console.log(`Activity ${activity.activityId}:`, {
      isConfirmed: activity.isConfirmed,
      surveyCompleted: activity.surveyCompleted,
      skillId: activity.skillId,
      counted: activity.isConfirmed && activity.skillId && activity.surveyCompleted === true
    });
  });
  return skillCount;
}

// ⭐ นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
function countPendingSurveyActivities(activities, requiredSkills) {
  const skillCount = {};
  requiredSkills.forEach(skill => {
    skillCount[skill.skillId] = 0;
  });
  activities.forEach(activity => {
    if (activity.isConfirmed && 
        activity.skillId && 
        activity.surveyCompleted === false) {
      if (skillCount.hasOwnProperty(activity.skillId)) {
        skillCount[activity.skillId]++;
      }
    }
  });
  return skillCount;
}

// แสดงทักษะแยกตามสถานะ
function displaySkillsByStatus(requiredSkills, skillActivityCount, skillPendingSurveyCount, completedSkillsFromAPI) {
  const passedSkillIds = new Set(completedSkillsFromAPI.map(skill => skill.skillId));
  const completedSkills = [];
  const pendingSkills = [];
  requiredSkills.forEach(skill => {
    const activityCount = skillActivityCount[skill.skillId] || 0;
    const pendingSurveyCount = skillPendingSurveyCount[skill.skillId] || 0;
    const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
    const hasPassedTest = passedSkillIds.has(skill.skillId);
    if (hasPassedTest) {
      completedSkills.push({ ...skill, activityCount, pendingSurveyCount, requiredCount, hasPassedTest: true });
    } else {
      pendingSkills.push({ ...skill, activityCount, pendingSurveyCount, requiredCount, hasPassedTest: false });
    }
  });
  displayCompletedSkills(completedSkills);
  displayPendingSkills(pendingSkills);
}

// แสดงทักษะที่ผ่านการทดสอบแล้ว
function displayCompletedSkills(skills) {
  const container = document.getElementById('completed-skills');
  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-message">ยังไม่มีทักษะที่ผ่านการทดสอบ</div>';
    return;
  }
  let html = '';
  skills.forEach(skill => {
    html += `
      <div class="skill-item">
        <div class="skill-left">
          <input type="checkbox" class="skill-checkbox" checked disabled>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-description">${skill.description || ''}</div>
            <div class="skill-status">✅ ผ่านการทดสอบแล้ว</div>
          </div>
        </div>
        <div class="activity-count completed">ผ่านแล้ว</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ⭐ แสดงทักษะอื่นๆ (ไม่บังคับ) แยกตามสถานะ
function displayOptionalSkillsByStatus(optionalSkills, skillActivityCount, skillPendingSurveyCount, completedSkillsFromAPI) {
  console.log('🔍 === OPTIONAL SKILLS DEBUG ===');
  const passedSkillIds = new Set(completedSkillsFromAPI.map(skill => skill.skillId));
  const completedOptionalSkills = [];
  const pendingOptionalSkills = [];
  optionalSkills.forEach(skill => {
    const activityCount = skillActivityCount[skill.skillId] || 0;
    const pendingSurveyCount = skillPendingSurveyCount[skill.skillId] || 0;
    const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
    const hasPassedTest = passedSkillIds.has(skill.skillId);
    if (activityCount > 0 || hasPassedTest) {
      if (hasPassedTest) {
        completedOptionalSkills.push({ ...skill, activityCount, pendingSurveyCount, requiredCount, hasPassedTest: true });
      } else {
        pendingOptionalSkills.push({ ...skill, activityCount, pendingSurveyCount, requiredCount, hasPassedTest: false });
      }
    }
  });
  console.log('🔍 === END OPTIONAL SKILLS DEBUG ===');
  displayOptionalCompletedSkills(completedOptionalSkills);
  displayOptionalPendingSkills(pendingOptionalSkills);
}

// แสดงทักษะไม่บังคับที่ผ่านการทดสอบแล้ว
function displayOptionalCompletedSkills(skills) {
  const container = document.getElementById('optional-completed-skills');
  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-message">ยังไม่มีทักษะอื่นๆ ที่ผ่านการทดสอบ</div>';
    return;
  }
  let html = '';
  skills.forEach(skill => {
    html += `
      <div class="skill-item">
        <div class="skill-left">
          <input type="checkbox" class="skill-checkbox" checked disabled>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-description">${skill.description || ''}</div>
            <div class="skill-status">✅ ผ่านการทดสอบแล้ว</div>
          </div>
        </div>
        <div class="activity-count completed">ผ่านแล้ว</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// แสดงทักษะไม่บังคับที่ยังไม่ผ่านการทดสอบ
function displayOptionalPendingSkills(skills) {
  const container = document.getElementById('optional-pending-skills');
  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-message">ยังไม่มีทักษะอื่นๆ ที่กำลังดำเนินการ</div>';
    return;
  }
  let html = '';
  skills.forEach(skill => {
    const isInProgress = skill.activityCount > 0;
    const needsSurvey = skill.pendingSurveyCount > 0;
    const canTakeTest = skill.activityCount >= (skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT);
    let countClass = '';
    let statusText = '';
    if (canTakeTest) {
      countClass = 'completed';
      statusText = '🎯 สามารถทำแบบทดสอบได้';
    } else if (isInProgress) {
      countClass = 'in-progress';
      statusText = '🔄 กำลังดำเนินการ';
    } else {
      countClass = '';
      if (needsSurvey) {
        statusText = `📋 มีกิจกรรมรอทำแบบประเมิน ${skill.pendingSurveyCount} กิจกรรม`;
      } else {
        statusText = '📋 ยังไม่เริ่มต้น';
      }
    }
    html += `
      <div class="skill-item">
        <div class="skill-left">
          <input type="checkbox" class="skill-checkbox" disabled>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-description">${skill.description || 'ไม่มีคำอธิบาย'}</div>
            <div class="skill-status">${statusText}</div>
          </div>
        </div>
        <div class="activity-count ${countClass}">${skill.activityCount}/${skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// แสดงทักษะที่ยังไม่ผ่านการทดสอบ
function displayPendingSkills(skills) {
  const container = document.getElementById('pending-skills');
  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-message">ทักษะบังคับทั้งหมดผ่านการทดสอบแล้ว</div>';
    return;
  }
  let html = '';
  skills.forEach(skill => {
    const isInProgress = skill.activityCount > 0;
    const needsSurvey = skill.pendingSurveyCount > 0;
    const canTakeTest = skill.activityCount >= (skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT);
    let countClass = '';
    let statusText = '';
    if (canTakeTest) {
      countClass = 'completed';
      statusText = '🎯 สามารถทำแบบทดสอบได้';
    } else if (isInProgress) {
      countClass = 'in-progress';
      statusText = '🔄 กำลังดำเนินการ';
    } else {
      countClass = '';
      if (needsSurvey) {
        statusText = `📋 มีกิจกรรมรอทำแบบประเมิน ${skill.pendingSurveyCount} กิจกรรม`;
      } else {
        statusText = '📋 ยังไม่เริ่มต้น';
      }
    }
    html += `
      <div class="skill-item">
        <div class="skill-left">
          <input type="checkbox" class="skill-checkbox" disabled>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-description">${skill.description || 'ไม่มีคำอธิบาย'}</div>
            <div class="skill-status">${statusText}</div>
          </div>
        </div>
        <div class="activity-count ${countClass}">${skill.activityCount}/${skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// แสดงทักษะที่ได้รับ (เฉพาะทักษะที่ทำแบบทดสอบผ่านแล้ว)
function displayAllSkills(completedSkillsFromAPI) {
  const container = document.getElementById('all-skills-list');
  if (!completedSkillsFromAPI || completedSkillsFromAPI.length === 0) {
    container.innerHTML = '<div class="empty-message">ยังไม่มีทักษะที่ผ่านการทดสอบ<br><small>ทำแบบทดสอบผ่านแล้วจึงจะแสดงที่นี่</small></div>';
    return;
  }
  let html = '';
  completedSkillsFromAPI.forEach(skill => {
    const completedDate = skill.completedDate || new Date().toISOString().split('T')[0];
    const finalScore = skill.FinalScore || skill.finalScore || 0;
    html += `
      <div class="skill-card">
        <h4>
          ${skill.skillName || skill.name}
          <span class="skill-badge">ผ่าน ${finalScore} คะแนน</span>
        </h4>
        <p>${skill.skillDescription || skill.description || 'สามารถผ่านการทดสอบในทักษะนี้แล้ว โดยได้คะแนนตามเกณฑ์ที่กำหนด'}</p>
        <div class="skill-meta">
          <span>ระดับ: ${skill.skillCategory || 'เริ่มต้น'}</span>
          <span>วันที่ได้รับ: ${formatDate(completedDate)}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// แสดงข้อผิดพลาด
function showError() {
  document.getElementById('completed-skills').innerHTML = `
    <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
  `;
  document.getElementById('pending-skills').innerHTML = `
    <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
  `;
  document.getElementById('all-skills-list').innerHTML = `
    <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
  `;
  document.getElementById('optional-completed-skills').innerHTML = `
    <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
  `;
  document.getElementById('optional-pending-skills').innerHTML = `
    <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
  `;
}

// ฟังก์ชันฟอร์แมตวันที่
function formatDate(dateString) {
  if (!dateString) return '25 พฤษภาคม 2568';
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  } catch (error) {
    return '25 พฤษภาคม 2568';
  }
}

// ⭐️ CHANGED: อัปเดตฟังก์ชัน Logout ให้ตรงกับ auth-check.js
function logout() {
  const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
  if (confirmLogout) {
    sessionStorage.removeItem('AchieveHubUser'); // ⭐️ CHANGED
    localStorage.clear(); // เคลียร์ของเก่าเผื่อไว้
    window.userData = null;
    window.userToken = null;
    window.location.href = "login.html";
  }
}