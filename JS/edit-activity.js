function normalizeGroup(rawValue) {
  if (!rawValue) return "";

  // ทำตัวพิมพ์เล็ก + เคลียร์ space + เปลี่ยน _ และ - เป็น space
  let key = String(rawValue).trim().toLowerCase();
  key = key.replace(/[_\-]+/g, " ");
  key = key.replace(/\s+/g, " ");

  const map = {
    "web application development": "grp-web",
    "virtualization": "grp-virt",
    "time management": "grp-time",
    "team collaboration": "grp-collab",
    "statistical analysis": "grp-stat",
    "software testing": "grp-test",
    "requirement engineering": "grp-req",
    "python programming": "grp-python",
    "problem solving": "grp-probsol",
    "machine learning": "grp-ml",
    "linux command line": "grp-linux",
    "leadership": "grp-leader",
    "java programming": "grp-java",
    "it ethics & law": "grp-ethics",
    "generative ai": "grp-genai",
    "effective communication": "grp-comm",
    "deep learning": "grp-dl",
    "detail oriented": "grp-detail",
    "database management": "grp-db",
    "data structures & algorithms": "grp-dsa",
    "data structures and algorithms": "grp-dsa",   // กันเคส and/ &

    "data engineering": "grp-deng",
    "data analytics": "grp-danal",
    "cybersecurity": "grp-sec",
    "computer network": "grp-net",
    "cloud computing": "grp-cloud",
    "cloud architecture": "grp-carch",
    "c programming": "grp-c",
    "agile & teamwork": "grp-agile",
    "agile and teamwork": "grp-agile",

    // ➕ เพิ่มรองรับภาษาไทยเก่าใน DB (เพื่อให้ทุกอันขึ้นจริง)
    "วิชาการ": "grp-web",
    "จิตอาสา": "grp-collab",
    "กีฬา": "grp-time",
    "ประกวด": "grp-test",

    // ➕ skill id เดิม (บางกิจกรรมอาจยังมี)
    "skill academic": "grp-web",
    "skill volunteer": "grp-collab",
    "skill sport": "grp-time",
    "skill contest": "grp-test"
  };

  return map[key] || "";
}


// ====== CONFIG & activityId (แก้ใหม่) ======

// ใช้ URL ของ API Gateway ตรง ๆ (เปลี่ยนเป็นของโปรเจกต์ตัวเองถ้าต่าง)
const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

// ดึง id จาก query string (รองรับทั้ง ?id=xxx และ ?activityId=xxx)
const params = new URLSearchParams(window.location.search);
const ACTIVITY_ID = params.get("id") || params.get("activityId");

// ตอนโหลดหน้า ถ้ามี id ให้ไปดึงข้อมูลกิจกรรมมาแสดง
document.addEventListener("DOMContentLoaded", () => {
  if (!ACTIVITY_ID) {
    console.warn("ไม่พบ id/activityId ใน URL (หน้าอาจถูกใช้เป็นหน้าเพิ่มกิจกรรมใหม่ได้)");
    return;
  }
  console.log("[EDIT] ACTIVITY_ID =", ACTIVITY_ID);
  loadActivityForEdit(ACTIVITY_ID);
});




// ===== Mapping กำหนดประเภททักษะจากชุด PLO =====
function computeCategory(plos) {
  const set = new Set(plos.filter(Boolean));
  if (!set.size) return '';
  const hasHard = [...set].some(p => p === 'PLO1' || p === 'PLO2');
  const hasSoft = [...set].some(p => p === 'PLO3' || p === 'PLO4');
  if (hasHard && hasSoft) return 'Multi-Skill';
  if (hasHard) return 'Hard Skill';
  if (hasSoft) return 'Soft Skill';
  return '';
}

// ===== DOM refs (ต้องมี element เหล่านี้ใน HTML) =====
const skillRowsEl        = document.getElementById('skill-rows');
const addSkillBtn        = document.getElementById('add-skill-btn');
const addSkillWrap       = document.getElementById('add-skill-wrap'); 
const skillCategoryInput = document.getElementById('skillCategory');
const ploHidden          = document.getElementById('category');
const ploDescHidden      = document.getElementById('ploDescriptions');

const MAX_ROWS = 4; 

