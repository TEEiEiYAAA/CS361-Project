   // Configuration
    const API_BASE_URL = 'https://mb252cstbb.execute-api.us-east-1.amazonaws.com/prod';
    
    // Global variables
    let currentUser = null;
    let skillId = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let answers = {};
    let startTime = null;
    let timeLimit = 15; // minutes
    let timerInterval = null;
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      // Check login
      currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
      if (!currentUser.studentId && !currentUser.userId) {
        window.location.href = 'login.html';
        return;
      }
      
      // Get skillId from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      skillId = urlParams.get('skillId');
      
      if (!skillId) {
        showError('ไม่พบข้อมูลทักษะ');
        return;
      }
      
      loadQuiz();
    });
    
    // Load quiz questions
    async function loadQuiz() {
      try {
        const studentId = currentUser.studentId || currentUser.userId;
        const response = await fetch(`${API_BASE_URL}/quiz/questions/${skillId}?studentId=${studentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'ไม่สามารถโหลดแบบทดสอบได้');
        }
        
        const data = await response.json();
        questions = data.questions;
        timeLimit = data.timeLimit || 15;
        
        // Update UI with skill name from API
        const skillName = data.skillName || getSkillName(skillId);
        document.getElementById('quiz-title').textContent = `แบบทดสอบ${skillName}`;
        document.getElementById('quiz-description').textContent = `ทำแบบทดสอบเพื่อรับรองทักษะ${skillName}`;
        document.getElementById('total-questions').textContent = questions.length;
        
        // Start quiz
        startQuiz();
        
      } catch (error) {
        console.error('Error loading quiz:', error);
        showError(error.message);
      }
    }
    
    // Start quiz
    function startQuiz() {
      startTime = new Date().toISOString();
      currentQuestionIndex = 0;
      answers = {};
      
      renderQuestion();
      startTimer();
    }
    
    // Render current question
    function renderQuestion() {
      if (currentQuestionIndex >= questions.length) {
        submitQuiz();
        return;
      }
      
      const question = questions[currentQuestionIndex];
      const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
      
      const html = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        
        <div class="quiz-content">
          <div class="question-counter">
            คำถามที่ ${currentQuestionIndex + 1} จาก ${questions.length}
          </div>
          
          <div class="question-card">
            <div class="question-text">${question.question}</div>
            <div class="options-container">
              ${question.options.map((option, index) => `
                <label class="option ${answers[question.questionId] === option ? 'selected' : ''}" onclick="selectAnswer('${question.questionId}', '${option}')">
                  <input type="radio" name="q${currentQuestionIndex}" value="${option}" ${answers[question.questionId] === option ? 'checked' : ''}>
                  ${option}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="navigation">
          <button class="nav-btn btn-prev" onclick="previousQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
            ← ก่อนหน้า
          </button>
          
          <span>${currentQuestionIndex + 1} / ${questions.length}</span>
          
          ${currentQuestionIndex === questions.length - 1 ? 
            '<button class="nav-btn btn-submit" onclick="confirmSubmit()">ส่งคำตอบ</button>' :
            '<button class="nav-btn btn-next" onclick="nextQuestion()">ถัดไป →</button>'
          }
        </div>
      `;
      
      document.getElementById('quiz-container').innerHTML = html;
    }
    
    // Select answer
    function selectAnswer(questionId, answer) {
      answers[questionId] = answer;
      renderQuestion(); // Re-render to update selected state
    }
    
    // Navigation functions
    function nextQuestion() {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
      }
    }
    
    function previousQuestion() {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
      }
    }
    
    // Timer functions
    function startTimer() {
      const endTime = new Date(Date.now() + timeLimit * 60 * 1000);
      
      timerInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          submitQuiz(); // Auto submit when time runs out
          return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        document.getElementById('timer').textContent = 
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Warning when less than 2 minutes
        if (timeLeft < 120000) {
          document.getElementById('timer').parentElement.style.background = '#ff6b6b';
        }
      }, 1000);
    }
    
    // Confirm submit
    function confirmSubmit() {
      const unanswered = questions.filter(q => !answers[q.questionId]).length;
      
      if (unanswered > 0) {
        if (!confirm(`คุณยังไม่ได้ตอบ ${unanswered} ข้อ ต้องการส่งคำตอบหรือไม่?`)) {
          return;
        }
      }
      
      submitQuiz();
    }
    
    // Submit quiz
    async function submitQuiz() {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      try {
        // Show loading
        document.getElementById('quiz-container').innerHTML = `
          <div class="loading">กำลังตรวจคำตอบ...</div>
        `;
        
        // Prepare answers array
        const answersArray = questions.map(q => ({
          questionId: q.questionId,
          selectedAnswer: answers[q.questionId] || null
        }));
        
        const response = await fetch(`${API_BASE_URL}/quiz/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            studentId: currentUser.studentId || currentUser.userId,
            skillId: skillId,
            answers: answersArray,
            startedAt: startTime
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'ไม่สามารถส่งคำตอบได้');
        }
        
        const result = await response.json();
        showResult(result);
        
      } catch (error) {
        console.error('Error submitting quiz:', error);
        showError('เกิดข้อผิดพลาดในการส่งคำตอบ: ' + error.message);
      }
    }
    
    // Show result
    function showResult(result) {
      // ปิด beforeunload event เพราะแบบทดสอบจบแล้ว
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      const modal = document.getElementById('result-modal');
      const icon = document.getElementById('result-icon');
      const title = document.getElementById('result-title');
      const score = document.getElementById('result-score');
      const message = document.getElementById('result-message');
      
      if (result.isPassed) {
        icon.textContent = '🎉';
        title.textContent = 'ยินดีด้วย!';
        title.className = 'result-title passed';
        score.textContent = `${result.score}%`;
        score.className = 'result-score passed';
        message.innerHTML = `
          คุณผ่านการทดสอบแล้ว!<br>
          ตอบถูก ${result.correctAnswers} จาก ${result.totalQuestions} ข้อ<br>
          <strong>🏆 คุณได้รับทักษะนี้แล้ว!</strong>
        `;
      } else {
        icon.textContent = '😔';
        title.textContent = 'เสียใจด้วย';
        title.className = 'result-title failed';
        score.textContent = `${result.score}%`;
        score.className = 'result-score failed';
        message.innerHTML = `
          คุณยังไม่ผ่านการทดสอบ<br>
          ตอบถูก ${result.correctAnswers} จาก ${result.totalQuestions} ข้อ<br>
          ต้องการคะแนน 70% เพื่อผ่าน<br>
          <em>💪 สามารถทำแบบทดสอบใหม่ได้</em>
        `;
      }
      
      modal.style.display = 'flex';
    }
    
    // Show error
    function showError(message) {
      document.getElementById('quiz-container').innerHTML = `
        <div class="error">
          <h3>⚠️ เกิดข้อผิดพลาด</h3>
          <p>${message}</p>
          <button class="nav-btn btn-next" onclick="goToDashboard()" style="margin-top: 1rem;">
            กลับหน้าหลัก
          </button>
        </div>
      `;
    }
    
    // Go to dashboard
    function goToDashboard() {
      // ปิด beforeunload event ก่อนไปหน้าอื่น
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.location.href = 'student-dashboard.html';
    }
    
    // Get skill name (fallback)
    function getSkillName(skillId) {
      const skillNames = {
        'skill002': 'ด้านทักษะการเขียนโปรแกรม',
        'skill005': 'ด้านทักษะการสื่อสาร', 
        'skill006': 'ด้านลักษณะบุคคลผู้มีภาวะผู้นำ',
        'skill009': 'ด้านทักษะการแก้ไขปัญหา'
      };
      return skillNames[skillId] || 'ทักษะ';
    }
    
    // Prevent page refresh during quiz
    function handleBeforeUnload(e) {
      if (questions.length > 0 && currentQuestionIndex < questions.length) {
        e.preventDefault();
        e.returnValue = 'คุณกำลังทำแบบทดสอบอยู่ ต้องการออกจากหน้านี้หรือไม่?';
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload);
