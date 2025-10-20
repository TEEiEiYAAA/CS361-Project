// Configuration
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
const REQUIRED_ACTIVITIES_COUNT = 3;

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
        
        // ตรวจสอบว่าเป็น student
        if (window.userData.role !== 'student') {
            console.error('Authentication failed - not a student:', window.userData.role);
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = "login.html";
            return;
        }
        
        // แสดงชื่อผู้ใช้
        const username = window.userData.name || window.userData.userId;
        document.getElementById('user-icon').title = "สวัสดี, " + username;
        
        // ดึงข้อมูลทักษะจาก API
        const studentId = window.userData.studentId || window.userData.userId;
        loadAllSkillData(studentId);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณา Login ใหม่');
        window.location.href = "login.html";
    }
});

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

// ฟังก์ชันดึงข้อมูลนักศึกษาจาก API
async function fetchStudentInfo(studentId) {
    try {
        const apiUrl = `${API_BASE_URL}/students/${studentId}/info`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${window.userToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update student info on webpage
        document.getElementById('student-name').textContent = data.name || window.userData.name || '-';
        document.getElementById('student-year').textContent = data.yearLevel || '-';
        document.getElementById('student-faculty').textContent = data.faculty || window.userData.faculty || 'วิทยาศาสตร์และเทคโนโลยี';
        document.getElementById('student-department').textContent = data.department || window.userData.department || 'วิทยาการคอมพิวเตอร์';
        
        return data;
        
    } catch (error) {
        console.error('Error fetching student info:', error);
        
        // Use window.userData if API fails
        document.getElementById('student-name').textContent = window.userData.name || '-';
        document.getElementById('student-year').textContent = window.userData.yearLevel || '-';
        document.getElementById('student-faculty').textContent = window.userData.faculty || 'วิทยาศาสตร์และเทคโนโลยี';
        document.getElementById('student-department').textContent = window.userData.department || 'วิทยาการคอมพิวเตอร์';
        
        return {
            name: window.userData.name || "นักศึกษา",
            yearLevel: window.userData.yearLevel || 2,
            department: window.userData.department || "วิทยาการคอมพิวเตอร์",
            faculty: window.userData.faculty
        };
    }
}

// ฟังก์ชันดึงทักษะทั้งหมดจาก API
async function fetchAllSkillsFromAPI(yearLevel) {
    try {
        const response = await fetch(`${API_BASE_URL}/skills/all`, {
            headers: {
                'Authorization': `Bearer ${window.userToken}`
            }
        });
        
        if (!response.ok) {
            const altResponse = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
                headers: {
                    'Authorization': `Bearer ${window.userToken}`
                }
            });
            
            if (altResponse.ok) {
                const allSkills = await altResponse.json();
                console.log('🔍 All skills from requiredSkills endpoint:', allSkills);
                return allSkills;
            }
            
            throw new Error(`API error ${response.status}`);
        }
        
        const allSkills = await response.json();
        console.log('🔍 All skills from skills/all endpoint:', allSkills);
        
        return allSkills.filter(skill => {
            if (skill.isRequired) {
                return skill.yearLevel == yearLevel;
            } else {
                return true;
            }
        });
        
    } catch (error) {
        console.error('Error fetching all skills:', error);
        return [];
    }
}

// ดึงกิจกรรมที่นักศึกษาเข้าร่วม
async function fetchStudentActivities(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/activities`, {
            headers: { 'Authorization': `Bearer ${window.userToken}` }
        });
        
        if (!response.ok) throw new Error(`API error ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
}

// ดึงทักษะที่ได้รับจริงๆ
async function fetchCompletedSkills(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/skills`, {
            headers: { 'Authorization': `Bearer ${window.userToken}` }
        });
        
        if (!response.ok) throw new Error(`API error ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching completed skills:', error);
        return [];
    }
}