// ===== Utils =====
function recalcCategory() {
  const plos  = [...document.querySelectorAll('.skill-plo')].map(s => s.value).filter(Boolean);
  const descs = [...document.querySelectorAll('.skill-desc')].map(i => i.value || '');
  if (ploHidden)            ploHidden.value            = JSON.stringify(plos);
  if (ploDescHidden)        ploDescHidden.value        = JSON.stringify(descs);
  if (skillCategoryInput)   skillCategoryInput.value   = computeCategory(plos);
}

// ทำแถวใหม่ (id ไม่ซ้ำ)
function createSkillRowDynamic() {
  const index = skillRowsEl.querySelectorAll('.skill-row').length + 1;
  const row = document.createElement('div');
  row.className = 'skill-row';
  row.innerHTML = `
    <div class="inline">
      <div>
        <label class="skill-plo-label" for="skill-plo-${index}">ทักษะที่ได้รับ</label>
        <select id="skill-plo-${index}" class="skill-plo" required>
          <option value="" disabled selected hidden>เลือก PLO</option>
          <option value="PLO1">PLO1</option>
          <option value="PLO2">PLO2</option>
          <option value="PLO3">PLO3</option>
          <option value="PLO4">PLO4</option>
        </select>
      </div>
      <div>
        <label class="skill-desc-label" for="skill-desc-${index}">คำอธิบายทักษะ</label>
        <input id="skill-desc-${index}" type="text" class="skill-desc">
      </div>
      <div class="delete-col">
        <label>&nbsp;</label>
        <button type="button" class="btn-delete">-</button>
      </div>
    </div>
  `;
  return row;
}

// ผูกอีเวนต์ให้แถว
function wireRowEvents(row) {
  row.querySelector('.skill-plo')?.addEventListener('change', recalcCategory);
  row.querySelector('.btn-delete')?.addEventListener('click', () => {
    const totalRows = skillRowsEl.querySelectorAll('.skill-row').length;
    if (totalRows <= 1) {
      alert('ต้องมีแถวทักษะอย่างน้อย 1 แถว');
      return;
    }
    row.remove();
    recalcCategory();
    updateAddButtonState();
  });
}

// ให้ปุ่ม (wrapper) เป็นลูกตัวสุดท้ายเสมอ
function placeAddButtonUnderLastRow() {
  if (!addSkillWrap) return;
  if (addSkillWrap.parentElement !== skillRowsEl) {
    skillRowsEl.appendChild(addSkillWrap);
  }
  skillRowsEl.appendChild(addSkillWrap);
}

function updateAddButtonState() {
  const count = skillRowsEl.querySelectorAll('.skill-row').length;
  if (addSkillBtn) addSkillBtn.disabled = count >= MAX_ROWS;
  placeAddButtonUnderLastRow();
}

// ===== Initial: ทำให้แถวแรกเป็น fixed (ไม่มีปุ่มลบ) =====
(function makeFirstRowFixed() {
  const firstRow = skillRowsEl.querySelector('.skill-row');
  if (firstRow) {
    firstRow.classList.add('fixed');
    firstRow.querySelector('.btn-delete')?.remove(); // เอาปุ่มลบออกจากแถวแรก
  }
})();

// ===== Initial wiring =====
skillRowsEl.querySelectorAll('.skill-row').forEach(wireRowEvents);
recalcCategory();
updateAddButtonState();

// ===== ผูกปุ่มเพิ่มทักษะ (กันผูกซ้ำ) =====
function onAddSkillClick(e) {
  e.preventDefault();
  const count = skillRowsEl.querySelectorAll('.skill-row').length;
  if (count >= MAX_ROWS) return;

  const row = createSkillRowDynamic();
  skillRowsEl.appendChild(row);
  placeAddButtonUnderLastRow(); // ให้ปุ่มลงไปใต้แถวที่เพิ่งเพิ่มทันที
  wireRowEvents(row);
  recalcCategory();
  updateAddButtonState();
}
if (addSkillBtn && !window.__ACHV_addSkillBound__) {
  addSkillBtn.addEventListener('click', onAddSkillClick);
  window.__ACHV_addSkillBound__ = true;
}

// ===== Validation ก่อนบันทึก =====
const form = document.getElementById('add-activity-form') || document.querySelector('form');

