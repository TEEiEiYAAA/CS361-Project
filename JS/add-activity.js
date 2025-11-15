// ===== Mapping กำหนดประเภททักษะจากชุด PLO =====
function computeCategory(plos) {
  const set = new Set(plos.filter(Boolean));
  if (!set.size) return '';
  const hasHard = [...set].some(p => p === 'PLO1' || p === 'PLO2');
  const hasSoft = [...set].some(p => p === 'PLO3' || p === 'PLO4');
  if (hasHard && hasSoft) return 'multi-skill';
  if (hasHard) return 'hard skill';
  if (hasSoft) return 'soft skill';
  return '';
}

// ===== DOM refs (ต้องมี element เหล่านี้ใน HTML) =====
const skillRowsEl        = document.getElementById('skill-rows');
const addSkillBtn        = document.getElementById('add-skill-btn');
const addSkillWrap       = document.getElementById('add-skill-wrap'); 
const skillCategoryInput = document.getElementById('skillCategory'); // ถ้าจะส่งหมวดสำเร็จรูป
const ploHidden          = document.getElementById('plo');              // เก็บ JSON ["PLO1","PLO3"]
const ploDescHidden      = document.getElementById('ploDescriptions');  // เก็บ JSON ["desc1","desc2"]

const MAX_ROWS = 4; 

// ===== Utils =====
function recalcCategory() {
  const plos  = [...document.querySelectorAll('.skill-plo')].map(s => s.value).filter(Boolean);
  const descs = [...document.querySelectorAll('.skill-desc')].map(i => i.value || '');
  if (ploHidden)           ploHidden.value = JSON.stringify(plos);
  if (ploDescHidden)       ploDescHidden.value = JSON.stringify(descs);
  if (skillCategoryInput)  skillCategoryInput.value = computeCategory(plos);
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
          <option value="PLO1">PLO1 – ความรู้พื้นฐานด้านการเขียนโปรแกรม</option>
          <option value="PLO2">PLO2 – ทักษะการพัฒนาและออกแบบระบบ</option>
          <option value="PLO3">PLO3 – ความรับผิดชอบและจริยธรรมวิชาชีพ</option>
          <option value="PLO4">PLO4 – การทำงานร่วมกับผู้อื่นและภาวะผู้นำ</option>
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

// =========================
//  Helpers & Utilities
// =========================

// แสดงข้อความ popup สำเร็จ
window.showSuccessPopup = function (message = 'บันทึกสำเร็จ', onClose) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#fff',
    padding: '20px 24px',
    borderRadius: '14px',
    boxShadow: '0 12px 28px rgba(0,0,0,.12)',
    minWidth: '280px',
    textAlign: 'center'
  });

  box.innerHTML = `
    <div style="font-weight:700;font-size:18px;margin-bottom:8px">${message}</div>
    <div style="margin-bottom:16px;color:#4b5563">ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว</div>
  `;

  const okBtn = document.createElement('button');
  okBtn.textContent = 'ตกลง';
  Object.assign(okBtn.style, {
    padding: '8px 20px',
    borderRadius: '999px',
    border: '0',
    background: 'linear-gradient(90deg, #50E486 0%, #27C4B7 100%)',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  });
  okBtn.addEventListener('click', () => {
    overlay.remove();
    if (typeof onClose === 'function') onClose();
  });
  box.appendChild(okBtn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
};


// ไฮไลท์ช่องผิด
function markInvalid(el) {
  if (!el) return;
  el.classList.add('invalid');
  el.style.borderColor = '#e83c3c';
  el.style.boxShadow = '0 0 0 2px rgba(232,60,60,0.15)';
}

// เคลียร์ช่องผิด
function clearInvalid(el) {
  if (!el) return;
  el.classList.remove('invalid');
  el.style.borderColor = '';
  el.style.boxShadow = '';
}

// ตรวจกล่องทักษะทั้งหมด
function validateSkillsWrapper(errors = []) {
  if (typeof validateSkills === 'function') {
    const ok = validateSkills();
    if (!ok) errors.push('');
    return ok;
  }

  let valid = true;
  document.querySelectorAll('.skill-row').forEach(row => {
    const sel = row.querySelector('.skill-plo');
    const desc = row.querySelector('.skill-desc');
    if (sel && !sel.value) { valid = false; markInvalid(sel); }
    if (desc && !desc.value?.trim?.()) { valid = false; markInvalid(desc); }
  });
  return valid;
}