// ฟังก์ชันหลักที่โหลดข้อมูลทั้งหมด
async function loadAllSkillData(studentId) {
    try {
        const studentInfo = await fetchStudentInfo(studentId);
        const allSkills = await fetchAllSkillsFromAPI(studentInfo.yearLevel);
        
        if (allSkills.length === 0) {
            console.warn('No skills data available from API');
            document.getElementById('quiz-container').innerHTML = `
                <div class="loading">
                    ⚠️ ไม่สามารถโหลดข้อมูลทักษะได้<br>
                    <small style="color: #666; font-size: 0.9rem;">
                        กรุณาตรวจสอบการเชื่อมต่อ API หรือติดต่อผู้ดูแลระบบ
                    </small>
                </div>
            `;
            return;
        }
        
        const requiredSkills = allSkills.filter(skill => skill.isRequired === true);
        const optionalSkills = allSkills.filter(skill => skill.isRequired === false);
        const activities = await fetchStudentActivities(studentId);
        const completedSkills = await fetchCompletedSkills(studentId);
        const skillActivityCount = countActivitiesPerSkill(activities, allSkills);
        
        const { unlockedRequired, lockedRequired, unlockedOptional, lockedOptional } = 
            calculateAllSkillProgress(requiredSkills, optionalSkills, skillActivityCount);
        
        console.log('=== Skill Debug Info ===');
        console.log('Required Skills:', requiredSkills.map(s => ({ id: s.skillId, name: s.name })));
        console.log('Optional Skills:', optionalSkills.map(s => ({ id: s.skillId, name: s.name })));
        console.log('Unlocked Required:', unlockedRequired.map(s => ({ id: s.skillId, name: s.name })));
        console.log('========================');
        
        const completedRequiredCount = countActualCompletedSkills(requiredSkills, completedSkills);
        const completedOptionalCount = countActualCompletedSkills(optionalSkills, completedSkills);
        const pendingRequiredCount = requiredSkills.length - completedRequiredCount;
        
        updateSkillStats(completedRequiredCount, pendingRequiredCount, completedOptionalCount);
        createQuizItems(unlockedRequired, unlockedOptional, completedSkills);
        
    } catch (error) {
        console.error('Error loading skill data:', error);
    }
}

// นับจำนวนกิจกรรมต่อทักษะ
function countActivitiesPerSkill(activities, allSkills) {
    const skillCount = {};
    
    allSkills.forEach(skill => {
        skillCount[skill.skillId] = 0;
    });
    
    activities.forEach(activity => {
        if (activity.surveyCompleted && activity.skillId) {
            if (skillCount.hasOwnProperty(activity.skillId)) {
                skillCount[activity.skillId]++;
            }
        }
    });
    
    return skillCount;
}

// คำนวณความก้าวหน้าของทักษะทั้งหมด
function calculateAllSkillProgress(requiredSkills, optionalSkills, skillActivityCount) {
    const unlockedRequired = [];
    const lockedRequired = [];
    const unlockedOptional = [];
    const lockedOptional = [];
    
    requiredSkills.forEach(skill => {
        const activityCount = skillActivityCount[skill.skillId] || 0;
        const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
        
        if (activityCount >= requiredCount) {
            unlockedRequired.push(skill);
        } else {
            lockedRequired.push(skill);
        }
    });
    
    optionalSkills.forEach(skill => {
        const activityCount = skillActivityCount[skill.skillId] || 0;
        const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
        
        if (activityCount >= requiredCount) {
            unlockedOptional.push(skill);
        } else {
            lockedOptional.push(skill);
        }
    });
    
    return { unlockedRequired, lockedRequired, unlockedOptional, lockedOptional };
}

// นับทักษะที่ได้รับจริง
function countActualCompletedSkills(targetSkills, completedSkills) {
    if (!targetSkills || !completedSkills) return 0;
    
    const targetSkillIds = targetSkills.map(skill => skill.skillId);
    const completedSkillIds = completedSkills.map(skill => skill.skillId);
    const matchedSkills = targetSkillIds.filter(skillId => completedSkillIds.includes(skillId));
    
    return matchedSkills.length;
}

// อัปเดตข้อมูลทักษะในวงกลมและตัวเลข
function updateSkillStats(completedRequired, pendingRequired, completedOptional) {
    const totalRequiredSkills = completedRequired + pendingRequired;
    
    document.getElementById('progress-text').textContent = `${completedRequired}/${totalRequiredSkills}`;
    
    const progressPercent = totalRequiredSkills > 0 ? (completedRequired / totalRequiredSkills) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const dashoffset = circumference - (circumference * progressPercent / 100);
    
    document.getElementById('progress-indicator').setAttribute('stroke-dasharray', circumference);
    document.getElementById('progress-indicator').setAttribute('stroke-dashoffset', dashoffset);
    
    document.getElementById('completed-required-skills').textContent = completedRequired;
    document.getElementById('pending-required-skills').textContent = pendingRequired;
    document.getElementById('completed-optional-skills').textContent = completedOptional;
}

