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
const addSkillWrap       = document.getElementById('add-skill-wrap'); // wrapper ของปุ่ม
const skillCategoryInput = document.getElementById('skillCategory');
const ploHidden          = document.getElementById('plo');
const ploDescHidden      = document.getElementById('ploDescriptions');

const MAX_ROWS = 4; // รวมแถวแรก (fixed)

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
      // กันไม่ให้ลบจนเหลือ 0 แถว
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
const form = document.getElementById('edit-activity-form') || document.querySelector('form');

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
    alert('ต้องมีแถวทักษะอย่างน้อย 1 แถว');
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
      invalidate(sel, 'กรุณาเลือก PLO');
    }
    if (desc && !desc.value.trim()) {
      valid = false;
      if (!firstInvalid) firstInvalid = desc;
      invalidate(desc, 'กรุณากรอกคำอธิบายทักษะ');
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

// ==========================
// 1) Preview รูปใน .upload-area
// ==========================
(function setupImagePreview() {
  const uploadArea = document.querySelector('.upload-area');
  const fileInput  = uploadArea?.querySelector('input[type="file"]');
  const hintEl     = uploadArea?.querySelector('.hint');

  if (!uploadArea || !fileInput) return;

  // สร้าง/อัปเดตรูป preview
  function renderPreview(file) {
    // ลบรูปเดิมถ้ามี
    const old = uploadArea.querySelector('.upload-preview');
    if (old) old.remove();

    if (!file) {
      // ไม่มีไฟล์ -> คืนค่า UI เดิม
      if (hintEl) hintEl.style.display = '';
      return;
    }

    // เงื่อนไข: ต้องเป็นไฟล์รูปภาพ
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกเฉพาะไฟล์รูปภาพ');
      fileInput.value = '';
      if (hintEl) hintEl.style.display = '';
      return;
    }

    // สร้าง <img> แสดงตัวอย่าง
    const img = document.createElement('img');
    img.className = 'upload-preview';
    Object.assign(img.style, {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'cover',
      position: 'absolute',
      inset: '0',
      margin: 'auto',
      borderRadius: '16px'
    });

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      uploadArea.appendChild(img);
      if (hintEl) hintEl.style.display = 'none'; // ซ่อน hint
    };
    reader.readAsDataURL(file);
  }

  // เปลี่ยนไฟล์ -> แสดง preview
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    renderPreview(file);
  });
})();