// =========================
//  Upload Preview
// =========================
(function enhanceUploadArea() {
  const uploadArea = document.querySelector('.upload-area');
  const fileInput = document.getElementById('image'); 
  const hintEl = uploadArea?.querySelector('.hint');
  if (!uploadArea || !fileInput || !hintEl) return;

  Object.assign(uploadArea.style, { position: 'relative', overflow: 'hidden' });
  Object.assign(hintEl.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 3,
    cursor: 'pointer',
    pointerEvents: 'auto'
  });

  hintEl.addEventListener('click', e => {
    e.preventDefault();
    fileInput.click();
  });

  Object.assign(fileInput.style, {
    position: 'absolute',
    inset: '0',
    opacity: '0',
    cursor: 'pointer',
    zIndex: 4
  });

  function isAllowedImage(file) {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExt = ["png", "jpg", "jpeg", "webp"];
  
    return allowedTypes.includes(file.type) && allowedExt.includes(ext);
  }
  
  function renderPreview(file) {
    const old = uploadArea.querySelector('.upload-preview');
    if (old) old.remove();
  
    if (!file) {
      uploadArea.style.backgroundImage = '';
      return;
    }
  
    if (!isAllowedImage(file)) {
      alert('รองรับเฉพาะไฟล์รูป .png .jpg .jpeg .webp เท่านั้น');
      fileInput.value = '';
      uploadArea.style.backgroundImage = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกเฉพาะไฟล์รูปภาพ');
      fileInput.value = '';
      uploadArea.style.backgroundImage = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      uploadArea.style.backgroundImage = `url(${reader.result})`;
      uploadArea.style.backgroundSize = 'cover';
      uploadArea.style.backgroundPosition = 'center';
      uploadArea.style.backgroundRepeat = 'no-repeat';
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    renderPreview(file);
  });
})();

// =========================
//  API Presign + Save
// =========================
const API_BASE = "https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod";
const GET_UPLOAD_URL = `${API_BASE}/activities/upload-url`;
const LEVEL_MAP = { 'พื้นฐาน': 'พื้นฐาน', 'ปานกลาง': 'ปานกลาง', 'ขั้นสูง': 'ขั้นสูง' };
// ขอ presigned URL จาก Lambda
async function getUploadUrl(file) {
  const fileName = file.name || 'upload.bin';
  const fileType = file.type || 'application/octet-stream';

  const res = await fetch(GET_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileType }),
  });

  let raw;
  try {
    raw = await res.json();          // raw = อะไรสักอย่างจาก API Gateway
  } catch (e) {
    throw new Error('presign response is not JSON');
  }

  // ---- แกะ Lambda proxy envelope ----
  let statusCode = res.status;
  let payload = raw;

  // ถ้าเป็นรูปแบบ { statusCode, headers, body }
  if (raw && typeof raw === 'object' && 'statusCode' in raw && 'body' in raw) {
    statusCode = raw.statusCode || res.status;

    if (typeof raw.body === 'string') {
      try {
        payload = JSON.parse(raw.body);
      } catch {
        payload = { rawBody: raw.body };
      }
    } else {
      payload = raw.body || {};
    }
  }

  console.log('[DEBUG] presign data:', payload);

  // เช็ค error จาก Lambda
  if (statusCode >= 400 || payload.error) {
    throw new Error(payload.error || `presign failed: ${statusCode}`);
  }

  if (!payload.uploadUrl) {
    throw new Error('uploadUrl is missing from presign response');
  }

  return payload; // { uploadUrl, objectUrl, key, contentType }
}

async function putToS3(uploadUrl, file, contentType) {
  if (!uploadUrl) {
    throw new Error('uploadUrl is missing from presign response');
  }
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || file.type || 'application/octet-stream' },
    body: file
  });
  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
  return true;
}

