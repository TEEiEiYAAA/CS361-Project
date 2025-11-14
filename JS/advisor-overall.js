document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get("activityId");

  // ผูกปุ่ม "แก้ไข" ให้ไปหน้า edit-activity
  const editBtn = document.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      if (!activityId) {
        alert("ไม่พบรหัสกิจกรรมสำหรับแก้ไข");
        return;
      }
      // ✅ ต้องเป็น string / template literal
      window.location.href = `edit-activity.html?activityId=${activityId}`;
    });
  }

  if (!activityId) {
    console.error("No activityId provided");
    const titleEl = document.querySelector(".activity-title");
    if (titleEl) titleEl.textContent = "ไม่พบข้อมูลกิจกรรม";
    return;
  }

  console.log("Loading activity details for:", activityId);

  try {
    // ============================
    // 🔒 บล็อกเช็กล็อกอิน (เก็บไว้ใช้ทีหลัง)
    // ============================
    /*
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const token = localStorage.getItem('token');
    
    if (!userData.userId || userData.role !== 'advisor' || !token) {
      console.error('Authentication failed or not advisor');
      window.location.href = "login.html";
      return;
    }
    */

    // ============================
    // DEV MODE: ยังไม่บังคับ login
    // ============================
    const token = localStorage.getItem('token');
    const commonHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    // ดึงข้อมูลกิจกรรมจาก Activities API (getActivityDetail)
    console.log("Fetching activity details...");
    const activityResponse = await fetch(
      `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/activities/${activityId}`,
      { headers: commonHeaders }
    );

    if (!activityResponse.ok) {
      throw new Error(`Failed to fetch activity: ${activityResponse.status} ${activityResponse.statusText}`);
    }

    const activityData = await activityResponse.json();
    console.log("Activity data:", activityData);

    const imgElem = document.getElementById("activity-image");
    if (imgElem) {
        imgElem.src = activityData.imageUrl || "./Image/default-image.png";
    }

    // ✅ ประกาศ skill ให้ใช้ได้ทั้งไฟล์
    const skill = activityData.skill || {};

    // อัปเดตชื่อกิจกรรม
    const activityTitle = document.querySelector(".activity-title");
    if (activityTitle) {
      activityTitle.textContent = activityData.name || "ไม่มีชื่อกิจกรรม";
    }

    // === แสดงรายละเอียดกิจกรรม ===
    const detailBox = document.getElementById("activity-detail-box");

    detailBox.innerHTML = `
        <h3>รายละเอียดกิจกรรม</h3>

        <p>${activityData.description || "ไม่มีรายละเอียดกิจกรรม"}</p>

        <div style="margin-top: 12px; display: flex; gap: 8px;">

            <!-- badge skill category -->
            ${
                activityData.skillCategory
                    ? `<span class="badge" style="
                        background:${activityData.skillCategory.toLowerCase() === 'soft skill' ? '#ff6b6b' :
                                    activityData.skillCategory.toLowerCase() === 'hard skill' ? '#4ecdc4' :
                                    '#95a5a6'
                        }">
                        ${activityData.skillCategory}
                      </span>`
                    : ""
            }

            <!-- badge level -->
            ${
                activityData.level
                    ? `<span class="badge" style="
                        background:${activityData.level === 'พื้นฐาน' ? '#4CAF50' :
                                    activityData.level === 'ปานกลาง' ? '#FFC107' :
                                    '#F44336'
                        }">
                        ${activityData.level}
                      </span>`
                    : ""
            }

        </div>
    `;

    // ========== ดึงข้อมูลผู้เข้าร่วม ==========
    console.log("Fetching participation stats...");
    const participantsResponse = await fetch(
      `https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod/activities/${activityId}/participants`,
      { headers: commonHeaders }
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

    // ข้อมูลเพิ่มเติมของกิจกรรม
    const additionalInfo = document.querySelector(".additional-info");
    if (additionalInfo) {
      const infoHtml = `
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 10px;">
          <h4 style="margin: 0 0 10px 0; color: #2e7d32;">ℹ️ ข้อมูลกิจกรรม</h4>
          <p><strong>🎯 กลุ่มกิจกรรม:</strong> ${activityData.skillId || 'ไม่ระบุ'}</p>
          <p><strong>📅 วันที่เริ่ม:</strong> ${formatDateTime(activityData.startDateTime)}</p>
          <p><strong>📅 วันที่สิ้นสุด:</strong> ${formatDateTime(activityData.endDateTime)}</p>
          <p><strong>📍 สถานที่:</strong> ${activityData.locationName || activityData.location || 'ไม่ระบุ'}</p>
          ${
            activityData.organizerId
              ? `<p><strong>👤 ผู้จัด:</strong> ${activityData.organizerId}</p>
                 <p><strong>🎓 เหมาะสมกับชั้นปี:</strong> ${activityData.yearLevel ?? 'ไม่ระบุ'}</p>
                 <p><strong>🧩 กิจกรรมที่ต้องเข้าร่วม:</strong> ${activityData.requiredActivities || 'ไม่มี'}</p>`
              : ''
          }
        </div>
      `;
      additionalInfo.innerHTML = infoHtml;
    }

    // แสดงข้อมูลทักษะ (PLO) ที่ได้รับ — รองรับหลายรายการ
    const skillSection = document.querySelector(".skill-list");

    const ploCodes = Array.isArray(activityData.plo)
        ? activityData.plo
        : (activityData.plo ? [activityData.plo] : []);

    const names = Array.isArray(skill.ploFullNames)
        ? skill.ploFullNames
        : (skill.ploFullNames ? [skill.ploFullNames] : []);

    const descs = Array.isArray(skill.ploDescriptions)
        ? skill.ploDescriptions
        : (skill.ploDescriptions ? [skill.ploDescriptions] : []);

    skillSection.innerHTML = names.map((name, idx) => {
        const code = ploCodes[idx] || "";          // เช่น PLO3
        const desc = descs[idx] || "";             // คำอธิบาย
        const title = code ? `${code}: ${name}` : name;

        return `
            <div style="margin-bottom:15px;">
                <p style="font-weight:600; color:#2e7d32;">
                    🎯 ${title}
                </p>
                ${desc
                    ? `<p style="margin-left:20px; color:#444;">${desc}</p>`
                    : ""
                }
            </div>
        `;
    }).join("");


  } catch (err) {
    console.error("โหลดข้อมูลกิจกรรมไม่สำเร็จ:", err);
    
    const activityTitle = document.querySelector("activity-title");
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

  // === โค้ดควบคุม POP-UP ลบกิจกรรม ===
  const deleteModal = document.getElementById('delete-modal');
  const mainDeleteBtn = document.querySelector('.delete-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  if (deleteModal && mainDeleteBtn && cancelBtn && confirmDeleteBtn) {
    mainDeleteBtn.addEventListener('click', () => {
      deleteModal.style.display = 'flex';
    });

    cancelBtn.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });

    confirmDeleteBtn.addEventListener('click', () => {
      console.log(`Confirmed deletion for activity ID: ${activityId}`);
      // TODO: เรียก API ลบจริงตรงนี้ถ้าต้องการ
      deleteModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
      }
    });
  }
  // === จบส่วน POP-UP ===

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
  // เก็บโค้ดเช็ก login ไว้ใช้ทีหลัง
  /*
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  if (!token || !userData.userId) {
    window.location.href = 'login.html';
    return;
  }
  */
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
