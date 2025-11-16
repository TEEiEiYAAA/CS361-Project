// quiz.js (Final: แจ้งเตือนสีแดง + เกณฑ์ 80% + ป้องกันข้ามข้อ)

const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timerInterval = null;
let skillId = null; 

document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.studentId) {
        alert('กรุณาเข้าสู่ระบบ');
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const examUrl = urlParams.get('examUrl');
    skillId = urlParams.get('skillId'); 

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
        
        // อัปเดต UI แสดงเกณฑ์ผ่านให้ตรงกัน
        const passCriteriaEl = Array.from(document.querySelectorAll('.info-label')).find(el => el.textContent.includes('เกณฑ์ผ่าน'));
        if (passCriteriaEl && passCriteriaEl.nextElementSibling) {
            passCriteriaEl.nextElementSibling.textContent = "80%";
        }
        
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
        
        if (timeLeft <= 0) { 
            clearInterval(timerInterval); 
            finishQuiz(true); // หมดเวลา
        }
        timeLeft--;
    }, 1000);
}

function renderQuestion() {
    const container = document.getElementById('quiz-container');
    const q = questions[currentQuestionIndex];
    const selectedValue = userAnswers[q.id]; 

    let optionsHtml = '';
    q.choices.forEach((choice) => {
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

    // ★★★ เพิ่ม div id="question-error" สำหรับแสดงข้อความเตือน ★★★
    container.innerHTML = `
        <div class="question-counter">ข้อที่ ${currentQuestionIndex + 1} / ${questions.length}</div>
        <div class="question-card">
            <div class="question-text">${q.question}</div>
            <div class="options-container">${optionsHtml}</div>
        </div>

        <div id="question-error" style="color: #dc3545; text-align: center; font-weight: bold; height: 24px; margin-bottom: 10px;"></div>

        <div class="navigation">
            <button class="nav-btn btn-prev" onclick="prevQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>ก่อนหน้า</button>
            ${currentQuestionIndex === questions.length - 1 
                ? `<button class="nav-btn btn-submit" onclick="trySubmitQuiz()">ส่งคำตอบ</button>` 
                : `<button class="nav-btn btn-next" onclick="nextQuestion()">ถัดไป</button>`
            }
        </div>
    `;
}

function selectAnswer(qId, val) { 
    userAnswers[qId] = val; 
    
    // ★★★ เมื่อเลือกคำตอบปุ๊บ ให้ลบข้อความเตือนออกทันที ★★★
    const errorDiv = document.getElementById('question-error');
    if(errorDiv) errorDiv.textContent = '';

    renderQuestion(); 
}

function nextQuestion() { 
    const currentQ = questions[currentQuestionIndex];
    // ★★★ เปลี่ยนจาก alert เป็นแสดงข้อความใน div ★★★
    if (!userAnswers[currentQ.id]) {
        const errorDiv = document.getElementById('question-error');
        if(errorDiv) {
            errorDiv.textContent = "⚠️ กรุณาเลือกคำตอบก่อนไปข้อถัดไป";
            // เพิ่มลูกเล่นสั่นๆ
            errorDiv.style.transition = "0.1s";
            errorDiv.style.transform = "translateX(5px)";
            setTimeout(() => errorDiv.style.transform = "translateX(-5px)", 100);
            setTimeout(() => errorDiv.style.transform = "translateX(0)", 200);
        }
        return; 
    }
    
    if (currentQuestionIndex < questions.length - 1) { 
        currentQuestionIndex++; 
        renderQuestion(); 
    } 
}

function prevQuestion() { 
    if (currentQuestionIndex > 0) { 
        currentQuestionIndex--; 
        renderQuestion(); 
    } 
}

function trySubmitQuiz() {
    const currentQ = questions[currentQuestionIndex];
    // ★★★ เปลี่ยนจาก alert เป็นแสดงข้อความใน div ★★★
    if (!userAnswers[currentQ.id]) {
        const errorDiv = document.getElementById('question-error');
        if(errorDiv) errorDiv.textContent = "⚠️ กรุณาเลือกคำตอบข้อนี้ก่อนส่ง";
        return;
    }
    if(confirm('ยืนยันที่จะส่งคำตอบหรือไม่?')) {
        finishQuiz();
    }
}

async function finishQuiz(isTimeOut = false) {
    clearInterval(timerInterval);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    let correctCount = 0;
    console.log("--- เริ่มตรวจคำตอบ ---");
    
    questions.forEach((q) => {
        const userAnswer = userAnswers[q.id]; 
        const correctAnswer = q.answer || q.correctAnswer;

        const userStr = String(userAnswer || "").trim().toLowerCase();
        const correctStr = String(correctAnswer || "").trim().toLowerCase();
        
        let isCorrect = false;
        if (userStr === correctStr) {
            isCorrect = true;
        } else if (!isNaN(correctStr) && Array.isArray(q.choices)) {
             const correctIndex = parseInt(correctStr);
             const choiceTextAtIndext = String(q.choices[correctIndex]).trim().toLowerCase();
             if (userStr === choiceTextAtIndext) isCorrect = true;
        }

        if (isCorrect) correctCount++;
    });

    const total = questions.length;
    const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    
    const isPassed = percent >= 80; // เกณฑ์ 80%

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

    // แสดงหน้า Loading แบบ Clean
    const modal = document.getElementById('result-modal');
    const icon = document.getElementById('result-icon');
    const btn = document.querySelector('.result-btn');

    modal.style.display = 'flex';
    document.getElementById('result-title').textContent = isTimeOut ? "หมดเวลา!" : "กำลังส่งผลสอบ";
    document.getElementById('result-message').textContent = "กรุณารอสักครู่ ระบบกำลังบันทึกคะแนน...";
    document.getElementById('result-score').textContent = ""; 
    
    if(icon) icon.style.display = 'none'; 
    if(btn) btn.style.display = 'none';   

    try {
        const response = await fetch(`${API_BASE_URL}/quiz/submit`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showResultModal({
                score: percent,
                isPassed: isPassed,
                message: isPassed ? "บันทึกผลเรียบร้อย" : `คุณทำได้ ${percent}% (เกณฑ์ผ่าน 80%) พยายามใหม่นะ`
            });
        } else {
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
        showResultModal({ 
            score: percent, 
            isPassed: isPassed, 
            message: "บันทึกไม่ได้ (ตรวจสอบอินเทอร์เน็ต)" 
        });
    }
}

function showResultModal(data) {
    const title = document.getElementById('result-title');
    const scoreText = document.getElementById('result-score');
    const msg = document.getElementById('result-message');
    const icon = document.getElementById('result-icon');
    const btn = document.querySelector('.result-btn');

    if(icon) icon.style.display = 'block';
    if(btn) btn.style.display = 'inline-block';

    scoreText.textContent = `${data.score}%`;
    msg.textContent = data.message; 

    if (data.isPassed) {
        title.textContent = "ยินดีด้วย! สอบผ่าน";
        title.style.color = "green";
        icon.textContent = "🎉";
    } else {
        title.textContent = "สอบไม่ผ่าน";
        title.style.color = "red";
        icon.textContent = "😔";
    }
}

function goToDashboard() { window.location.href = 'quiz-categories.html'; }
function showError(msg) { document.getElementById('quiz-container').innerHTML = `<div class="error">${msg}</div>`; }