// quiz.js (เวอร์ชันเชื่อมต่อระบบจริง)

const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timerInterval = null;
let skillId = null; // ตัวแปรสำคัญ: เอาไว้ส่งไปบอก Server

document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.studentId) {
        alert('กรุณาเข้าสู่ระบบ');
        window.location.href = 'login.html';
        return;
    }

    // รับค่าจาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const examUrl = urlParams.get('examUrl');
    skillId = urlParams.get('skillId'); // รับ ID วิชามาด้วย

    if (examUrl && skillId) {
        loadQuiz(examUrl);
    } else {
        showError('ข้อมูลข้อสอบไม่ครบถ้วน (ขาด skillId หรือ examUrl)');
    }
});

async function loadQuiz(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        questions = data.questions; 
        
        document.getElementById('quiz-title').textContent = data.examInfo?.title || 'แบบทดสอบ';
        document.getElementById('total-questions').textContent = questions.length;
        
        const timeLimit = data.examInfo?.timeLimitSeconds || 600;
        startTimer(timeLimit);
        renderQuestion();
    } catch (error) {
        showError('โหลดโจทย์ไม่สำเร็จ');
    }
}

function startTimer(seconds) {
    const timerElement = document.getElementById('timer');
    let timeLeft = seconds;
    timerInterval = setInterval(() => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerElement.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (timeLeft <= 0) { clearInterval(timerInterval); finishQuiz(); }
        timeLeft--;
    }, 1000);
}

function renderQuestion() {
    const container = document.getElementById('quiz-container');
    const q = questions[currentQuestionIndex];
    const selectedValue = userAnswers[q.id]; 

    let optionsHtml = '';
    q.choices.forEach((choice) => {
        // รองรับทั้งแบบ String ["A"] และ Object [{text:"A", id:"a"}]
        const choiceText = (typeof choice === 'object') ? choice.text : choice; 
        const choiceValue = (typeof choice === 'object') ? choice.id : choice; 

        const isChecked = (selectedValue == choiceValue) ? 'checked' : '';
        const isSelectedClass = (selectedValue == choiceValue) ? 'selected' : '';

        optionsHtml += `
            <label class="option ${isSelectedClass}" onclick="selectAnswer(${q.id}, '${choiceValue}')">
                <input type="radio" name="q_${q.id}" value="${choiceValue}" ${isChecked}>
                ${choiceText}
            </label>
        `;
    });

    container.innerHTML = `
        <div class="question-counter">ข้อที่ ${currentQuestionIndex + 1} / ${questions.length}</div>
        <div class="question-card">
            <div class="question-text">${q.question}</div>
            <div class="options-container">${optionsHtml}</div>
        </div>
        <div class="navigation">
            <button class="nav-btn btn-prev" onclick="prevQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>ก่อนหน้า</button>
            ${currentQuestionIndex === questions.length - 1 
                ? `<button class="nav-btn btn-submit" onclick="finishQuiz()">ส่งคำตอบ</button>` 
                : `<button class="nav-btn btn-next" onclick="nextQuestion()">ถัดไป</button>`
            }
        </div>
    `;
}

function selectAnswer(qId, val) { userAnswers[qId] = val; renderQuestion(); }
function nextQuestion() { if (currentQuestionIndex < questions.length - 1) { currentQuestionIndex++; renderQuestion(); } }
function prevQuestion() { if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestion(); } }

