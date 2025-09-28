// Configuration
    const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
    const REQUIRED_ACTIVITIES_COUNT = 3;
    
    // Global variables
    let currentStudentId = null;
    
    // ตรวจสอบการล็อกอินและดึง studentId จาก URL
    document.addEventListener('DOMContentLoaded', function() {
      // ตรวจสอบว่าเป็นอาจารย์หรือไม่
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if (!userData.userId || userData.role !== 'advisor') {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location.href = "login.html";
        return;
      }
      
      // ดึง studentId จาก URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      currentStudentId = urlParams.get('studentId');
      
      if (!currentStudentId) {
        alert('ไม่พบข้อมูลนักศึกษาที่ต้องการดู');
        window.location.href = "advisor-dashboard.html";
        return;
      }
      
      // โหลดข้อมูลนักศึกษา
      loadStudentData(currentStudentId);
    });

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
        
        // แสดงข้อผิดพลาดแต่ยังคงพยายามดึงข้อมูลจากที่อื่น
        return {
          name: "ไม่สามารถดึงข้อมูลได้",
          yearLevel: 2,
          department: "วิทยาการคอมพิวเตอร์"
        };
      }
    }

    // ดึงทักษะที่บังคับสำหรับชั้นปี
    async function fetchRequiredSkills(yearLevel) {
      try {
        const response = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error(`API error ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching required skills:', error);
        // ข้อมูลตัวอย่างตามโครงสร้างจริงจากไฟล์ Skills.txt
        return [
          { 
            skillId: "skill005", 
            name: "ด้านทักษะการสื่อสาร", 
            description: "จำนวนกิจกรรมที่เข้าร่วม",
            category: "soft skill",
            subcategory: "Communication",
            yearLevel: 1, 
            isRequired: true,
            requiredActivities: 3,
            passingScore: 70
          },
          { 
            skillId: "skill006", 
            name: "ด้านลักษณะบุคคลผู้มีภาวะผู้นำ", 
            description: "จำนวนกิจกรรมที่เข้าร่วม",
            category: "soft skill", 
            subcategory: "Leadership",
            yearLevel: 2, 
            isRequired: true,
            requiredActivities: 3,
            passingScore: 70
          },
          { 
            skillId: "skill009", 
            name: "ด้านทักษะการแก้ไขปัญหา", 
            description: "จำนวนกิจกรรมที่เข้าร่วม",
            category: "soft skill",
            subcategory: "Problem Solving", 
            yearLevel: 1, 
            isRequired: true,
            requiredActivities: 3,
            passingScore: 70
          },
          { 
            skillId: "skill002", 
            name: "ด้านทักษะการเขียนโปรแกรม", 
            description: "จำนวนกิจกรรมที่เข้าร่วม",
            category: "hard skill",
            subcategory: "Programming", 
            yearLevel: 2, 
            isRequired: true,
            requiredActivities: 3,
            passingScore: 70
          }
        ].filter(skill => skill.yearLevel <= yearLevel && skill.isRequired);
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

    // ฟังก์ชันหลักที่โหลดข้อมูลนักศึกษา
    async function loadStudentData(studentId) {
      try {
        // ดึงข้อมูลนักศึกษา
        const studentInfo = await fetchStudentInfo(studentId);
        
        // ดึงทักษะบังคับสำหรับชั้นปี
        const requiredSkills = await fetchRequiredSkills(studentInfo.yearLevel);
        
        // ดึงกิจกรรมที่นักศึกษาเข้าร่วม
        const activities = await fetchStudentActivities(studentId);
        
        // ดึงทักษะที่ได้รับจริงๆ (ผ่านแบบทดสอบแล้ว)
        const completedSkills = await fetchCompletedSkills(studentId);
        
        // นับจำนวนกิจกรรมต่อทักษะ (ต้องทำแบบประเมินเสร็จ)
        const skillActivityCount = countActivitiesPerSkill(activities, requiredSkills);
        
        // นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
        const skillPendingSurveyCount = countPendingSurveyActivities(activities, requiredSkills);
        
        console.log('Student Info:', studentInfo);
        console.log('Required Skills:', requiredSkills);
        console.log('Activities:', activities);
        console.log('Skill Activity Count:', skillActivityCount);
        console.log('Completed Skills from API:', completedSkills);
        
        // แสดงทักษะแยกตามสถานะ
        displaySkillsByStatus(requiredSkills, skillActivityCount, skillPendingSurveyCount, completedSkills);
        
        // อัปเดตส่วน Dashboard
        updateDashboardStats(requiredSkills, completedSkills);
        
      } catch (error) {
        console.error('Error loading student data:', error);
        showError();
      }
    }

    // นับจำนวนกิจกรรมต่อทักษะ - ต้องทำแบบประเมินเสร็จด้วย
    function countActivitiesPerSkill(activities, requiredSkills) {
      const skillCount = {};
      
      // เริ่มต้นด้วย 0 สำหรับทุกทักษะบังคับ
      requiredSkills.forEach(skill => {
        skillCount[skill.skillId] = 0;
      });
      
      // นับกิจกรรมที่ยืนยันแล้ว มี skillId และทำแบบประเมินเสร็จแล้ว
      activities.forEach(activity => {
        if (activity.isConfirmed && 
            activity.skillId && 
            activity.surveyCompleted === true) {
          
          if (skillCount.hasOwnProperty(activity.skillId)) {
            skillCount[activity.skillId]++;
          }
        }
      });
      
      return skillCount;
    }

    // นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
    function countPendingSurveyActivities(activities, requiredSkills) {
      const skillCount = {};
      
      // เริ่มต้นด้วย 0 สำหรับทุกทักษะบังคับ
      requiredSkills.forEach(skill => {
        skillCount[skill.skillId] = 0;
      });
      
      // นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
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
      // สร้าง Set ของ skillId ที่ทำแบบทดสอบผ่านแล้ว
      const passedSkillIds = new Set(completedSkillsFromAPI.map(skill => skill.skillId));
      
      const completedSkills = [];
      const pendingSkills = [];
      
      requiredSkills.forEach(skill => {
        const activityCount = skillActivityCount[skill.skillId] || 0;
        const pendingSurveyCount = skillPendingSurveyCount[skill.skillId] || 0;
        const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
        const hasPassedTest = passedSkillIds.has(skill.skillId);
        
        // ทักษะจะอยู่ในหมวด "ผ่านการทดสอบแล้ว" เมื่อทำแบบทดสอบผ่านแล้วเท่านั้น
        if (hasPassedTest) {
          completedSkills.push({ 
            ...skill, 
            activityCount, 
            pendingSurveyCount,
            requiredCount, 
            hasPassedTest: true 
          });
        } else {
          pendingSkills.push({ 
            ...skill, 
            activityCount, 
            pendingSurveyCount,
            requiredCount, 
            hasPassedTest: false 
          });
        }
      });
      
      // แสดงทักษะที่ผ่านการทดสอบแล้ว
      displayCompletedSkills(completedSkills);
      
      // แสดงทักษะที่ยังไม่ผ่านการทดสอบ
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
          // 3/3 = สีเขียว
          countClass = 'completed';
          statusText = '🎯 สามารถทำแบบทดสอบได้';
        } else if (isInProgress) {
          // 1/3, 2/3 = สีส้ม
          countClass = 'in-progress';
          statusText = '🔄 กำลังดำเนินการ';
        } else {
          // 0/3 = สีเทา
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

    // อัปเดตส่วน Dashboard
    function updateDashboardStats(requiredSkills, completedSkills) {
      const completedSkillIds = new Set(completedSkills.map(skill => skill.skillId));
      
      // นับทักษะบังคับที่ผ่านแล้ว
      const completedRequiredCount = requiredSkills.filter(skill => 
        completedSkillIds.has(skill.skillId)
      ).length;
      
      const totalRequiredSkills = requiredSkills.length;
      const pendingRequiredCount = totalRequiredSkills - completedRequiredCount;
      
      // นับทักษะเพิ่มเติม (ไม่บังคับ) ที่ผ่านแล้ว
      const completedOptionalCount = completedSkills.filter(skill => {
        // ถ้าไม่อยู่ในรายการทักษะบังคับ แสดงว่าเป็นทักษะเพิ่มเติม
        const requiredSkillIds = requiredSkills.map(req => req.skillId);
        return !requiredSkillIds.includes(skill.skillId);
      }).length;
      
      // อัปเดตตัวเลขในวงกลม
      document.getElementById('progress-text').textContent = `${completedRequiredCount}/${totalRequiredSkills}`;
      
      // คำนวณเปอร์เซ็นต์ความก้าวหน้า
      const progressPercent = totalRequiredSkills > 0 ? (completedRequiredCount / totalRequiredSkills) * 100 : 0;
      const circumference = 2 * Math.PI * 45;
      const dashoffset = circumference - (circumference * progressPercent / 100);
      
      // อัปเดตวงกลมความก้าวหน้า
      document.getElementById('progress-indicator').setAttribute('stroke-dasharray', circumference);
      document.getElementById('progress-indicator').setAttribute('stroke-dashoffset', dashoffset);
      
      // อัปเดตตัวเลขทักษะ
      document.getElementById('completed-required-skills').textContent = completedRequiredCount;
      document.getElementById('pending-required-skills').textContent = pendingRequiredCount;
      document.getElementById('completed-optional-skills').textContent = completedOptionalCount;
    }

    // แสดงข้อผิดพลาด
    function showError() {
      document.getElementById('completed-skills').innerHTML = `
        <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
      `;
      document.getElementById('pending-skills').innerHTML = `
        <div class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูลทักษะ</div>
      `;
    }

    // ฟังก์ชันสำหรับปุ่มย้อนกลับ
    function goBack() {
      window.location.href = "advisor-dashboard.html";
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