// ==========================================
// 2) ตรวจสอบ input ทุกฟิลด์ + สรุปข้อที่ขาด
//    (รวมรูปภาพ, เวลาเริ่ม-สิ้นสุด, radio "ระดับ",
//     dropdown "กลุ่มกิจกรรม/ชั้นปี", PLO/คำอธิบายทักษะ)
// ==========================================
(function setupValidationAndSaveFlow() {
  const form       = document.getElementById('edit-activity-form') || document.querySelector('form');
  const saveBtn    = document.querySelector('.btn-primary'); // ปุ่มบันทึกที่อยู่นอก <form>
  const fileInput  = document.querySelector('.upload-area input[type="file"]');
  const titleEl    = document.getElementById('title');
  const descEl     = document.getElementById('desc');
  const startEl    = document.getElementById('start');
  const endEl      = document.getElementById('end');
  const placeEl    = document.getElementById('place');
  const hostEl     = document.getElementById('host');
  const groupEl    = document.getElementById('group');
  const yearEl     = document.getElementById('year');

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
    fileInput, titleEl, descEl, startEl, endEl, placeEl, hostEl, groupEl, yearEl
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
      if (!ok) errors.push('ทักษะ (PLO และคำอธิบาย)');
      return ok;
    }

    // fallback แบบเบา ๆ : ทุกแถวต้องเลือก PLO และกรอกคำอธิบาย
    let valid = true;
    document.querySelectorAll('.skill-row').forEach(row => {
      const sel  = row.querySelector('.skill-plo');
      const desc = row.querySelector('.skill-desc');
      if (sel && !sel.value)    { valid = false; markInvalid(sel); }
      if (desc && !desc.value?.trim()) { valid = false; markInvalid(desc); }
    });
    if (!valid) errors.push('ทักษะ (PLO และคำอธิบาย)');
    return valid;
  }

  // ตรวจสอบทุกช่อง
  function validateAll() {
    const errors = [];

    // 2.1 ไฟล์รูป
    if (!fileInput || !(fileInput.files && fileInput.files[0])) {
      errors.push('รูปภาพกิจกรรม');
      markInvalid(fileInput);
    } else if (!fileInput.files[0].type.startsWith('image/')) {
      errors.push('รูปภาพกิจกรรม (ต้องเป็นไฟล์รูปภาพเท่านั้น)');
      markInvalid(fileInput);
    }

    // 2.2 ฟิลด์ข้อความหลัก
    if (!titleEl?.value.trim()) { errors.push('ชื่อกิจกรรม'); markInvalid(titleEl); }
    if (!descEl?.value.trim())  { errors.push('รายละเอียด');  markInvalid(descEl); }
    if (!placeEl?.value.trim()) { errors.push('สถานที่');     markInvalid(placeEl); }
    if (!hostEl?.value.trim())  { errors.push('ผู้จัด');       markInvalid(hostEl); }

    // 2.3 วันเวลา (ต้องไม่ว่าง และ end >= start)
    const startVal = startEl?.value;
    const endVal   = endEl?.value;
    if (!startVal) { errors.push('เวลาเริ่มจัดกิจกรรม'); markInvalid(startEl); }
    if (!endVal)   { errors.push('เวลาสิ้นสุดกิจกรรม'); markInvalid(endEl); }
    if (startVal && endVal) {
      const s = new Date(startVal).getTime();
      const e = new Date(endVal).getTime();
      if (!isFinite(s) || !isFinite(e) || e < s) {
        errors.push('ช่วงเวลา (สิ้นสุดต้องไม่ก่อนเวลาเริ่ม)');
        markInvalid(startEl);
        markInvalid(endEl);
      }
    }

    // 2.4 กลุ่มกิจกรรม/ชั้นปี
    if (!groupEl?.value) { errors.push('กลุ่มกิจกรรม'); markInvalid(groupEl); }
    if (!yearEl?.value)  { errors.push('ชั้นปีที่เหมาะสม'); markInvalid(yearEl); }

    // 2.5 ระดับ (radio name="level")
    const levelChecked = !!document.querySelector('input[name="level"]:checked');
    if (!levelChecked) {
      errors.push('ระดับกิจกรรม');
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
  function showSuccessPopup(message = 'บันทึกสำเร็จ') {
    // โมดัลเล็ก ๆ แบบไม่พึ่ง CSS เพิ่ม
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
    box.innerHTML = `<div style="font-weight:700;font-size:18px;margin-bottom:8px">${message}</div>
                     <div style="margin-bottom:16px;color:#4b5563">ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว</div>`;

    const okBtn = document.createElement('button');
    okBtn.textContent = 'ตกลง';
    Object.assign(okBtn.style, {
      padding: '8px 20px', borderRadius: '999px', border: '0',
      background: 'linear-gradient(90deg, #50E486 0%, #27C4B7 100%)',
      color: '#fff', fontWeight: 800, cursor: 'pointer'
    });
    okBtn.addEventListener('click', () => overlay.remove());

    box.appendChild(okBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  if (saveBtn && !window.__ACHV_bindSaveClick__) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault(); // ปุ่มอยู่นอกฟอร์ม → จัดการเองทั้งหมดที่นี่

      // เคลียร์ invalid เดิม ๆ
      document.querySelectorAll('.invalid').forEach(el => clearInvalid(el));

      const errors = validateAll();
      if (errors.length) {
        // สรุปข้อที่ยังไม่กรอก/ไม่ผ่าน
        alert('กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วน:\n• ' + errors.join('\n• '));
        // โฟกัสรายการแรกที่ผิดถ้าหาได้
        const firstInvalid = document.querySelector('.invalid, .upload-area input[type="file"].invalid');
        if (firstInvalid && firstInvalid.scrollIntoView) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // ผ่านทุกอย่าง → โชว์ป๊อปอัปสำเร็จ
      showSuccessPopup('บันทึกสำเร็จ');
      // ถ้าต้อง submit ฟอร์มจริง ให้ uncomment บรรทัดนี้:
      // form?.submit();
    });
    window.__ACHV_bindSaveClick__ = true;
  }
})();

(function enhanceUploadArea() {
  const uploadArea = document.querySelector('.upload-area');
  const fileInput  = uploadArea?.querySelector('input[type="file"]');
  const hintEl     = uploadArea?.querySelector('.hint'); // ปุ่ม/ป้าย "เพิ่มรูปภาพกิจกรรม"

  if (!uploadArea || !fileInput || !hintEl) return;

  // จัดวางชั้น (z-index) ให้คลิกได้เสมอ
  Object.assign(uploadArea.style, { position: 'relative', overflow: 'hidden' });
  Object.assign(hintEl.style, {
    position: 'absolute',
    left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 3,  // ให้อยู่เหนือรูป preview
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
    const old = uploadArea.querySelector('.upload-preview');
    if (old) old.remove();

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกเฉพาะไฟล์รูปภาพ');
      fileInput.value = '';
      return;
    }

    const img = document.createElement('img');
    img.className = 'upload-preview';
    Object.assign(img.style, {
      position: 'absolute', inset: 0, margin: 'auto',
      maxWidth: '100%', maxHeight: '100%',
      objectFit: 'cover', borderRadius: '16px',
      zIndex: 1 // ใต้ปุ่ม hint
    });

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      uploadArea.appendChild(img);
      // ✅ ไม่ซ่อน hintEl — ปล่อยให้ลอยอยู่ด้านบนตลอด
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    renderPreview(file);
  });
})();

