        // Configuration - แก้ URL ให้ตรงกับ API Gateway จริงของคุณ
        const CONFIG = {
            API_BASE_URL: 'https://isukcfvzoi.execute-api.us-east-1.amazonaws.com/test',
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
        /*document.addEventListener('DOMContentLoaded', function() {
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
        }*/

        // ---------- DEV MODE: ใช้งานหน้าโดยไม่ต้องล็อกอิน ----------
        document.addEventListener('DOMContentLoaded', () => {
        console.log('[ADVISOR-ACT] DEV init (no auth)');
        // ไม่เช็ก token / role ใด ๆ ทั้งสิ้น
        setupTabButtons();
        loadActivities();   // โหลดกิจกรรมทั้งหมด
        });
        
        // Setup tab button event listeners
        function setupTabButtons() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            currentFilter = this.dataset.filter;
            console.log('[ADVISOR-ACT] Tab clicked, filter =', currentFilter);

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

            // Add PLO filter (จาก tab) ถ้ามี
            if (skillType && skillType !== 'all') {
            apiUrl += `?plo=${encodeURIComponent(skillType)}`;
            }

            console.log('[ADVISOR-ACT] Fetch URL =', apiUrl);

            // Make API request
            const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
            });

            console.log('[ADVISOR-ACT] HTTP status =', response.status, response.statusText);

            if (!response.ok) {
            const text = await response.text();
            console.error('[ADVISOR-ACT] Response not OK, body =', text);
            alert(`โหลดกิจกรรมไม่สำเร็จ (HTTP ${response.status})`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // ----- รองรับทั้งแบบส่ง array ตรง ๆ และแบบ Lambda proxy {statusCode, body} -----
            let raw = await response.json();
            console.log('[ADVISOR-ACT] Raw JSON =', raw);

            let activities = raw;

            if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'body' in raw) {
            try {
                const parsedBody = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
                console.log('[ADVISOR-ACT] Parsed body =', parsedBody);
                if (Array.isArray(parsedBody)) {
                activities = parsedBody;
                } else {
                console.warn('[ADVISOR-ACT] body is not array:', parsedBody);
                }
            } catch (e) {
                console.error('[ADVISOR-ACT] Cannot parse body as JSON array', e);
            }
            }

            // ถ้าไม่ใช่ array ถือว่าข้อมูลผิดรูปแบบ
            if (!Array.isArray(activities)) {
            console.error('[ADVISOR-ACT] activities is NOT an array:', activities);
            alert('รูปแบบข้อมูลกิจกรรมไม่ถูกต้อง (activities ไม่ใช่ array)');
            activitiesList.innerHTML = `
                <div class="error-message">
                <p>รูปแบบข้อมูลกิจกรรมไม่ถูกต้อง</p>
                </div>`;
            return;
            }

            // ฟิลเตอร์ตาม PLO (ตัวแปร currentFilter จาก tab)
            if (currentFilter && currentFilter !== 'all') {
            activities = activities.filter(a => matchesPLO(a, currentFilter));
            }

            console.log('[ADVISOR-ACT] Activities after filter =', activities.length);

            if (activities.length === 0) {
            console.warn('[ADVISOR-ACT] No activities found for filter', currentFilter);
            }

            // Store activities globally
            allActivities = activities;

            // Display activities
            displayActivities(activities);

        } catch (error) {
            console.error('[ADVISOR-ACT] Error loading activities:', error);
            alert('โหลดกิจกรรมไม่สำเร็จ: ' + error.message);
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

        console.log('[ADVISOR-ACT] displayActivities() called, count =', activities ? activities.length : 0);

        if (!activities || activities.length === 0) {
            activitiesList.innerHTML = `
            <div class="empty-message">
                <p>ไม่พบกิจกรรมในหมวดหมู่นี้</p>
                <p style="font-size: 0.9rem; color: #888; margin-top: 10px;">
                currentFilter = ${currentFilter || 'all'}
                </p>
            </div>
            `;
            return;
        }

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
        // --------------------------
        // 1) Map level → badge class
        // ดึงจาก Activities: ใช้ level ก่อน ถ้าไม่มีค่อย fallback เป็น skillLevel
        const levelRaw = activity.level || activity.skillLevel || "";
        const levelText = getLevelDisplay(levelRaw);
        const levelBadgeClass = getLevelClass(levelRaw);

        const levelBadge = levelText
        ? `<span class="badge-level ${levelBadgeClass}">${levelText}</span>`
        : "";



        // --------------------------
        // 2) skillCategory Badge
        // --------------------------
        const skillCategory = activity.skillCategory || "";
        const skillBadgeClass = skillCategory.toLowerCase().replace(" ", "-");
        const skillBadge = skillCategory
            ? `<span class="badge-skill ${skillBadgeClass}">${skillCategory}</span>`
            : "";

        const skillBadgeRow = `
            <div class="badge-row">
                ${skillBadge}
                ${levelBadge}
            </div>
        `;

        // --------------------------
        // 3) แสดงแค่ Start Date
        // --------------------------
        const startTxt = formatDateTime(activity.startDateTime);

        // --------------------------
        // 4) ดึงชื่อสถานที่ (Locations Map)
        // --------------------------
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
            "-";

        // --------------------------
        // 5) PLO → เต็มรูปแบบ
        // --------------------------
        const PLO_FULL = {
            "PLO1": "ความรู้พื้นฐานด้านการเขียนโปรแกรม",
            "PLO2": "ทักษะการพัฒนาและออกแบบระบบ",
            "PLO3": "ความรับผิดชอบและจริยธรรมวิชาชีพ",
            "PLO4": "การทำงานร่วมกับผู้อื่นและภาวะผู้นำ"
        };

        const ploList = Array.isArray(activity.plo) ? activity.plo : [];
        const ploHtml = ploList
            .map(p => `<div class="plo-item">• ${p}: ${PLO_FULL[p] || ""}</div>`)
            .join("");

        const ploSection = ploList.length
            ? `<div class="plo-section">
                <div class="plo-title">ทักษะที่ได้รับ:</div>
                ${ploHtml}
            </div>`
            : "";

        // --------------------------
        // 6) รูปภาพ
        // --------------------------
        const imageUrl = activity.imageUrl || null;
        const imageHtml = imageUrl
            ? `style="background-image:url('${imageUrl}')"`
            : "";

        // --------------------------
        // 7) Card Template
        // --------------------------
        return `
            <div class="activity-card" onclick="viewActivityDetail('${activity.activityId}')">
            <div class="activity-image" ${imageHtml}>
                ${skillBadgeRow}
            </div>

            <div class="activity-content">

                <h3 class="activity-title">${activity.name || "ไม่มีชื่อกิจกรรม"}</h3>
                <p class="activity-description">${activity.description || ""}</p>

                <div class="activity-meta">
                <div class="activity-date">📅 ${startTxt}</div>
                <div class="activity-location">📍 ${locationName}</div>
                </div>

                ${ploSection}

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
        