// สร้างรายการแบบทดสอบ
function createQuizItems(unlockedRequired, unlockedOptional, completedSkills) {
    const quizContainer = document.getElementById('quiz-container');
    let html = '';
    
    const completedSkillIds = new Set(completedSkills.map(skill => skill.skillId));
    const allUnlockedSkills = [...unlockedRequired, ...unlockedOptional];
    
    if (allUnlockedSkills.length > 0) {
        allUnlockedSkills.forEach(skill => {
            const isAlreadyCompleted = completedSkillIds.has(skill.skillId);
            const isOptional = skill.isRequired === false;
            
            if (isAlreadyCompleted) {
                html += `
                    <div class="quiz-item">
                        <p>✅ ${skill.name}</p>
                        <button class="gray-btn" disabled>ผ่านแล้ว</button>
                    </div>
                `;
            } else {
                html += `
                    <div class="quiz-item">
                        <p>${isOptional ? '⭐' : '📝'} ${skill.name}</p>
                        <button class="green-bt" onclick="startQuiz('${skill.skillId}')">ทำแบบทดสอบ</button>
                    </div>
                `;
            }
        });
    }
    
    if (allUnlockedSkills.length === 0) {
        html = `
            <div class="loading">
                🔒 ยังไม่มีแบบทดสอบที่ปลดล็อก<br>
                <small style="color: #666; font-size: 0.9rem;">
                    เข้าร่วมกิจกรรมให้ครบจำนวนที่กำหนดเพื่อปลดล็อกแบบทดสอบ
                </small>
            </div>
        `;
    } else {
        html += `
            <div class="quiz-item" style="background-color: #f5f5f5; border: 1px dashed #ccc;">
                <p>🔒 ทักษะอื่นๆ ที่ยังไม่ปลดล็อก</p>
                <button class="gray-btn" disabled>เข้าร่วมกิจกรรมเพิ่มเติม</button>
            </div>
        `;
    }
    
    quizContainer.innerHTML = html;
}

// เริ่มทำแบบทดสอบ
function startQuiz(skillId) {
    const skillNames = {
        'skill001': 'ด้านความรู้เรื่องความปลอดภัย',
        'skill002': 'ด้านทักษะการเขียนโปรแกรม',
        'skill003': 'ด้านทักษะการประยุกต์และติดตั้ง',
        'skill004': 'ด้านลักษณะบุคคล',
        'skill005': 'ด้านทักษะการสื่อสาร',
        'skill006': 'ด้านลักษณะบุคคลผู้มีภาวะผู้นำ',
        'skill007': 'ด้านทักษะการจัดการฐานข้อมูล',
        'skill008': 'ด้านทักษะเครือข่ายคอมพิวเตอร์',
        'skill009': 'ด้านทักษะการแก้ไขปัญหา',
        'skill010': 'ด้านทักษะการบริหารเวลา'
    };
    
    const skillName = skillNames[skillId] || 'ทักษะ';
    
    const confirmStart = confirm(
        `🎯 ต้องการเริ่มทำแบบทดสอบ "${skillName}" หรือไม่?\n\n` +
        `📋 จำนวนข้อ: 10 ข้อ\n` +
        `⏰ เวลา: 15 นาที\n` +
        `📊 เกณฑ์ผ่าน: 70% (7 ข้อขึ้นไป)\n` +
        `🏆 หากผ่าน: จะได้รับทักษะนี้\n\n` +
        `⚠️ หมายเหตุ: เมื่อเริ่มแล้วจะนับเวลาทันที`
    );
    
    if (confirmStart) {
        // เข้ารหัสข้อมูล session เพื่อส่งต่อ
        const sessionData = {
            token: window.userToken,
            user: window.userData
        };
        const userDataEncoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        
        window.location.href = `quiz.html?skillId=${skillId}&data=${userDataEncoded}`;
    }
}

// ฟังก์ชันล็อกเอาท์
function logout() {
    const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
        window.userData = null;
        window.userToken = null;
        window.location.href = "login.html";
    }
}

// ป้องกันการกดปุ่ม Back
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};