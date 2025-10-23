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
        let currentUser = null;
        
        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });
        
        // Initialize the application
        function initializeApp() {
            // Check login status
            currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (!currentUser.studentId && !currentUser.userId) {
                window.location.href = "login.html";
                return;
            }
            
            // Setup tab buttons
            setupTabButtons();
            
            // Load activities
            loadActivities();
        }
        
        // Setup tab button event listeners
        function setupTabButtons() {
            const tabButtons = document.querySelectorAll('.tab-btn');
            
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    
                    // Add active class to clicked button
                    this.classList.add('active');
                    
                    // Update current filter
                    currentFilter = this.dataset.filter;
                    
                    // Filter and display activities
                    filterActivities();
                });
            });
        }

        // รองรับทั้ง array, string JSON ["PLO1","PLO2"] และ string "PLO1,PLO2"
        function extractPLOs(activity) {
            const raw = activity.plo || activity.plos || activity.PLO || activity.PLOs || [];
            if (Array.isArray(raw)) return raw.map(x => String(x).trim().toUpperCase());
        
            if (typeof raw === 'string') {
            const s = raw.trim();
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed.map(x => String(x).trim().toUpperCase());
            } catch (_) {}
            return s.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
            }
            return [];
        }
        
        function matchesPLO(activity, ploCode) {
            if (!ploCode || ploCode === 'all') return true;
            const plos = extractPLOs(activity);
            return plos.includes(String(ploCode).toUpperCase());
        }
        
        
        // Load activities from API
        async function loadActivities(skillType = null) {
            const activitiesList = document.getElementById('activities-list');
            
            try {
                // Show loading state
                activitiesList.innerHTML = '<div class="loading">กำลังโหลดกิจกรรม...</div>';
                
                // Build API URL
                let apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.GET_ACTIVITIES;
                
                // Add skill type filter if specified
                if (skillType && skillType !== 'all') {
                    apiUrl += `?plo=${encodeURIComponent(skillType)}`;
                  }
                
                // Make API request
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                //const activities = await response.json();
                let activities = await response.json();

                // ถ้าเลือก PLO (ไม่ใช่ all) ให้ฟิลเตอร์แบบ "contains"
                if (currentFilter && currentFilter !== 'all') {
                activities = activities.filter(a => matchesPLO(a, currentFilter));
                }

                console.log('Activities loaded:', activities.length);
                
                // Store activities globally
                allActivities = activities;
                
                // Display activities
                displayActivities(activities);
                
            } catch (error) {
                console.error('Error loading activities:', error);
                showError(error.message);
            }
        }
        
        function filterActivities() {
            // โหลดใหม่เสมอ ไม่ว่า filter ใด
            if (currentFilter === 'all') {
                loadActivities(); // โหลดทั้งหมด
            } else {
                loadActivities(currentFilter); // โหลดตามหมวดหมู่
            }
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
        }

        function normalizeLevel(levelRaw) {
            const s = String(levelRaw || '').trim().toLowerCase();
            if (!s) return '';
            if (['พื้นฐาน','basic'].includes(s)) return 'พื้นฐาน';
            if (['กลาง','ปานกลาง','medium'].includes(s)) return 'ปานกลาง';
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
            // วันที่
            const startTxt = formatDateTime(activity.startDateTime);
            const endTxt   = formatDateTime(activity.endDateTime);
            const dateRange = activity.endDateTime ? `${startTxt} – ${endTxt}` : startTxt;
          
            // หมวดทักษะ
            const skillCategory = activity.skillCategory || '';
            const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
            const skillDisplayName =
              skillCategory === 'soft skill'  ? 'Soft Skill'  :
              skillCategory === 'hard skill'  ? 'Hard Skill'  :
              skillCategory === 'multi-skill' ? 'Multi-Skill' : 'ทักษะทั่วไป';
          
            // ระดับ (skillLevel)
            const levelDisplay = getLevelDisplay(activity.skillLevel);
            const levelClass   = getLevelClass(activity.skillLevel);
            const levelBadge   = levelDisplay ? `<div class="level-badge ${levelClass}">${levelDisplay}</div>` : '';
          
            // รูป
            const imageUrl = activity.imageUrl || null;
            const imageHtml = imageUrl ? `style="background-image: url('${imageUrl}')"` : '';
            const placeholderIcon = imageUrl ? '' : '🖼️';
          
            // PLO (ชื่อเต็ม)
            const ploNames = Array.isArray(activity.ploFullNames) ? activity.ploFullNames : [];
            const ploHtml = ploNames.length
              ? `<div class="plo-section">
                   <div class="plo-title">ทักษะที่ได้รับ:</div>
                   <div class="plo-values">
                     ${ploNames.map(n => `<div class="plo-item">• ${n}</div>`).join('')}
                   </div>
                 </div>`
              : '';
          
            // ปุ่มกด
            const buttonsHtml = `
              <div class="card-actions">
                <button class="btn btn-detail"
                  onclick="event.stopPropagation(); window.location.href='advisor-overall.html?activityId=${activity.activityId}'">
                  ดูรายละเอียด
                </button>
                <button class="btn btn-edit"
                  onclick="event.stopPropagation(); window.location.href='edit-activity.html?id=${activity.activityId}'">
                  แก้ไข
                </button>
              </div>
            `;
          
            return `
              <div class="activity-card" onclick="viewActivityDetail('${activity.activityId}')" style="cursor:pointer;">
                <div class="activity-image" ${imageHtml}>
                  ${placeholderIcon}
                  ${levelBadge}
                  ${skillCategory ? `<div class="skill-badge ${skillBadgeClass}">${skillDisplayName}</div>` : ''}
                </div>
                <div class="activity-content">
                  <h3 class="activity-title">${activity.name || 'ไม่มีชื่อกิจกรรม'}</h3>
                  <p class="activity-description">${activity.description || 'ไม่มีคำอธิบาย'}</p>
                  <div class="activity-meta">
                    <div class="activity-date">📅 ${dateRange}</div>
                    <div class="activity-location">📍 ${activity.locationName || activity.location || 'ไม่ระบุสถานที่'}</div>
                  </div>
                  ${ploHtml}
                  ${buttonsHtml}
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
        
        // View activity detail
        function viewActivityDetail(activityId) {
            // Navigate to detailed activity page with activity ID
            window.location.href = `advisor-overall.html?activityId=${activityId}`;
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
        
        // ฟังก์ชันล็อกเอาท์
        function logout() {
            const confirmLogout = confirm('ต้องการออกจากระบบหรือไม่?');
            if (confirmLogout) {
                localStorage.removeItem('userData');
                localStorage.removeItem('token');
                window.location.href = "login.html";
            }
        }
        