function clearValidity(el) {
  if (!el) return;
  el.setCustomValidity('');
  el.classList.remove('invalid');
}
function invalidate(el, msg) {
  if (!el) return;
  el.setCustomValidity(msg);
  el.classList.add('invalid');
}

function validateSkills() {
  let valid = true;
  let firstInvalid = null;

  // ต้องมีอย่างน้อย 1 แถว (อนุญาตให้มีแค่แถวแรก fixed ได้)
  const totalRows = skillRowsEl.querySelectorAll('.skill-row').length;
  if (totalRows < 1) {
    return false;
  }

  // ตรวจครบทุกแถว (รวมแถวแรก)
  skillRowsEl.querySelectorAll('.skill-row').forEach(row => {
    const sel  = row.querySelector('.skill-plo');
    const desc = row.querySelector('.skill-desc');

    clearValidity(sel); clearValidity(desc);

    if (sel && !sel.value) {
      valid = false;
      if (!firstInvalid) firstInvalid = sel;
    }
    if (desc && !desc.value.trim()) {
      valid = false;
      if (!firstInvalid) firstInvalid = desc;
    }
  });

  if (!valid && firstInvalid) {
    firstInvalid.reportValidity?.();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return valid;
}

if (form && !window.__ACHV_bindSubmit__) {
  form.addEventListener('submit', (e) => {
    // อัปเดต hidden ให้ใหม่ก่อนตรวจ
    recalcCategory();
    if (!validateSkills()) {
      e.preventDefault(); // ไม่ให้บันทึกถ้าไม่ผ่าน
      return;
    }
  });
  window.__ACHV_bindSubmit__ = true;
}

// เคลียร์ error อัตโนมัติเมื่อผู้ใช้แก้ไข
skillRowsEl.addEventListener('input',  e => clearValidity(e.target));
skillRowsEl.addEventListener('change', e => clearValidity(e.target));

// ========== ส่วนอัพโหลดรูปเหมือนหน้า add ==========
const API_BASE = "https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod";
const GET_UPLOAD_URL = `${API_BASE}/activities/upload-url`;

async function getUploadUrl(file) {
  const fileName = file.name;
  const fileType = file.type;

  const res = await fetch(GET_UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileType })
  });

  const data = await res.json();
  return typeof data.body === "string" ? JSON.parse(data.body) : data.body;
}

async function putToS3(uploadUrl, file, contentType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file
  });

  if (!res.ok) throw new Error("S3 upload failed " + res.status);
  return true;
}



