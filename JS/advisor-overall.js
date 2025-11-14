    document.addEventListener("DOMContentLoaded", async () => {
      const params = new URLSearchParams(window.location.search);
      const activityId = params.get("activityId");

      if (!activityId) {
        console.error("No activityId provided");
        document.querySelector(".activity-title").textContent = "ไม่พบข้อมูลกิจกรรม";
        return;
      }

      console.log("Loading activity details for:", activityId);

      try {
        // ตรวจสอบการล็อกอิน
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const token = localStorage.getItem('token');
        
        if (!userData.userId || userData.role !== 'advisor' || !token) {
          console.error('Authentication failed or not advisor');
          window.location.href = "login.html";
          return;
        }

        // ดึงข้อมูลกิจกรรมจาก Activities API
        console.log("Fetching activity details...");
        const activityResponse = await fetch(
          `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/activities/${activityId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!activityResponse.ok) {
          throw new Error(`Failed to fetch activity: ${activityResponse.status} ${activityResponse.statusText}`);
        }

        const activityData = await activityResponse.json();
        console.log("Activity data:", activityData);

        // อัปเดตชื่อกิจกรรม
        const activityTitle = document.querySelector(".activity-title");
        if (activityTitle) {
          activityTitle.textContent = activityData.name || "ไม่มีชื่อกิจกรรม";
        }

        // === ใส่ปุ่มแก้ไขตรงนี้เลย ===
const editBtn = document.querySelector(".edit-btn");
if (editBtn) {
    editBtn.addEventListener("click", () => {
        window.location.href = `edit-activity.html?activityId=${activityId}`;
    });
}

        // === New: แสดงรายละเอียดกิจกรรม ===
        const detailSection = document.querySelector(".activity-detail");
        if (detailSection) {
          let detailHtml = `
            <h3>รายละเอียดกิจกรรม</h3>
            <div class="detail-box">
              <p>${activityData.description || 'ไม่มีรายละเอียดกิจกรรม'}</p>
          `;

          // ===== หมวดทักษะ (Skill Category) =====
          if (skill.category) {
            const badgeColor =
              skill.category === 'soft skill'
                ? '#FF6B6B'
                : skill.category === 'hard skill'
                ? '#4ECDC4'
                : '#95A5A6';
            const badgeName =
              skill.category === 'soft skill'
                ? 'Soft Skill'
                : skill.category === 'hard skill'
                ? 'Hard Skill'
                : 'Multi Skill';
            detailHtml += `
              <p style="margin-top: 10px;">
                <span class="badge" style="background:${badgeColor};">
                  ${badgeName}
                </span>
              </p>
            `;
          }

          // ===== ระดับความยาก (Skill Level) =====
          if (skill.skillLevel) {
            let levelColor = '#95A5A6';
            if (skill.skillLevel === 'พื้นฐาน') levelColor = '#4CAF50';     // เขียว
            else if (skill.skillLevel === 'ปานกลาง') levelColor = '#FFC107'; // เหลือง
            else if (skill.skillLevel === 'ขั้นสูง') levelColor = '#F44336'; // แดง

            detailHtml += `
              <p style="margin-top: 10px;">
                <span class="badge" style="background:${levelColor};">
                  ระดับ: ${skill.skillLevel}
                </span>
              </p>
            `;
          }

          detailHtml += `</div>`;
          detailSection.innerHTML = detailHtml;
        }

        // ดึงข้อมูลผู้เข้าร่วมจาก API ใหม่
        console.log("Fetching participation stats...");
        const participantsResponse = await fetch(
          `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/activities/${activityId}/participants`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        let participantCount = 0;
        let confirmedCount = 0;
        let surveyCompletedCount = 0;
        let participants = [];

        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json();
          console.log("Participants data:", participantsData);
          
          if (participantsData.statistics) {
            participantCount = participantsData.statistics.totalRegistered || 0;
            confirmedCount = participantsData.statistics.totalConfirmed || 0;
            surveyCompletedCount = participantsData.statistics.totalSurveyCompleted || 0;
          }
          
          if (participantsData.participants) {
            participants = participantsData.participants;
          }
        } else {
          console.warn("Failed to fetch participants data");
        }

        // แสดงผลของจำนวนคนที่ลงทะเบียน
        const countElem = document.querySelector(".participant-count");
        if (countElem) {
          if (participantCount > 0) {
            countElem.innerHTML = `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; border-left: 4px solid #4CAF50;">
                <h4 style="margin: 0 0 10px 0; color: #333;">📊 สถิติการเข้าร่วม</h4>
                <p style="margin: 5px 0;"><strong>จำนวนผู้สมัคร:</strong> ${participantCount} คน</p>
                <p style="margin: 5px 0;"><strong>ยืนยันการเข้าร่วมแล้ว:</strong> ${confirmedCount} คน</p>
                <p style="margin: 5px 0;"><strong>รอการยืนยัน:</strong> ${participantCount - confirmedCount} คน</p>
                <p style="margin: 5px 0;"><strong>ทำแบบประเมินแล้ว:</strong> ${surveyCompletedCount} คน</p>
              </div>
              ${participants.length > 0 ? generateParticipantsList(participants) : ''}
            `;
          } else {
            countElem.innerHTML = `
              <div style="background: #fff3cd; padding: 15px; border-radius: 10px; border-left: 4px solid #ffc107;">
                <p style="margin: 0;"><strong>📝 ยังไม่มีนักศึกษาสมัครเข้าร่วมกิจกรรมนี้</strong></p>
              </div>
            `;
          }
        }

        // เพิ่มข้อมูลเพิ่มเติมของกิจกรรม
        const additionalInfo = document.querySelector(".additional-info");
        if (additionalInfo) {
          const infoHtml = `
            <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 10px;">
              <h4 style="margin: 0 0 10px 0; color: #2e7d32;">ℹ️ ข้อมูลกิจกรรม</h4>
              <p><strong>🎯 กลุ่มกิจกรรม:</strong> ${activityData.activityGroup || 'ไม่ระบุ'}</p>
              <p><strong>📅 วันที่เริ่ม:</strong> ${formatDateTime(activityData.startDateTime)}</p>
              <p><strong>📅 วันที่สิ้นสุด:</strong> ${formatDateTime(activityData.endDateTime)}</p>
              <p><strong>📍 สถานที่:</strong> ${activityData.locationName || activityData.location || 'ไม่ระบุ'}</p>
              ${activityData.organizerId ? `<p><strong>👤 ผู้จัด:</strong> ${activityData.organizerId}</p>
              <p><strong>🎓 เหมาะสมกับชั้นปี:</strong> ${activityData.yearLevel ?? 'ไม่ระบุ'}</p>
              <p><strong>🧩 กิจกรรมที่ต้องเข้าร่วม:</strong> ${activityData.requiredActivities || 'ไม่มี'}</p>` : ''}
            </div>
          `;
          
          additionalInfo.innerHTML = infoHtml;
        }

        // แสดงข้อมูลทักษะ (PLO) ที่ได้รับ — รองรับหลายรายการ
        const skillSection = document.querySelector(".skill-list");
        const skill = activityData.skill || {};

        if (skillSection) {
          // เตรียมชื่อ PLO แบบ array
          const names = Array.isArray(skill.ploFullNames)
            ? skill.ploFullNames
            : (skill.ploFullNames ? [skill.ploFullNames] : []);

          // รองรับคำอธิบายแบบต่อรายการ (ploDescriptions) หรือคำอธิบายรวม (description)
          const descs = Array.isArray(skill.ploDescriptions)
            ? skill.ploDescriptions
            : (skill.ploDescriptions ? [skill.ploDescriptions] : []);
          const fallbackDesc = skill.description || '';

          if (names.length > 0) {
            skillSection.innerHTML = names.map((name, idx) => {
              const desc = (descs[idx] !== undefined && descs[idx] !== null && String(descs[idx]).trim() !== '')
                ? descs[idx]
                : fallbackDesc;

              return `
                <div class="skill-item" style="margin-bottom:14px;">
                  <p>🎯 <strong>${name}</strong></p>
                  ${desc ? `<p style="margin-top: 10px; color: #666;">${desc}</p>` : ''}
                </div>
              `;
            }).join('');
          } else {
            skillSection.innerHTML = `<p>ไม่มีข้อมูลทักษะที่เกี่ยวข้อง</p>`;
          }
        }

      } catch (err) {
        console.error("โหลดข้อมูลกิจกรรมไม่สำเร็จ:", err);
        
        // แสดงข้อความผิดพลาด
        const activityTitle = document.querySelector(".activity-title");
        if (activityTitle) {
          activityTitle.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        }
        
        const countElem = document.querySelector(".participant-count");
        if (countElem) {
          countElem.innerHTML = `
            <div style="background: #ffebee; padding: 15px; border-radius: 10px; border-left: 4px solid #f44336;">
              <p style="margin: 0; color: #c62828;"><strong>❌ เกิดข้อผิดพลาด:</strong> ${err.message}</p>
              <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                🔄 ลองใหม่
              </button>
            </div>
          `;
        }
      }
    });

    // Helper function to format date/time
    function formatDateTime(dateTimeString) {
      if (!dateTimeString) return 'ไม่ระบุ';
      
      try {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return 'รูปแบบวันที่ไม่ถูกต้อง';
      }
    }

    // Helper function to generate participants list
    function generateParticipantsList(participants) {
      if (!participants || participants.length === 0) {
        return '';
      }

      let html = `
        <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h4 style="margin: 0 0 15px 0; color: #333;">👥 รายชื่อผู้เข้าร่วม</h4>
          <div style="max-height: 300px; overflow-y: auto;">
      `;

      participants.forEach((participant, index) => {
        const statusColor = participant.isConfirmed ? '#4CAF50' : '#FF9800';
        const statusText = participant.isConfirmed ? 'ยืนยันแล้ว' : 'รอยืนยัน';
        const surveyStatus = participant.surveyCompleted ? '✅ ทำแล้ว' : '⏳ ยังไม่ทำ';

        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; ${index === participants.length - 1 ? 'border-bottom: none;' : ''}">
            <div>
              <div style="font-weight: bold; color: #333;">${participant.studentName}</div>
              <div style="font-size: 0.9rem; color: #666;">
                รหัส: ${participant.studentId} | ชั้นปี: ${participant.studentYear} | ${participant.studentDepartment}
              </div>
              <div style="font-size: 0.8rem; color: #888;">
                สมัครเมื่อ: ${formatDateTime(participant.registeredAt)}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 10px; font-size: 0.8rem; margin-bottom: 4px;">
                ${statusText}
              </div>
              <div style="font-size: 0.8rem; color: #666;">
                แบบประเมิน: ${surveyStatus}
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      return html;
    }

    // Navigation functions
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

    function goBack() {
      window.history.back();
    }

    function logout() {
      const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
      if (confirmLogout) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = "login.html";
      }
    }

  // === โค้ดควบคุม POP-UP ===
  const deleteModal = document.getElementById('delete-modal');
  const mainDeleteBtn = document.querySelector('.delete-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  mainDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'flex'; // แสดง pop-up
  });

  cancelBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none'; // ซ่อน pop-up
  });

  confirmDeleteBtn.addEventListener('click', () => {
    console.log(`Confirmed deletion for activity ID: ${activityId}`); // ใส่ Logic การลบจริงที่นี่
    // เพิ่มโค้ดเรียก API สำหรับลบที่นี่
    deleteModal.style.display = 'none'; // ซ่อน pop-up
  });

  window.addEventListener('click', (event) => {
    if (event.target == deleteModal) {
      deleteModal.style.display = 'none';
    }
  });
  // === จบส่วน POP-UP ===


