    // Configuration
    const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
    const REQUIRED_ACTIVITIES_COUNT = 3;
    
    // ตรวจสอบการล็อกอิน
    document.addEventListener('DOMContentLoaded', function() {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if ((!userData.userId && !userData.studentId) || userData.role !== 'student') {
        window.location.href = "login.html";
        return;
      }
      
      const studentId = userData.studentId || userData.userId;
      loadAllSkillData(studentId);
    });

    // ดึงข้อมูลนักศึกษา
    async function fetchStudentInfo(studentId) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/info`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error(`API error ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching student info:', error);
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        return { 
          name: userData.name || "นักศึกษา",
          yearLevel: userData.yearLevel || 2
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

    // ดึงทักษะที่ไม่บังคับ (isRequired = false)
    async function fetchOptionalSkills(yearLevel) {
      try {
        // ⭐ เปลี่ยนจากการใช้ requiredSkills endpoint เป็นการ scan Skills table ทั้งหมด
        const response = await fetch(`${API_BASE_URL}/skills/all`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) {
          // ถ้า endpoint ไม่มี ลองใช้วิธีเดิมก่อน
          const altResponse = await fetch(`${API_BASE_URL}/requiredSkills/${yearLevel}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (altResponse.ok) {
            const allSkills = await altResponse.json();
            console.log('🔍 All skills from requiredSkills endpoint:', allSkills);
            
            // กรองเฉพาะทักษะที่ไม่บังคับ
            const optionalSkills = allSkills.filter(skill => skill.isRequired === false);
            console.log('🔍 Optional skills filtered:', optionalSkills);
            return optionalSkills;
          }
          
          throw new Error(`API error ${response.status}`);
        }
        
        const allSkills = await response.json();
        console.log('🔍 All skills from skills/all endpoint:', allSkills);
        
        // กรองเฉพาะทักษะที่ไม่บังคับและเหมาะกับชั้นปี
        const optionalSkills = allSkills.filter(skill => 
          skill.isRequired === false 
        );
        
        console.log('🔍 Optional skills filtered:', optionalSkills);
        return optionalSkills;
        
      } catch (error) {
        console.error('Error fetching optional skills:', error);
        // ข้อมูลตัวอย่างทักษะไม่บังคับจาก Skills.txt - อัปเดตให้ตรงกับข้อมูลจริง
        const sampleOptionalSkills = [
          { 
            skillId: "skill001", 
            name: "ด้านความรู้เรื่องความปลอดภัย", 
            description: "สามารถอธิบายองค์ความรู้และเทคโนโลยีทางวิทยาการคอมพิวเตอร์ในกระบวนการพัฒนาซอฟต์แวร์ได้อย่างเป็นระบบตรงตามความต้องการและมีมุมมองด้านความปลอดภัย",
            category: "hard skill",
            subcategory: "Cybersecurity",
            yearLevel: 3, 
            isRequired: false,  // ⭐ ในตาราง Skills skill001 เป็น isRequired: false
            requiredActivities: 3,
            passingScore: 70
          },
          { 
            skillId: "skill003", 
            name: "ด้านทักษะการประยุกต์และติดตั้ง", 
            description: "สามารถประยุกต์ใช้ความรู้พื้นฐานที่มีในการเรียนรู้เครื่องมือและเทคโนโลยีใหม่เพื่อตอบสนองต่อการเปลี่ยนแปลงอันรวดเร็วในศาสตร์วิทยาการคอมพิวเตอร์",
            category: "hard skill",
            subcategory: "Web & App Development",
            yearLevel: 3, 
            isRequired: false,
            requiredActivities: 2,
            passingScore: 70
          },
          { 
            skillId: "skill004", 
            name: "ด้านลักษณะบุคคล", 
            description: "ตระหนักรู้แนวคิดแบบผู้ประกอบการ",
            category: "soft skill", 
            subcategory: "Entrepreneurship",
            yearLevel: 1, 
            isRequired: false,
            requiredActivities: 1,
            passingScore: 70
          },
          { 
            skillId: "skill007", 
            name: "ด้านทักษะการจัดการฐานข้อมูล", 
            description: "สามารถออกแบบและบริหารจัดการฐานข้อมูลอย่างมีประสิทธิภาพ เพื่อรองรับการจัดเก็บและเรียกใช้ข้อมูลที่เหมาะสมกับองค์กร",
            category: "hard skill",
            subcategory: "Database", 
            yearLevel: 3, 
            isRequired: false,
            requiredActivities: 2,
            passingScore: 75
          },
          { 
            skillId: "skill008", 
            name: "ด้านทักษะเครือข่ายคอมพิวเตอร์", 
            description: "เข้าใจและสามารถบริหารจัดการเครือข่ายคอมพิวเตอร์ รวมถึงการตั้งค่าและแก้ไขปัญหาเบื้องต้นของระบบเครือข่าย",
            category: "hard skill",
            subcategory: "Networking", 
            yearLevel: 3, 
            isRequired: false,
            requiredActivities: 2,
            passingScore: 75
          },
          { 
            skillId: "skill010", 
            name: "ด้านทักษะการบริหารเวลา", 
            description: "สามารถบริหารจัดการเวลาได้อย่างมีประสิทธิภาพ เพื่อให้การทำงานและการเรียนเป็นไปตามเป้าหมายและเวลาที่กำหนด",
            category: "soft skill",
            subcategory: "Time Management", 
            yearLevel: 1, 
            isRequired: false,
            requiredActivities: 2,
            passingScore: 70
          }
        ].filter(skill => skill.yearLevel <= yearLevel);
        
        console.log('🔍 Using sample optional skills:', sampleOptionalSkills);
        return sampleOptionalSkills;
      }
    }
    async function fetchStudentSkills(studentId) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/skills`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
        // ดึงข้อมูลนักศึกษา
        const studentInfo = await fetchStudentInfo(studentId);
        
        // อัปเดตข้อมูลผู้ใช้
        document.getElementById('student-name').textContent = studentInfo.name || "นักศึกษา";
        document.getElementById('student-info').textContent = `ชั้นปีที่ ${studentInfo.yearLevel}`;
        
        // ดึงทักษะบังคับสำหรับชั้นปี
        const requiredSkills = await fetchRequiredSkills(studentInfo.yearLevel);
        
        // ดึงกิจกรรมที่นักศึกษาเข้าร่วม
        const activities = await fetchStudentActivities(studentId);
        
        // ดึงทักษะที่นักศึกษาได้รับ (ทำแบบทดสอบผ่านแล้ว)
        const completedSkillsFromAPI = await fetchStudentSkills(studentId);
        
        // นับจำนวนกิจกรรมต่อทักษะ (ต้องทำแบบประเมินเสร็จ)
        const skillActivityCount = countActivitiesPerSkill(activities, requiredSkills);
        
        // นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
        const skillPendingSurveyCount = countPendingSurveyActivities(activities, requiredSkills);
        
        console.log('Required Skills:', requiredSkills);
        console.log('Activities:', activities);
        console.log('Skill Activity Count:', skillActivityCount);
        console.log('Skill Pending Survey Count:', skillPendingSurveyCount);
        console.log('Completed Skills from API:', completedSkillsFromAPI);
        
        // แสดงทักษะแยกตามสถานะ โดยใช้ข้อมูลจาก CompletedSkills table
        displaySkillsByStatus(requiredSkills, skillActivityCount, skillPendingSurveyCount, completedSkillsFromAPI);
        
        // แสดงทักษะที่ได้รับ (เฉพาะทักษะที่ทำแบบทดสอบผ่านแล้วจาก CompletedSkills table)
        displayAllSkills(completedSkillsFromAPI);
        
        // ⭐ เพิ่มส่วนทักษะอื่นๆ (ไม่บังคับ)
        const optionalSkills = await fetchOptionalSkills(studentInfo.yearLevel);
        const optionalSkillActivityCount = countActivitiesPerSkill(activities, optionalSkills);
        const optionalSkillPendingSurveyCount = countPendingSurveyActivities(activities, optionalSkills);
        
        console.log('Optional Skills:', optionalSkills);
        console.log('Optional Skill Activity Count:', optionalSkillActivityCount);
        
        // แสดงทักษะไม่บังคับ (เฉพาะที่มีกิจกรรม >= 1)
        displayOptionalSkillsByStatus(optionalSkills, optionalSkillActivityCount, optionalSkillPendingSurveyCount, completedSkillsFromAPI);
        
      } catch (error) {
        console.error('Error loading skill data:', error);
        showError();
      }
    }

    // ⭐ นับจำนวนกิจกรรมต่อทักษะ - ต้องทำแบบประเมินเสร็จด้วย
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
            activity.surveyCompleted === true) {  // ⭐ เพิ่มเงื่อนไขทำแบบประเมิน
          
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
      
      // เริ่มต้นด้วย 0 สำหรับทุกทักษะบังคับ
      requiredSkills.forEach(skill => {
        skillCount[skill.skillId] = 0;
      });
      
      // นับกิจกรรมที่ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
      activities.forEach(activity => {
        if (activity.isConfirmed && 
            activity.skillId && 
            activity.surveyCompleted === false) {  // ยืนยันแล้วแต่ยังไม่ทำแบบประเมิน
          
          if (skillCount.hasOwnProperty(activity.skillId)) {
            skillCount[activity.skillId]++;
          }
        }
      });
      
      return skillCount;
    }

    // แสดงทักษะแยกตามสถานะ โดยใช้ข้อมูลจาก CompletedSkills table
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

    // แสดงทักษะที่ผ่านการทดสอบแล้ว (เฉพาะที่ทำแบบทดสอบผ่าน)
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
      console.log('🔍 Optional skills received:', optionalSkills);
      console.log('🔍 Optional skill activity count:', skillActivityCount);
      console.log('🔍 Optional skill pending survey count:', skillPendingSurveyCount);
      console.log('🔍 Completed skills from API:', completedSkillsFromAPI);
      
      // สร้าง Set ของ skillId ที่ทำแบบทดสอบผ่านแล้ว
      const passedSkillIds = new Set(completedSkillsFromAPI.map(skill => skill.skillId));
      console.log('🔍 Passed skill IDs:', Array.from(passedSkillIds));
      
      const completedOptionalSkills = [];
      const pendingOptionalSkills = [];
      
      optionalSkills.forEach(skill => {
        const activityCount = skillActivityCount[skill.skillId] || 0;
        const pendingSurveyCount = skillPendingSurveyCount[skill.skillId] || 0;
        const requiredCount = skill.requiredActivities || REQUIRED_ACTIVITIES_COUNT;
        const hasPassedTest = passedSkillIds.has(skill.skillId);
        
        console.log(`🔍 Processing skill ${skill.skillId} (${skill.name}):`);
        console.log(`   - Activity count: ${activityCount}`);
        console.log(`   - Pending survey count: ${pendingSurveyCount}`);
        console.log(`   - Required count: ${requiredCount}`);
        console.log(`   - Has passed test: ${hasPassedTest}`);
        console.log(`   - Will show: ${activityCount > 0 || hasPassedTest}`);
        
        // ⭐ แสดงเฉพาะทักษะที่มีกิจกรรม >= 1 เท่านั้น (ไม่แสดง 0/3)
        if (activityCount > 0 || hasPassedTest) {
          if (hasPassedTest) {
            completedOptionalSkills.push({ 
              ...skill, 
              activityCount, 
              pendingSurveyCount,
              requiredCount, 
              hasPassedTest: true 
            });
            console.log(`   ➡️ Added to completed optional skills`);
          } else {
            pendingOptionalSkills.push({ 
              ...skill, 
              activityCount, 
              pendingSurveyCount,
              requiredCount, 
              hasPassedTest: false 
            });
            console.log(`   ➡️ Added to pending optional skills`);
          }
        } else {
          console.log(`   ❌ Skipped (no activities)`);
        }
      });
      
      console.log('🔍 Final completed optional skills:', completedOptionalSkills);
      console.log('🔍 Final pending optional skills:', pendingOptionalSkills);
      console.log('🔍 === END OPTIONAL SKILLS DEBUG ===');
      
      // แสดงทักษะไม่บังคับที่ผ่านการทดสอบแล้ว
      displayOptionalCompletedSkills(completedOptionalSkills);
      
      // แสดงทักษะไม่บังคับที่ยังไม่ผ่านการทดสอบ
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

    // แสดงทักษะไม่บังคับที่ยังไม่ผ่านการทดสอบ (เฉพาะที่มีกิจกรรม >= 1)
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
          // 3/3 = สีเขียว
          countClass = 'completed';
          statusText = '🎯 สามารถทำแบบทดสอบได้';
        } else if (isInProgress) {
          // 1/3, 2/3 = สีส้ม
          countClass = 'in-progress';
          statusText = '🔄 กำลังดำเนินการ';
        } else {
          // 0/3 = สีเทา (แต่ไม่แสดงใน optional skills)
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
          // 3/3 = สีเขียว
          countClass = 'completed';
          statusText = '🎯 สามารถทำแบบทดสอบได้';
        } else if (isInProgress) {
          // 1/3, 2/3 = สีส้ม
          countClass = 'in-progress';
          statusText = '🔄 กำลังดำเนินการ';
        } else {
          // 0/3 = สีเทา (ไม่ว่าจะมีกิจกรรมรอทำแบบประเมินหรือไม่)
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

    // ฟังก์ชันล็อกเอาท์
    function logout() {
      const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
      if (confirmLogout) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = "login.html";
      }
    }