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
                    apiUrl += `?skillType=${encodeURIComponent(skillType)}`;
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
                
                const activities = await response.json();
                
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

        // ==== PLO full-name map ====
        const PLO_NAME_MAP = {
            PLO1: 'ความรู้พื้นฐานด้านการเขียนโปรแกรม',
            PLO2: 'ทักษะการพัฒนาและออกแบบระบบ',
            PLO3: 'ความรับผิดชอบและจริยธรรมวิชาชีพ',
            PLO4: 'การทำงานร่วมกับผู้อื่นและภาวะผู้นำ',
        };
        
        // ดึง PLO จาก activity (รองรับ array, JSON string, "PLO1,PLO2")
        function extractPLOs(activity) {
            const raw = activity.plo || activity.plos || activity.PLO || activity.PLOs || [];
            if (Array.isArray(raw)) return raw.map(x => String(x).trim().toUpperCase());
            if (typeof raw === 'string') {
            const s = raw.trim();
            try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed.map(x => String(x).trim().toUpperCase()); } catch(_) {}
            return s.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
            }
            return [];
        }
        
        function getPloFullNames(plos) {
            return plos.map(code => PLO_NAME_MAP[code] || code);
        }
        
        // แสดงชื่อระดับบน badge
        function getLevelDisplay(levelRaw) {
            const level = (levelRaw || '').trim();
            if (!level) return '';
            return level === 'กลาง' ? 'ปานกลาง' : level; // ให้ขึ้นคำว่า “ปานกลาง”
        }
        function getLevelClass(levelRaw) {
            const l = (levelRaw || '').trim();
            if (l === 'พื้นฐาน') return 'level-basic';
            if (l === 'กลาง')    return 'level-medium';
            if (l === 'ขั้นสูง')  return 'level-advanced';
            return '';
        }
        
        
        // Create individual activity card HTML
        function createActivityCard(activity) {
            // ==== เวลา/ปุ่มสมัคร ====
            const now   = new Date();
            const start = activity.startDateTime ? new Date(activity.startDateTime) : null;
            const end   = activity.endDateTime ? new Date(activity.endDateTime)   : null;
        
            let btnText = 'สมัครเข้าร่วม';
            let btnDisabled = false;
            if (start && now >= start) {
            btnDisabled = true;
            btnText = (end && now <= end) ? 'กำลังจัดกิจกรรม' : 'ปิดรับสมัครแล้ว';
            }
        
            // ==== วันที่ ====
            const formattedStart = formatDateTime(activity.startDateTime);
            const formattedEnd   = formatDateTime(activity.endDateTime);
            const dateRange = activity.endDateTime ? `${formattedStart} – ${formattedEnd}` : formattedStart;
        
            // ==== Badge หมวดทักษะ ====
            const skillCategory = activity.skillCategory || '';
            const skillBadgeClass = skillCategory.toLowerCase().replace(' ', '-');
            const skillDisplayName =
            skillCategory === 'soft skill' ? 'Soft Skill' :
            skillCategory === 'hard skill' ? 'Hard Skill' :
            skillCategory === 'multi-skill' ? 'Multi-Skill' : 'ทักษะทั่วไป';

            // ==== Badge ระดับ ====
            const levelDisplay = getLevelDisplay(activity.level);
            const levelClass   = getLevelClass(activity.level);
            const levelBadge   = levelDisplay ? `<div class="level-badge ${levelClass}">${levelDisplay}</div>` : '';

        
            // ==== รูป ====
            const imageUrl = activity.imageUrl || null;
            const imageHtml = imageUrl ? `style="background-image: url('${imageUrl}')"` : '';
            const placeholderIcon = imageUrl ? '' : '🖼️';
        
            // ==== ทักษะที่ได้รับ (PLO → ชื่อเต็ม) ====
            const plos = extractPLOs(activity);
            const ploFullNames = getPloFullNames(plos);
            const ploHtml = ploFullNames.length
            ? `<div class="plo-section">
                <div class="plo-title">ทักษะที่ได้รับ:</div>
                <div class="plo-values">
                    ${ploFullNames.map(n => `<div class="plo-item">• ${n}</div>`).join('')}
                </div>
                </div>`
            : '';
        
            // ==== ปุ่มสมัคร ====
            const buttonHtml = btnDisabled
            ? `<button class="register-btn disabled" disabled>${btnText}</button>`
            : `<button class="register-btn" onclick="event.stopPropagation(); registerForActivity('${activity.activityId}', '${activity.name}')">${btnText}</button>`;
        
            return `
            <div class="activity-card" onclick="viewActivityDetail('${activity.activityId}')" style="cursor: pointer;">
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
                    <div class="activity-location">📍 ${activity.location || 'ไม่ระบุสถานที่'}</div>
                    ${activity.skillName ? `<div class="activity-skill">🎯 ${activity.skillName}</div>` : ''}

                    ${ploHtml}
                </div>
        
                ${buttonHtml}
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
        
        // Register for activity
        async function registerForActivity(activityId, activityName) {
            const studentId = currentUser.studentId || currentUser.userId;
            
            if (!confirm(`ต้องการสมัครเข้าร่วมกิจกรรม "${activityName}" หรือไม่?`)) {
                return;
            }
            
            try {
                const apiUrl = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REGISTER_ACTIVITY;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
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