async function postActivity(payload) {
  const res = await fetch(`${API_BASE}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.error || `Create failed (${res.status})`);
  return data;
}

// =========================
//  Validate Inputs
// =========================
function validateAll() {
  const errors = [];
  // ดึง element ทุกตัวที่ต้องตรวจ
  const fileInput   = document.getElementById('image');
  const titleEl     = document.getElementById('name');
  const descEl      = document.getElementById('description');
  const startEl     = document.getElementById('startDateTime');
  const endEl       = document.getElementById('endDateTime');
  const placeEl     = document.getElementById('locationId');
  const hostEl      = document.getElementById('organizerId');
  const groupEl     = document.getElementById('group');
  const yearEl      = document.getElementById('yearLevel');
  const requiredEl  = document.getElementById('required');
  const skillPloEl  = document.getElementById('skill-plo-1');
  const skilldesEl  = document.getElementById('skill-desc-1');
  const levelBox    = document.querySelector('.level');
  const levelInput  = document.querySelector('input[name="level"]:checked');

  let firstInvalid = null;
  const hit = (el, key) => {
    if (el && !firstInvalid) firstInvalid = el;
    if (el) markInvalid(el);
    if (key) errors.push(key);
  };

  // 1) ไฟล์ภาพ
  if (!fileInput?.files?.length) {
    hit(fileInput, 'image');
  }

  // 2) ฟิลด์ข้อความหลัก
  if (!titleEl?.value.trim())    hit(titleEl, 'name');
  if (!descEl?.value.trim())     hit(descEl, 'desc');
  if (!placeEl?.value)           hit(placeEl, 'place');
  if (!hostEl?.value.trim())     hit(hostEl, 'host');

  // 🔥 กลุ่มกิจกรรม — กันเคสที่ยังเป็น placeholder อยู่
  const groupVal = groupEl?.value?.trim() || '';
  if (!groupVal || groupVal === '' || groupVal === 'กรุณาเลือกกลุ่มของกิจกรรม') {
    hit(groupEl, 'group');
  }

  if (!yearEl?.value)            hit(yearEl, 'year');
  if (!requiredEl?.value.trim()) hit(requiredEl, 'required');

  // 3) เวลา
  const startVal = startEl?.value;
  const endVal   = endEl?.value;
  const s = startVal ? new Date(startVal).getTime() : NaN;
  const e = endVal   ? new Date(endVal).getTime()   : NaN;

  if (!startVal) hit(startEl, 'start');
  if (!endVal)   hit(endEl, 'end');
  if (startVal && endVal && (!isFinite(s) || !isFinite(e) || e < s)) {
    hit(startEl, 'time-order'); hit(endEl);
  }

  // 4) ระดับ (radio)
  if (!levelInput) hit(levelBox, 'level');

  // 5) ทักษะอย่างน้อย 1 แถว + ค่าในแถวแรก
  if (!skillPloEl?.value)             hit(skillPloEl, 'plo');
  if (!skilldesEl?.value?.trim())     hit(skilldesEl, 'plodesc');
  validateSkillsWrapper(errors); // ตรวจทุกแถว

  if (firstInvalid?.focus) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return errors;
}

// =========================
//  Save Activity
// =========================
async function saveActivity() {
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const startDateTime = document.getElementById('startDateTime').value;
  const endDateTime = document.getElementById('endDateTime').value;
  const locationId = document.getElementById('locationId').value;

  // ===== กลุ่มกิจกรรม / skillId =====
  const groupEl = document.getElementById('group');            // 👈 เพิ่มบรรทัดนี้
  const skillId = document.querySelector('#group option:checked')?.textContent.trim() || null;
                                           // 👈 ตอนนี้ไม่เป็น undefined แล้ว

  const yearLevel = Number(document.getElementById('yearLevel').value) || null;
  const requiredActivities = document.getElementById('required').value.trim();
  const organizerId = document.getElementById('organizerId').value.trim();

  const levelInput = document.querySelector('input[name="level"]:checked');
  const levelLabel = levelInput?.value || 'พื้นฐาน';
  const skillLevel = LEVEL_MAP[levelLabel] || 'พื้นฐาน';

  const plos = [...document.querySelectorAll('.skill-plo')]
    .map(s => s.value)
    .filter(Boolean);
  const ploDescriptions = [...document.querySelectorAll('.skill-desc')]
    .map(i => i.value || '');
  const skillCategory = computeCategory(plos);

  const toISO = s => s ? (s.endsWith('Z') ? s : `${s}:00Z`) : s;

  // ===== อัปโหลดรูปไป S3 =====
  const fileInput = document.getElementById('image');
  let imageUrl = '';

  if (fileInput?.files?.[0]) {
    const file = fileInput.files[0];
    console.log('[DEBUG] file selected:', file.name, file.type, file.size);

    const { uploadUrl, objectUrl, contentType } = await getUploadUrl(file);
    console.log('[DEBUG] presign:', { uploadUrl, objectUrl, contentType });

    await putToS3(uploadUrl, file, contentType);
    imageUrl = objectUrl;
  } else {
    throw new Error('กรุณาเลือกไฟล์รูป');
  }

  // ===== payload ที่ส่งเข้า Lambda =====
  const payload = {
    name,
    description,
    startDateTime: toISO(startDateTime),
    endDateTime: toISO(endDateTime),
    locationId,
    locationName: document.querySelector('#locationId option:checked')?.textContent || '',
    skillCategory,
    plo: plos,
    ploDescriptions,
    level: skillLevel,
    skillLevel,
    yearLevel,
    requiredActivities,
    imageUrl,
    organizerId,
    skillId, 
  };

  console.log('[DEBUG] payload ก่อนส่งเข้า /activities:', payload);

  const result = await postActivity(payload);
  console.log('Create result:', result);

  const activityId =
    result?.activity?.activityId ||
    result?.activityId ||
    null;

  window.showSuccessPopup('บันทึกสำเร็จ', activityId);
}

// =========================
//  Bind Save Button
// =========================
const saveBtn = document.querySelector('.btn-primary');
if (saveBtn && !window.__ACHV_POST_BOUND__) {
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[DEBUG] กดปุ่มบันทึกแล้ว');

    try {
      const errors = validateAll();
      if (errors.length) {
        alert('กรุณากรอกให้ครบถ้วน');
        return;
      }
      await saveActivity();
    } catch (err) {
      console.error('[ERROR] ในการบันทึก', err);
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    }
  });
  window.__ACHV_POST_BOUND__ = true;
}

