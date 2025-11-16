        // Configuration - แก้ URL ให้ตรงกับ API Gateway จริงของคุณ
        const CONFIG = {
            API_BASE_URL: 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod',
            ENDPOINTS: {
                GET_ACTIVITIES: '/activities',
                REGISTER_ACTIVITY: '/activities/register'
            }
        };
        
        // Global variables
        let allActivities = [];
        let currentFilter = 'all';
        
        // ⭐️ MODIFIED: ฟังก์ชันเริ่มต้น (ถูกเรียกโดย auth-check.js)
        /*function initializePage() {
            console.log('Initialize Recommend Activities Page...');

            // ⭐️ Session Check: ตรวจสอบ Role (ใช้ window.userData ที่ตั้งค่าโดย auth-check.js)
            if (!window.userData || window.userData.role !== 'student') {
                console.error('User role is not student, redirecting...');
                if (typeof navigateTo === 'function') {
                    navigateTo("login.html"); 
                } else {
                    window.location.href = "login.html";
                }
                return;
            }

            console.log('[RECOMMEND] userData =', window.userData);
            console.log('[RECOMMEND] userToken exists =', !!window.userToken);
            
            // Setup tab buttons
            setupTabButtons();
            
            // Load activities
            //const studentId = window.userData.userId || window.userData.studentId;
            loadActivities(studentId);
        }
        // ⭐️ NEW/MODIFIED: กำหนดให้ auth-check.js เรียกฟังก์ชันนี้เมื่อ Authentication ผ่าน
        window.initializePage = initializePage;*/

        document.addEventListener("DOMContentLoaded", () => {
            console.log("Recommend Page Loaded — initializing...");
            
            setupTabButtons();
            loadActivities(null); // โหลดทั้งหมด
        });   
        
        // Setup tab button event listeners
        function setupTabButtons() {
            const tabButtons = document.querySelectorAll('.tab-btn');
        
            console.log("[RECOMMEND] setupTabButtons found buttons =", tabButtons.length);
        
            tabButtons.forEach(button => {
                console.log("[RECOMMEND] attaching event on button:", button.dataset.filter);
        
                button.addEventListener('click', function() {
                    console.log("[RECOMMEND] TAB CLICKED =", this.dataset.filter);   // 🟩 ต้องออก
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
        
                    currentFilter = this.dataset.filter;
                    filterActivities();
                });
            });
        }        
        
        // Load activities from API
        async function loadActivities(skillType = null) {
            const activitiesList = document.getElementById('activities-list');

            if (!activitiesList) {
                console.error('[RECOMMEND] #activities-list element not found');
                alert('[RECOMMEND] ไม่พบ element #activities-list ในหน้า HTML');
                return;
            }

            console.log('---------------------------------------');
            console.log('[RECOMMEND] loadActivities() CALLED');
            console.log('[RECOMMEND] skillType received =', skillType);
            console.log('---------------------------------------');

            try {
                activitiesList.innerHTML = `<div class="loading">กำลังโหลดกิจกรรม...</div>`;

                let apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITIES;
                const params = new URLSearchParams();

                // ⭐ FIX: ส่ง skillCategory ทุกครั้งถ้ามีค่า ไม่ต้องเช็ค !== 'all'
                if (skillType) {
                    console.log('[RECOMMEND] Appending skillCategory =', skillType);
                    params.append('skillCategory', skillType);
                }

                if (params.toString()) {
                    apiUrl += `?${params.toString()}`;
                }

                // ⭐ LOG ตรวจ URL ที่ส่งไปจริง
                console.log('[RECOMMEND] Final Fetch URL =>', apiUrl);

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': window.userToken ? `Bearer ${window.userToken}` : ''
                    }
                });

                console.log('[RECOMMEND] Response status =', response.status);

                if (!response.ok) {
                    const errText = await response.text();
                    console.error('[RECOMMEND] Server returned error text:', errText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const raw = await response.json();

                // ⭐ ตรวจรูปแบบ response (proxy vs array)
                let activities = raw.body
                    ? JSON.parse(raw.body)
                    : raw;

                console.log('[RECOMMEND] Activities loaded =>', activities);

                allActivities = activities;
                displayActivities(activities);

            } catch (error) {
                console.error('[RECOMMEND] Error loading activities:', error);
                showError(error.message);
            }
        }             
                
        function filterActivities() {
            console.log("[RECOMMEND] filterActivities() CLICKED, currentFilter =", currentFilter);
        
            let skillCategory = null;
        
            switch (currentFilter) {
                case 'hard':
                    skillCategory = 'hard skill';
                    break;
                case 'soft':
                    skillCategory = 'soft skill';
                    break;
                case 'multi':
                    skillCategory = 'multi-skill';
                    break;
            }
        
            console.log("[RECOMMEND] mapped skillCategory =", skillCategory);
        
            // 🔥 สำคัญที่สุด — บังคับส่ง filter เสมอ
            loadActivities(skillCategory);
        }               
        
        // Display activities in the grid
        function displayActivities(activities) {
            const activitiesList = document.getElementById('activities-list');
            
            if (!activities || activities.length === 0) {
                activitiesList.innerHTML = `
                    <div class="empty-message">
                        <p>ไม่พบกิจกรรมในหมวดหมู่นี้</p>
                        <p style="font-size: 0.9rem; color: #888; margin-top: 10px;">
                            ลองเปลี่ยนหมวดหมู่หรือกลับมาดูใหม่ภายหลัง
                        </p>
                    </div>
                `;
                return;
            }
            
            // Create activities grid
            let html = '<div class="activities-grid">';
            activities.forEach(activity => {
                html += createActivityCard(activity);
            });
            html += '</div>';
            
            activitiesList.innerHTML = html;
        
            // 🔗 ผูกคลิกการ์ด -> ไปหน้า detailed-activities
            const cards = activitiesList.querySelectorAll('.activity-card');
            cards.forEach(card => {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    const id = card.getAttribute('data-activity-id');
                    if (!id) return;
                    window.location.href = `detailed-activities.html?activityId=${encodeURIComponent(id)}`;
                });
            });
        }        
        
        // แสดงชื่อระดับบน badge
        function normalizeLevel(levelRaw) {
            const s = String(levelRaw || '').trim().toLowerCase();
            if (!s) return '';
            if (['พื้นฐาน','basic'].includes(s)) return 'พื้นฐาน';
            if (['ปานกลาง','medium'].includes(s)) return 'ปานกลาง';
            if (['ขั้นสูง','advanced'].includes(s)) return 'ขั้นสูง';
            return s;
          }
          function getLevelDisplay(levelRaw) { return normalizeLevel(levelRaw); }
          function getLevelClass(levelRaw) {
            const lv = normalizeLevel(levelRaw);
            if (lv === 'พื้นฐาน') return 'level-basic';
            if (lv === 'ปานกลาง') return 'level-medium';
            if (lv === 'ขั้นสูง')  return 'level-advanced';
            return '';
          }          
        
        
        // Create individual activity card HTML
        function createActivityCard(activity) {
            const activityId = activity.activityId || activity.id;
            // ── badge skillCategory ──
            const skillCategory = activity.skillCategory || '';
            const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
            const skillBadge = skillCategory
              ? `<span class="badge-skill ${skillBadgeClass}">${skillCategory}</span>`
              : '';
          
            // ── badge level ──
            const levelRaw = activity.level || activity.skillLevel || '';
            const levelText = getLevelDisplay(levelRaw);
            const levelClass = getLevelClass(levelRaw);
            const levelBadge = levelText
              ? `<span class="badge-level ${levelClass}">${levelText}</span>`
              : '';
          
            const badgeRow = `
              <div class="badge-row">
                ${skillBadge}
                ${levelBadge}
              </div>
            `;
          
            // ── วันที่/สถานที่/PLO ──
            const startTxt = formatDateTime(activity.startDateTime);
            
            const LOCATIONS_MAP = {
                "SC1": "อาคารเรียนรวมสังคมศาสตร์ 1",
                "SC3": "อาคารเรียนรวมสังคมศาสตร์ 3",
                "LC2": "อาคารเรียนรวม 2",
                "LC4": "อาคารเรียนรวม 4",
                "LC5": "อาคารเรียนรวม 5"
            };

            const locationName =
              LOCATIONS_MAP[activity.locationId] ||
              activity.locationName ||
              activity.locationId ||
              '-';
            
            const PLO_FULL = {
                "PLO1": "ความรู้พื้นฐานด้านการเขียนโปรแกรม",
                "PLO2": "ทักษะการพัฒนาและออกแบบระบบ",
                "PLO3": "ความรับผิดชอบและจริยธรรมวิชาชีพ",
                "PLO4": "การทำงานร่วมกับผู้อื่นและภาวะผู้นำ"
            };
    
            const ploList = Array.isArray(activity.plo) ? activity.plo : [];
            const ploHtml = ploList
              .map(p => `<div class="plo-item">• ${p}: ${PLO_FULL[p] || ''}</div>`)
              .join('');
            const ploSection = ploList.length
              ? `<div class="plo-section">
                   <div class="plo-title">ทักษะที่ได้รับ:</div>
                   ${ploHtml}
                 </div>`
              : '';
          
            const imageUrl = activity.imageUrl || '';
            const imageStyle = imageUrl ? `style="background-image:url('${imageUrl}')"` : '';
          
            // ── ปุ่มสมัคร ──
            let btnText = 'สมัครเข้าร่วม';
            let btnDisabled = false;
            const now = new Date();
            const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
            const end = activity.endDateTime ? new Date(activity.endDateTime) : null;
          
            if (start && now >= start) {
              btnDisabled = true;
              btnText = end && now <= end ? 'กำลังจัดกิจกรรม' : 'ปิดรับสมัครแล้ว';
            }
          
            const buttonHtml = btnDisabled
              ? `<button class="register-btn disabled" disabled>${btnText}</button>`
              : `<button class="register-btn"
                   onclick="event.stopPropagation(); registerForActivity('${activity.activityId}','${activity.name || ''}')">
                   สมัครเข้าร่วม
                 </button>`;
          
            return `
            <div class="activity-card" data-activity-id="${activityId}">
                <div class="activity-image" ${imageStyle}>
                  ${badgeRow}
                </div>
          
                <div class="activity-content">
                  <h3 class="activity-title">${activity.name || 'ไม่มีชื่อกิจกรรม'}</h3>
                  <p class="activity-description">${activity.description || ''}</p>
          
                  <div class="activity-meta">
                    <div class="activity-date">📅 ${startTxt}</div>
                    <div class="activity-location">📍 ${locationName}</div>
                  </div>
          
                  ${ploSection}
          
                  <div class="activity-actions">
                    ${buttonHtml}
                  </div>
                </div>
              </div>
            `;
        }   

        // Format date and time
        function formatDateTime(dateTimeString) {
            if (!dateTimeString) return 'ไม่ระบุเวลา';
            
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
        
        function showError(message) {
            console.error('[RECOMMEND] showError:', message);
            alert('[RECOMMEND] เกิดข้อผิดพลาดในการโหลดกิจกรรม: ' + message);
        
            const activitiesList = document.getElementById('activities-list');
            if (!activitiesList) return;
        
            activitiesList.innerHTML = `
                <div class="error-box">
                    <p>เกิดข้อผิดพลาดในการโหลดกิจกรรม<br>${message}</p>
                    <button class="retry-btn" onclick="loadActivities()">ลองใหม่</button>
                </div>
            `;
        }
        
        
        // Register for activity
        async function registerForActivity(activityId, activityName) {
            const studentId = window.userData.userId || window.userData.userId;
            
            if (!confirm(`ต้องการสมัครเข้าร่วมกิจกรรม "${activityName}" หรือไม่?`)) {
                return;
            }
            
            try {
                const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.userToken}`
                    },
                    body: JSON.stringify({
                        activityId: activityId,
                        studentId: studentId
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('สมัครเข้าร่วมกิจกรรมสำเร็จ!\nกำลังนำทางไปหน้ากิจกรรมของฉัน...');
                    // Redirect to my activities page
                    setTimeout(() => {
                        window.location.href = 'my-activities.html';
                    }, 1000);
                } else {
                    alert(`เกิดข้อผิดพลาด: ${result.message}`);
                }
                
            } catch (error) {
                console.error('Registration error:', error);
                alert('เกิดข้อผิดพลาดในการสมัครเข้าร่วมกิจกรรม');
            }
        }
        
        // View activity detail
        function viewActivityDetail(activityId) {
            // Navigate to detailed activity page with activity ID
            window.location.href = `detailed-activities.html?id=${activityId}`;
        }
        
        // Show error message
        function showError(message) {
            const activitiesList = document.getElementById('activities-list');
            activitiesList.innerHTML = `
                <div class="error-message">
                    <p>เกิดข้อผิดพลาดในการโหลดกิจกรรม</p>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="loadActivities()">ลองใหม่</button>
                </div>
            `;
        }
