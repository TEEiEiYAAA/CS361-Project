// Configuration
    const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
    const REQUIRED_ACTIVITIES_COUNT = 3;
    
    // ตรวจสอบการล็อกอิน
    document.addEventListener('DOMContentLoaded', function() {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // ตรวจสอบว่ามีการล็อกอินหรือไม่
      if ((!userData.userId && !userData.studentId) || userData.role !== 'student') {
        // ถ้าไม่ได้ล็อกอินหรือไม่ใช่นักศึกษา ให้กลับไปหน้าล็อกอิน
        window.location.href = "login.html";
        return;
      }
      
      // แสดงชื่อผู้ใช้
      const username = userData.name || userData.userId;
      document.getElementById('user-icon').title = "สวัสดี, " + username;
      
      // ดึงข้อมูลทักษะจาก API
      const studentId = userData.studentId || userData.userId;
      loadAllSkillData(studentId);
    });

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

    // ฟังก์ชันดึงข้อมูลนักศึกษาจาก API
    async function fetchStudentInfo(studentId) {
    try {
      const apiUrl = `${API_BASE_URL}/students/${studentId}/info`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update student info on webpage
      document.getElementById('student-name').textContent = data.name || '-';
      document.getElementById('student-year').textContent = data.yearLevel || '-';
      document.getElementById('student-faculty').textContent = 'วิทยาศาสตร์และเทคโนโลยี';
      document.getElementById('student-department').textContent = data.department || 'วิทยาการคอมพิวเตอร์';
      
      return data;
      
    } catch (error) {
      console.error('Error fetching student info:', error);
      // Use localStorage data if API fails
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // Update with localStorage values
      document.getElementById('student-name').textContent = userData.name || '-';
      document.getElementById('student-year').textContent = userData.yearLevel || '-';
      document.getElementById('student-faculty').textContent = 'วิทยาศาสตร์และเทคโนโลยี';
      document.getElementById('student-department').textContent = userData.department || 'วิทยาการคอมพิวเตอร์';
      
      return {
        name: userData.name || "นักศึกษา",
        yearLevel: userData.yearLevel || 2,
        department: userData.department || "วิทยาการคอมพิวเตอร์"
      };
    }
  }

    // ฟังก์ชันดึงทักษะทั้งหมดจาก API (ใช้ endpoint เดียวกันกับ current-skill.html)
    async function fetchAllSkillsFromAPI(yearLevel) {
      try {
        // ⭐ ใช้ API /skills/all ที่มีอยู่แล้ว (เหมือน current-skill.html)
        const response = await fetch(`${API_BASE_URL}/skills/all`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          // ถ้า endpoint ไม่มี ลองใช้วิธีเดิมก่อน
          const altResponse = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        
        // กรองทักษะที่เหมาะสมกับนักศึกษา
        return allSkills.filter(skill => {
          if (skill.isRequired) {
            return skill.yearLevel == yearLevel; // ทักษะบังคับต้องตาม yearLevel
          } else {
            return true; // ทักษะไม่บังคับแสดงทุกอัน
          }
        });
        
      } catch (error) {
        console.error('Error fetching all skills:', error);
        return []; // ส่งกลับ array ว่างถ้าเรียก API ไม่ได้
      }
    }



    // ดึงกิจกรรมที่นักศึกษาเข้าร่วม
    async function fetchStudentActivities(studentId) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/activities`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error(`API error ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
      }
    }

    // ดึงทักษะที่ได้รับจริงๆ (จาก CompletedSkills)
    async function fetchCompletedSkills(studentId) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/skills`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
        // ดึงข้อมูลนักศึกษา
        const studentInfo = await fetchStudentInfo(studentId);
        
        // ดึงทักษะทั้งหมดสำหรับชั้นปี (จาก API จริง)
        const allSkills = await fetchAllSkillsFromAPI(studentInfo.yearLevel);
        
        // ตรวจสอบว่าได้ข้อมูลหรือไม่
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
        
        // แยกทักษะบังคับและไม่บังคับ
        const requiredSkills = allSkills.filter(skill => skill.isRequired === true);
        const optionalSkills = allSkills.filter(skill => skill.isRequired === false);
        
        // ดึงกิจกรรมที่นักศึกษาเข้าร่วม
        const activities = await fetchStudentActivities(studentId);
        
        // ดึงทักษะที่ได้รับจริงๆ (ผ่านแบบทดสอบแล้ว)
        const completedSkills = await fetchCompletedSkills(studentId);
        
        // นับจำนวนกิจกรรมต่อทักษะ
        const skillActivityCount = countActivitiesPerSkill(activities, allSkills);
        
        // คำนวณทักษะที่ผ่านแล้วตามระบบใหม่
        const { unlockedRequired, lockedRequired, unlockedOptional, lockedOptional } = 
          calculateAllSkillProgress(requiredSkills, optionalSkills, skillActivityCount);
        
        // Debug logging
        console.log('=== Skill Debug Info ===');
        console.log('Required Skills:', requiredSkills.map(s => ({ id: s.skillId, name: s.name })));
        console.log('Optional Skills:', optionalSkills.map(s => ({ id: s.skillId, name: s.name })));
        console.log('Skill Activity Count:', skillActivityCount);
        console.log('Unlocked Required:', unlockedRequired.map(s => ({ id: s.skillId, name: s.name })));
        console.log('Unlocked Optional:', unlockedOptional.map(s => ({ id: s.skillId, name: s.name })));
        console.log('========================');
        
        // นับทักษะที่ได้รับจริง - แยกชัดเจนระหว่างบังคับและไม่บังคับ
        const completedRequiredCount = countActualCompletedSkills(requiredSkills, completedSkills);
        const completedOptionalCount = countActualCompletedSkills(optionalSkills, completedSkills);
        
        // คำนวณทักษะบังคับที่ยังไม่ผ่าน  
        const pendingRequiredCount = requiredSkills.length - completedRequiredCount;
        
        console.log('=== Final Skill Count Summary ===');
        console.log('✅ Required skills passed test:', completedRequiredCount);
        console.log('⏳ Required skills not passed test:', pendingRequiredCount); 
        console.log('🌟 Optional skills passed test:', completedOptionalCount);
        console.log('📋 Total required skills available:', requiredSkills.length);
        console.log('📋 Total optional skills available:', optionalSkills.length);
        console.log('===============================');
        
        // ⭐ อัปเดตข้อมูลทักษะ - วงกลมคำนวณจากทักษะบังคับเท่านั้น
        updateSkillStats(completedRequiredCount, pendingRequiredCount, completedOptionalCount);
        
        // สร้างแบบทดสอบ (แสดงทั้งทักษะบังคับและไม่บังคับ)
        createQuizItems(unlockedRequired, unlockedOptional, completedSkills);
        
      } catch (error) {
        console.error('Error loading skill data:', error);
      }
    }

    // นับจำนวนกิจกรรมต่อทักษะ (รองรับทั้งทักษะบังคับและไม่บังคับ)
    function countActivitiesPerSkill(activities, allSkills) {
      const skillCount = {};
      
      // เริ่มต้นด้วย 0 สำหรับทุกทักษะ
      allSkills.forEach(skill => {
        skillCount[skill.skillId] = 0;
      });
      
      // นับกิจกรรมที่ยืนยันแล้วและมี skillId
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
      
      // ตรวจสอบทักษะบังคับ
      requiredSkills.forEach(skill => {
        const activityCount = skillActivityCount[skill.skillId] || 0;
        const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
        
        if (activityCount >= requiredCount) {
          unlockedRequired.push(skill);
        } else {
          lockedRequired.push(skill);
        }
      });
      
      // ตรวจสอบทักษะไม่บังคับ
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

    // นับทักษะที่ได้รับจริง (ผ่านแบบทดสอบแล้ว) - แยกชัดเจนระหว่างบังคับและไม่บังคับ
    function countActualCompletedSkills(targetSkills, completedSkills) {
      if (!targetSkills || !completedSkills) return 0;
      
      const targetSkillIds = targetSkills.map(skill => skill.skillId);
      const completedSkillIds = completedSkills.map(skill => skill.skillId);
      
      // นับเฉพาะทักษะที่อยู่ใน targetSkills และได้รับจริง
      const matchedSkills = targetSkillIds.filter(skillId => completedSkillIds.includes(skillId));
      
      console.log(`🔍 Counting skills for ${targetSkills[0]?.isRequired ? 'REQUIRED' : 'OPTIONAL'}:`);
      console.log('  Target skill IDs:', targetSkillIds);
      console.log('  Completed skill IDs:', completedSkillIds);  
      console.log('  Matched skills:', matchedSkills);
      console.log('  Count result:', matchedSkills.length);
      
      return matchedSkills.length;
    }

    // อัปเดตข้อมูลทักษะในวงกลมและตัวเลข
    function updateSkillStats(completedRequired, pendingRequired, completedOptional) {
      const totalRequiredSkills = completedRequired + pendingRequired;
      
      // อัปเดตตัวเลขในวงกลม (แสดงเฉพาะทักษะบังคับ)
      document.getElementById('progress-text').textContent = `${completedRequired}/${totalRequiredSkills}`;
      
      // คำนวณเปอร์เซ็นต์ความก้าวหน้า (จากทักษะบังคับ)
      const progressPercent = totalRequiredSkills > 0 ? (completedRequired / totalRequiredSkills) * 100 : 0;
      const circumference = 2 * Math.PI * 45;
      const dashoffset = circumference - (circumference * progressPercent / 100);
      
      // อัปเดตวงกลมความก้าวหน้า
      document.getElementById('progress-indicator').setAttribute('stroke-dasharray', circumference);
      document.getElementById('progress-indicator').setAttribute('stroke-dashoffset', dashoffset);
      
      // อัปเดตตัวเลขทักษะ
      document.getElementById('completed-required-skills').textContent = completedRequired;
      document.getElementById('pending-required-skills').textContent = pendingRequired;
      document.getElementById('completed-optional-skills').textContent = completedOptional;
    }

    // สร้างรายการแบบทดสอบ (แสดงทักษะที่ปลดล็อกแล้วทั้งหมดในรูปแบบเดียวกัน)
    function createQuizItems(unlockedRequired, unlockedOptional, completedSkills) {
      const quizContainer = document.getElementById('quiz-container');
      let html = '';
      
      // สร้าง Set ของ skillId ที่ได้รับแล้ว
      const completedSkillIds = new Set(completedSkills.map(skill => skill.skillId));
      
      // รวมทักษะที่ปลดล็อกแล้วทั้งหมด
      const allUnlockedSkills = [...unlockedRequired, ...unlockedOptional];
      
      // แสดงทักษะที่ปลดล็อกแล้ว
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
            // ใช้ปุ่มสีเดียวกันสำหรับทุกทักษะ
            html += `
              <div class="quiz-item">
                <p>${isOptional ? '⭐' : '📝'} ${skill.name}</p>
                <button class="green-bt" onclick="startQuiz('${skill.skillId}')">ทำแบบทดสอบ</button>
              </div>
            `;
          }
        });
      }
      
      // เพิ่มข้อความสำหรับทักษะที่ยังไม่ปลดล็อก
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
      // ดึงข้อมูลทักษะเพื่อแสดงชื่อ
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
      
      // แสดง dialog ยืนยัน
      const confirmStart = confirm(
        `🎯 ต้องการเริ่มทำแบบทดสอบ "${skillName}" หรือไม่?\n\n` +
        `📋 จำนวนข้อ: 10 ข้อ\n` +
        `⏰ เวลา: 15 นาที\n` +
        `📊 เกณฑ์ผ่าน: 70% (7 ข้อขึ้นไป)\n` +
        `🏆 หากผ่าน: จะได้รับทักษะนี้\n\n` +
        `⚠️ หมายเหตุ: เมื่อเริ่มแล้วจะนับเวลาทันที`
      );
      
      if (confirmStart) {
        // นำทางไปหน้าทำแบบทดสอบ
        window.location.href = `quiz.html?skillId=${skillId}`;
      }
    }

    // ฟังก์ชันฟอร์แมตวันที่
    function formatDate(dateString) {
      if (!dateString) return 'ไม่ระบุ';
      
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('th-TH', options);
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