// ★★★ ฟังก์ชันส่งคำตอบ (ยิงเข้า Lambda เพื่อน) ★★★
async function finishQuiz() {
    clearInterval(timerInterval);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // --- 1. ตรวจคำตอบ (Debug Mode) ---
    let correctCount = 0;
    
    console.log("--- เริ่มตรวจคำตอบ ---");
    
    questions.forEach((q, index) => {
        const userAnswer = userAnswers[q.id]; // สิ่งที่ user ตอบ
        const correctAnswer = q.answer || q.correctAnswer; // เฉลย (รองรับทั้ง 2 ชื่อ)

        // แปลงทุกอย่างเป็น String และตัดช่องว่าง เพื่อให้เทียบกันได้ชัวร์ๆ
        const userStr = String(userAnswer).trim().toLowerCase();
        const correctStr = String(correctAnswer).trim().toLowerCase();
        
        // Debug: ปริ้นท์ออกมาดูเลยว่ามันเทียบอะไรกันอยู่
        console.log(`ข้อ ${index + 1}: User=[${userStr}] vs Ans=[${correctStr}]`);

        // กรณี 1: เฉลยเป็น Index (เช่น 0, 1, 2) แต่ User ตอบเป็น Text (หรือกลับกัน)
        // เราต้องเทียบกับ q.choices
        let isCorrect = false;

        if (userStr === correctStr) {
            isCorrect = true;
        } 
        // กรณีพิเศษ: ถ้าเฉลยเป็นตัวเลข (Index) แต่คำตอบเป็น Text
        else if (!isNaN(correctStr) && Array.isArray(q.choices)) {
             const correctIndex = parseInt(correctStr);
             const choiceTextAtIndext = String(q.choices[correctIndex]).trim().toLowerCase();
             if (userStr === choiceTextAtIndext) {
                 isCorrect = true;
             }
        }

        if (isCorrect) {
            correctCount++;
            console.log(" -> ✅ ถูกต้อง");
        } else {
            console.log(" -> ❌ ผิด");
        }
    });

    console.log(`คะแนนรวม: ${correctCount}/${questions.length}`);

    // คำนวณเปอร์เซ็นต์
    const total = questions.length;
    const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    const isPassed = percent >= 70; 

    // --- 2. เตรียมข้อมูลส่ง Server ---
    const answersPayload = questions.map(q => ({
        questionId: q.id.toString(),
        selectedAnswer: userAnswers[q.id] || ""
    }));

    const payload = {
        studentId: userData.studentId,
        skillId: skillId,
        answers: answersPayload,
        startedAt: new Date().toISOString(),
        score: percent,      
        isPassed: isPassed   
    };

    // แสดงหน้า Loading
    const modal = document.getElementById('result-modal');
    const icon = document.getElementById('result-icon');
    const btn = document.querySelector('.result-btn');

    modal.style.display = 'flex';
    document.getElementById('result-title').textContent = "กำลังส่งผลสอบ";
    document.getElementById('result-message').textContent = "กรุณารอสักครู่";
    document.getElementById('result-score').textContent = ""; 
    
    // ซ่อนอิโมจิและปุ่มชั่วคราว
    if(icon) icon.style.display = 'none'; 
    if(btn) btn.style.display = 'none';   

    try {
        // ยิง API
        const response = await fetch(`${API_BASE_URL}/quiz/submit`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            // ✅ แก้แล้ว: ให้โชว์คะแนนที่ Frontend คำนวณเอง (percent) ไม่ต้องสน Server
            showResultModal({
                score: percent,        // ใช้ตัวแปร percent ของเราเอง
                isPassed: isPassed,    // ใช้ตัวแปร isPassed ของเราเอง
                message: isPassed ? "บันทึกผลเรียบร้อย" : "บันทึกผลเรียบร้อย (พยายามใหม่นะ)"
            });
        } else {
            // ถ้า Server พัง ก็ยังโชว์คะแนนให้ user ชื่นใจก่อน
            alert('บันทึก Server ไม่สำเร็จ แต่ผลสอบของคุณคือ: ' + percent + '%');
            showResultModal({
                score: percent,
                isPassed: isPassed,
                message: "ผลการสอบ (Offline Mode)"
            });
        }
    } catch (error) {
        console.error(error);
        alert('เชื่อมต่อ Server ไม่ได้ (คะแนนของคุณคือ: ' + percent + '%)');
        // บังคับโชว์ผลเลย แม้เน็ตหลุด
        showResultModal({ 
            score: percent, 
            isPassed: isPassed, 
            message: isPassed ? "ยินดีด้วย (บันทึกไม่ได้)" : "เสียใจด้วย (บันทึกไม่ได้)" 
        });
    }
}

function showResultModal(data) {
    const title = document.getElementById('result-title');
    const scoreText = document.getElementById('result-score');
    const msg = document.getElementById('result-message');
    const icon = document.getElementById('result-icon');
    const btn = document.querySelector('.result-btn');

    // ★★★ สั่งให้ปุ่มและไอคอนกลับมาโชว์ ★★★
    if(icon) icon.style.display = 'block';
    if(btn) btn.style.display = 'inline-block';

    scoreText.textContent = `${data.score}%`;
    msg.textContent = data.message; 

    if (data.isPassed) {
        title.textContent = "ยินดีด้วย! สอบผ่าน";
        title.style.color = "green";
        icon.textContent = "🎉";
    } else {
        title.textContent = "เสียใจด้วย สอบไม่ผ่าน";
        title.style.color = "red";
        icon.textContent = "😔";
    }
}

function goToDashboard() { window.location.href = 'quiz-categories.html'; }
function showError(msg) { document.getElementById('quiz-container').innerHTML = `<div class="error">${msg}</div>`; }