(function setupValidationAndSaveFlow() {
  const form       = document.getElementById('edit-activity-form') || document.querySelector('form');
  const saveBtn    = document.querySelector('.btn-primary'); // ปุ่มบันทึกที่อยู่นอก <form>
  const fileInput  = document.querySelector('.upload-area input[type="file"]');
  const titleEl    = document.getElementById('name');
  const descEl     = document.getElementById('description');
  const startEl    = document.getElementById('startDateTime');
  const endEl      = document.getElementById('endDateTime');
  const placeEl    = document.getElementById('locationId');
  const hostEl     = document.getElementById('organizerId');
  const groupEl    = document.getElementById('group');
  const yearEl     = document.getElementById('yearLevel');
  const requiredEl = document.getElementById('required');
  const skillPloEl = document.getElementById('skill-plo-1');
  const skilldesEl = document.getElementById('skill-desc-1');

// ฟังก์ชันช่วยเน้นช่องที่ผิด
function markInvalid(el) {
  if (!el) return;
  el.classList.add('invalid');
  el.style.borderColor = '#e83c3c';
  el.style.boxShadow = '0 0 0 2px rgba(232,60,60,0.15)';
}
function clearInvalid(el) {
  if (!el) return;
  el.classList.remove('invalid');
  el.style.borderColor = '';
  el.style.boxShadow = '';
}
// เคลียร์เมื่อผู้ใช้พิมพ์/เปลี่ยนค่า
([
  fileInput, titleEl, descEl, startEl, endEl, placeEl, hostEl, groupEl, yearEl, requiredEl, skillPloEl, skilldesEl
].filter(Boolean)).forEach(el => {
  el.addEventListener('input', () => clearInvalid(el));
  el.addEventListener('change', () => clearInvalid(el));
});
// เคลียร์ให้ช่องทักษะด้วย
document.getElementById('skill-rows')?.addEventListener('input', e => clearInvalid(e.target));
document.getElementById('skill-rows')?.addEventListener('change', e => clearInvalid(e.target));

// ตรวจสอบทักษะ (ถ้ามี validateSkills() เดิมอยู่แล้วจะเรียกใช้)
function validateSkillsWrapper(errors) {
  // ถ้ามีฟังก์ชันเดิมในไฟล์นี้อยู่แล้ว ให้ใช้ต่อ
  if (typeof validateSkills === 'function') {
    const ok = validateSkills();
    if (!ok) errors.push('');
    return ok;
  }

  // fallback แบบเบา ๆ : ทุกแถวต้องเลือก PLO และกรอกคำอธิบาย
  let valid = true;
  document.querySelectorAll('.skill-row').forEach(row => {
    const sel  = row.querySelector('.skill-plo-1');
    const desc = row.querySelector('.skill-desc-1');
    if (sel && !sel.value)    { valid = false; markInvalid(sel); }
    if (desc && !desc.value?.trim()) { valid = false; markInvalid(desc); }
  });
  if (!valid) markInvalid(fileInput);
  return valid;
}

// ตรวจสอบทุกช่อง
function validateAll() {
  const errors = [];

 // 2.1 ไฟล์รูป (สำหรับหน้าแก้ไข: ไม่บังคับต้องเลือกไฟล์ใหม่)
if (fileInput && fileInput.files && fileInput.files[0]) {
  // ถ้าเลือกไฟล์มา ให้เช็คว่าเป็นรูปภาพจริง
  if (!fileInput.files[0].type.startsWith('image/')) {
    markInvalid(fileInput);
    errors.push('กรุณาเลือกเฉพาะไฟล์รูปภาพ');
  }
}
// ถ้าไม่ได้เลือกไฟล์เลย -> ไม่ต้อง markInvalid, ไม่ต้อง push error


  // 2.2 ฟิลด์ข้อความหลัก
  if (!titleEl?.value.trim()) { markInvalid(titleEl); }
  if (!descEl?.value.trim())  { markInvalid(descEl); }
  if (!placeEl?.value) { markInvalid(placeEl); }
  if (!hostEl?.value.trim())  { markInvalid(hostEl); }
  if (!requiredEl?.value.trim()) { markInvalid(requiredEl); }
  if (!skillPloEl?.value.trim()) { markInvalid(skillPloEl); }
  if (!skilldesEl?.value.trim()) { markInvalid(skilldesEl); }


  // 2.3 วันเวลา (ต้องไม่ว่าง และ end >= start)
  const startVal = startEl?.value;
  const endVal   = endEl?.value;
  if (!startVal) { markInvalid(startEl); }
  if (!endVal)   { markInvalid(endEl); }
  if (startVal && endVal) {
    const s = new Date(startVal).getTime();
    const e = new Date(endVal).getTime();
    if (!isFinite(s) || !isFinite(e) || e < s) {
      markInvalid(startEl);
      markInvalid(endEl);
    }
  }

  // 2.4 กลุ่มกิจกรรม/ชั้นปี
  if (!groupEl?.value) { markInvalid(groupEl); }
  if (!yearEl?.value)  { markInvalid(yearEl); }

  // 2.5 ระดับ (radio name="level")
  const levelChecked = !!document.querySelector('input[name="level"]:checked');
  if (!levelChecked) {
    // ไฮไลต์กรอบกล่อง container ของ radio (ใช้ label หลักที่อยู่แถวเดียวกับ "ระดับ")
    const levelBox = (startEl && endEl) ? startEl.closest('.pair')?.nextElementSibling?.querySelector('.level')
                                        : document.querySelector('.level');
    if (levelBox) markInvalid(levelBox);
  }

  // 2.6 ทักษะ (PLO + คำอธิบาย)
  validateSkillsWrapper(errors);

  return errors;
}

// ==========================
// 3) ปุ่มบันทึก + Popup สำเร็จ
// ==========================
function showSuccessPopup(message = 'บันทึกสำเร็จ', onClose = null) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#fff', padding: '20px 24px', borderRadius: '14px',
    boxShadow: '0 12px 28px rgba(0,0,0,.12)', minWidth: '280px', textAlign: 'center'
  });
  box.innerHTML = `
      <div style="font-weight:700;font-size:18px;margin-bottom:8px">${message}</div>
      <div style="margin-bottom:16px;color:#4b5563">ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว</div>
  `;

  const okBtn = document.createElement('button');
  okBtn.textContent = 'ตกลง';
  Object.assign(okBtn.style, {
    padding: '8px 20px', borderRadius: '999px', border: '0',
    background: 'linear-gradient(90deg, #50E486 0%, #27C4B7 100%)',
    color: '#fff', fontWeight: 800, cursor: 'pointer'
  });

  okBtn.addEventListener('click', () => {
    overlay.remove();
    if (typeof onClose === 'function') onClose();
  });

  box.appendChild(okBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


  if (saveBtn && !window.__ACHV_bindSaveClick__) {
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1) เคลียร์ invalid เดิม ๆ
    document.querySelectorAll('.invalid').forEach(el => clearInvalid(el));

    // 2) ตรวจฟอร์ม
    const errors = validateAll();
    if (errors.length) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน\n');

      const firstInvalid = document.querySelector('.invalid, .upload-area input[type="file"].invalid');
      if (firstInvalid && firstInvalid.scrollIntoView) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!ACTIVITY_ID) {
      alert("ไม่พบรหัสกิจกรรมสำหรับแก้ไข");
      return;
    }




    // 3) ดึงค่าจากฟอร์มทั้งหมด
    const titleEl    = document.getElementById('name');
    const descEl     = document.getElementById('description');
    const startEl    = document.getElementById('startDateTime');
    const endEl      = document.getElementById('endDateTime');
    const placeEl    = document.getElementById('locationId');
    const hostEl     = document.getElementById('organizerId');
    const groupEl    = document.getElementById('group');
    const yearEl     = document.getElementById('yearLevel');
    const requiredEl = document.getElementById('required');
    const levelRadio = document.querySelector('input[name="level"]:checked');

    // ทักษะ/หมวดหมู่
    const categoryHidden  = document.getElementById('category');
    const ploDescHidden   = document.getElementById('ploDescriptions');
    const skillCategoryEl = document.getElementById('skillCategory');

    // อัปเดต hidden ให้ตรงกับแถว PLO ปัจจุบัน
    recalcCategory();

    let category = [];
    let ploDescriptions = [];
    try {
      category        = categoryHidden?.value ? JSON.parse(categoryHidden.value) : [];
      ploDescriptions = ploDescHidden?.value ? JSON.parse(ploDescHidden.value) : [];
    } catch (e) {
      console.warn('parse hidden PLO failed', e);
    }
        // ดึงค่า locationId / locationName จาก select
    const locSel = document.getElementById('locationId');
    const locationId = locSel ? locSel.value : "";
    const locationName = (locSel && locSel.selectedIndex >= 0)
      ? locSel.options[locSel.selectedIndex].textContent.trim()
      : "";

    // ⭐⭐ ตรงนี้ใส่เข้าไป ⭐⭐
    let imageUrl = existingImageUrl || "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      // ถ้า user เลือกรูปใหม่ → upload
      const file = fileInput.files[0];
      console.log("[EDIT] uploading new image:", file.name);

      const { uploadUrl, objectUrl, contentType } = await getUploadUrl(file);
      await putToS3(uploadUrl, file, contentType);

      imageUrl = objectUrl;  // ใช้ URL ใหม่แทน
    }


    const payload = {
      // ฟิลด์หลัก
      name:          titleEl.value.trim(),
      description:   descEl.value.trim(),
      startDateTime: startEl.value,
      endDateTime:   endEl.value,

      // สถานที่
      locationId,
      locationName,

      organizerId:   hostEl.value.trim(),

      // ==== กลุ่มกิจกรรม ====
      // เก็บ "ชื่อเต็ม" เช่น Java Programming, Virtualization
      // ถ้าหา option ไม่เจอ ให้ fallback เป็น value เดิม
      skillId: (function () {
        if (!groupEl) return "";
        const opt = groupEl.options[groupEl.selectedIndex];
        return opt ? opt.textContent.trim() : groupEl.value;
      })(),
      group: (function () {           // ถ้าหลังบ้านยังอ่าน field group อยู่ จะได้ค่าเหมือนกัน
        if (!groupEl) return "";
        const opt = groupEl.options[groupEl.selectedIndex];
        return opt ? opt.textContent.trim() : groupEl.value;
      })(),

      // ชั้นปี + กิจกรรมที่ต้องเข้าร่วม
      yearLevel:          yearEl.value,
      requiredActivities: requiredEl.value.trim(),   // ✅ เปลี่ยนชื่อฟิลด์ให้ตรงกับที่หน้าอื่นใช้

      // ระดับกิจกรรม
      level:         levelRadio ? levelRadio.value : null,

      // PLO / PLO Description
      // category (จาก hidden #category) คือ array ของ PLO ที่เราเลือก เช่น ["PLO1","PLO4"]
      plo:             category,        // ✅ ส่งเป็น plo ด้วย
      category:        category,        // เผื่อหลังบ้านยังใช้ชื่อเดิม
      ploDescriptions: ploDescriptions,

      // Hard / Soft / Multi-Skill
      skillCategory:   skillCategoryEl?.value || "",

      // ★★ เพิ่มอันนี้ ★★
      imageUrl: imageUrl
      //coverImage: imageUrl
    };  

    console.log("[EDIT] PUT payload =", payload);

    try {
      const res = await fetch(`${API_BASE_URL}/activities/${ACTIVITY_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        console.warn("Response ไม่ใช่ JSON", e);
      }

      console.log("[EDIT] PUT result =", res.status, data);

      if (!res.ok || data.success === false) {
        alert(data.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        return;
      }

      // ✅ สำเร็จ → โชว์ popup แล้วเด้งกลับหน้า list
      showSuccessPopup('บันทึกสำเร็จ', () => {
        // เมื่อผู้ใช้กด "ตกลง" ค่อยเปลี่ยนหน้า
        window.location.href = `advisor-overall.html?activityId=${ACTIVITY_ID}`;
      });
      
      

    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  });

  window.__ACHV_bindSaveClick__ = true;
}

})();

(function enhanceUploadArea() {
const uploadArea = document.querySelector('.upload-area');
const fileInput  = uploadArea?.querySelector('input[type="file"]');
const hintEl     = uploadArea?.querySelector('.hint');

if (!uploadArea || !fileInput || !hintEl) return;

// จัดวางชั้น (z-index) ให้คลิกได้เสมอ
Object.assign(uploadArea.style, { position: 'relative', overflow: 'hidden' });
Object.assign(hintEl.style, {
  position: 'absolute',
  left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 3,  
  cursor: 'pointer',
  pointerEvents: 'auto'
});
// คลิกที่ hint ให้เปิด file picker
hintEl.addEventListener('click', (e) => {
  e.preventDefault();
  fileInput.click();
});

// ทำให้คลิกที่ "พื้นที่ไหนก็ได้" เปิดไฟล์ได้ (โดยไม่ต้องแก้ HTML)
Object.assign(fileInput.style, {
  position: 'absolute', inset: '0', opacity: '0',
  cursor: 'pointer', zIndex: 4 // สูงสุดเพื่อให้คลิกได้
});

// แสดงรูป preview แต่ "ไม่ซ่อน" ปุ่ม hint
function renderPreview(file) {
// เคลียร์ <img> เดิมถ้ามี
const old = uploadArea.querySelector('.upload-preview');
if (old) old.remove();

// ถ้าไม่มีไฟล์ → ล้างพื้นหลัง
if (!file) {
  uploadArea.style.backgroundImage = '';
  uploadArea.style.backgroundSize = '';
  uploadArea.style.backgroundPosition = '';
  uploadArea.style.backgroundRepeat = '';
  return;
}

// ต้องเป็นรูปภาพเท่านั้น
if (!file.type || !file.type.startsWith('image/')) {
  alert('กรุณาเลือกเฉพาะไฟล์รูปภาพ');
  fileInput.value = '';
  uploadArea.style.backgroundImage = '';
  uploadArea.style.backgroundSize = '';
  uploadArea.style.backgroundPosition = '';
  uploadArea.style.backgroundRepeat = '';
  return;
}

const reader = new FileReader();
reader.onload = () => {
  uploadArea.style.backgroundImage = `url(${reader.result})`;
  uploadArea.style.backgroundSize = `cover`;        
  uploadArea.style.backgroundPosition = 'center';   
  uploadArea.style.backgroundRepeat = 'no-repeat';  
};
reader.readAsDataURL(file);
}


fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  renderPreview(file);
});
})();


// ===============================
// โหลดข้อมูลกิจกรรมมาแสดงในฟอร์มแก้ไข
// ===============================
async function loadActivityForEdit(activityId) {
  try {
    const url = `${API_BASE_URL}/activities/${activityId}`;
    console.log("[EDIT] Fetch activity for edit:", url);

    const res  = await fetch(url);
    const data = await res.json();
    console.log("[EDIT] Response:", data);

    if (!res.ok || !data) {
      alert("ไม่สามารถโหลดข้อมูลกิจกรรมได้");
      return;
    }

    // รองรับได้หลายแบบ: {activity: {...}} หรือ {data: {...}} หรือ {item: {...}}
    const a = data.activity || data.data || data.item || data;
    if (!a) {
      alert("ไม่พบข้อมูลกิจกรรม");
      return;
    }

    fillEditForm(a);
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดในการโหลดข้อมูลกิจกรรม");
  }
}

// แปลงวันที่จากรูปแบบ ISO / string มาเป็น format ของ datetime-local (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // แก้ timezone ให้ตรง local
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function normalizeYearLevel(raw) {
  if (raw === null || raw === undefined) return "";

  // ถ้าเป็น number เช่น 0,1,2,3,4
  if (typeof raw === "number") {
    if (raw === 0) return "ทุกชั้นปี";   // map 0 -> ทุกชั้นปี
    return String(raw);
  }

  // ถ้าเป็น string
  const s = String(raw).trim().toLowerCase();

  // เคสที่เก็บมาหลายรูปแบบ
  if (s === "ทุกชั้นปี" || s === "all" || s === "0") {
    return "ทุกชั้นปี";                 // ให้ตรงกับ value ของ option
  }

  if (["1", "2", "3", "4"].includes(s)) return s;

  // default: ไม่รู้จัก → ไม่ set อะไร
  return "";
}

// เติมค่าลง input ต่าง ๆ
function fillEditForm(a) {
  // ===== ข้อมูลพื้นฐาน =====
  document.getElementById("name").value        = a.name        || "";
  document.getElementById("description").value = a.description || "";

  document.getElementById("startDateTime").value =
    toDatetimeLocal(a.startDateTime || a.StartDateTime || a.start);
  document.getElementById("endDateTime").value   =
    toDatetimeLocal(a.endDateTime   || a.EndDateTime   || a.end);

  // 🔹 สถานที่: locationName > location > locationId
  const locSel = document.getElementById('locationId');
if (locSel) {
  locSel.value = a.locationId || "";
}


  // 🔹 ผู้จัด: organizerId (อันนี้ขึ้นแล้วอยู่แล้วแหละ)
  document.getElementById("organizerId").value =
    a.organizerId || a.organizer || a.OnName || a.onName || "";

  // 🔹 กลุ่มกิจกรรม: group > activityGroup > skillId
  const rawGroup =
  a.group || a.activityGroup || a.ActivityGroup || a.skillId || "";

document.getElementById("group").value = normalizeGroup(rawGroup);

 // 🔹 เหมาะสำหรับชั้นปี: yearLevel / YearLevel (บางแถวอาจไม่มีใน DB)
const rawYear = a.yearLevel || a.YearLevel || "";
document.getElementById("yearLevel").value = normalizeYearLevel(rawYear);



  // 🔹 กิจกรรมที่ต้องเข้าร่วม: required* ต่าง ๆ
  let requiredVal =
    a.required ||
    a.requiredActivity ||
    a.RequiredActivity ||
    a.requiredActivities ||
    a.RequiredActivities ||
    "";

  
  

  document.getElementById("required").value = requiredVal;


  // ระดับ (radio)
  if (a.level) {
    const radio = document.querySelector(`input[name="level"][value="${a.level}"]`);
    if (radio) radio.checked = true;
  }

  // รูปภาพปก
  const uploadArea = document.querySelector(".upload-area");
  const coverUrl = a.coverImage || a.coverImageUrl || a.imageUrl;
  if (uploadArea && coverUrl) {
    uploadArea.style.backgroundImage    = `url(${coverUrl})`;
    uploadArea.style.backgroundSize     = "cover";
    uploadArea.style.backgroundPosition = "center";
    uploadArea.style.backgroundRepeat   = "no-repeat";

    existingImageUrl = coverUrl; 
  }

    // ทักษะ / PLO
  let plos = [];
  let descs = [];

  // 1) เอาจาก a.plo ก่อน (ตัวหลักใน DB)
  if (Array.isArray(a.plo)) {
    plos = a.plo;
  } else if (typeof a.plo === "string") {
    try {
      // ถ้าเก็บเป็น JSON string เช่น '["PLO1","PLO2"]'
      const parsed = JSON.parse(a.plo);
      if (Array.isArray(parsed)) plos = parsed;
      else if (parsed) plos = [parsed];
    } catch {
      // ถ้าเป็น string เดี่ยว ๆ เช่น "PLO1"
      plos = [a.plo];
    }
  }

  // 2) สำรอง: เอาจาก category (ที่เคยใช้ตอน add-activity)
  if (!plos.length) {
    if (Array.isArray(a.category)) {
      plos = a.category;
    } else if (typeof a.category === "string") {
      try { plos = JSON.parse(a.category); } catch { /* เฉย ๆ */ }
    }
  }

  // 3) คำอธิบายทักษะ
  if (Array.isArray(a.ploDescriptions)) {
    descs = a.ploDescriptions;
  } else if (typeof a.ploDescriptions === "string") {
    try { descs = JSON.parse(a.ploDescriptions); } catch {}
  } else if (Array.isArray(a.ploDescription)) {
    descs = a.ploDescription;
  }

  // ถ้าไม่เจออะไรเลย แต่มี field เดี่ยว ๆ
  if (!plos.length && a.PLO) plos = [a.PLO];
  if (!descs.length && a.PLODescription) descs = [a.PLODescription];

  renderSkillRowsFromData(plos, descs);


  // category / ploDescriptions อาจเป็น array หรือ string JSON
  if (Array.isArray(a.category)) {
    plos = a.category;
  } else if (typeof a.category === "string") {
    try { plos = JSON.parse(a.category); } catch {}
  }

  if (Array.isArray(a.ploDescriptions)) {
    descs = a.ploDescriptions;
  } else if (typeof a.ploDescriptions === "string") {
    try { descs = JSON.parse(a.ploDescriptions); } catch {}
  }

  // ถ้าไม่เจออะไรเลย แต่มี PLO ตัวเดียวใน field อื่น ก็ลองดึง
  if (!plos.length && a.PLO) plos = [a.PLO];
  if (!descs.length && a.PLODescription) descs = [a.PLODescription];

  renderSkillRowsFromData(plos, descs);

  // หมวดหมู่ skillCategory
  const skillCategoryInput = document.getElementById("skillCategory");
  if (skillCategoryInput && a.skillCategory) {
    skillCategoryInput.value = a.skillCategory;
  }

  // อัปเดต hidden และหมวดหมู่ให้ตรง
  recalcCategory();
}

function goBack() {
  window.location.href = "advisor-activities.html";
}


// สร้างแถวทักษะตามข้อมูลที่ได้มา
function renderSkillRowsFromData(plos, descs) {
  const skillRows = document.getElementById("skill-rows");
  if (!skillRows) return;

  // เคลียร์ของเก่า
  skillRows.innerHTML = "";

  // ถ้าไม่มีข้อมูลเลย ให้มีแค่แถวว่าง 1 แถว
  if (!plos || plos.length === 0) {
    const row = createSkillRowDynamic();
    skillRows.appendChild(row);
    wireRowEvents(row);
    placeAddButtonUnderLastRow();
    return;
  }

  for (let i = 0; i < plos.length; i++) {
    const row = createSkillRowDynamic();
    skillRows.appendChild(row);
    wireRowEvents(row);

    const sel  = row.querySelector(".skill-plo");
    const desc = row.querySelector(".skill-desc");

    if (sel)  sel.value  = plos[i] || "";
    if (desc) desc.value = (descs[i] || "");
  }

  // ทำแถวแรกเป็น fixed และเอาปุ่มลบออก (ตามดีไซน์เดิม)
  const first = skillRows.querySelector(".skill-row");
  if (first) {
    first.classList.add("fixed");
    first.querySelector(".btn-delete")?.remove();
  }

  placeAddButtonUnderLastRow();
}
