let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentQuizSessionId = null;
let selectedGameModeName = null;
let timerInterval = null;
let timeLeft = 60; // segundos para modo cronometro
let lives = 3; // vidas para modo maratona

// Elementos DOM
const questionText = document.getElementById('question-text');
const answersList = document.getElementById('answers-list');
const scoreDisplay = document.getElementById('score');
const nextButton = document.getElementById('next-button');
const timerDiv = document.getElementById('timer');
const timeLeftSpan = document.getElementById('time-left');
const livesDiv = document.getElementById('lives');
const lifeCountSpan = document.getElementById('life-count');

nextButton.style.display = 'none';

// Função para iniciar o quiz (chamada do index.html)
window.startQuiz = async function(gameModeName, catId) {
  selectedGameModeName = gameModeName;

  // Inicializa vidas e tempo
  if (selectedGameModeName === 'cronometro') {
    timeLeft = 60; // ou o tempo que quiser
    timerDiv.classList.remove('hidden');
    livesDiv.classList.add('hidden');
    timeLeftSpan.innerText = timeLeft;
    startTimer();
  } else if (selectedGameModeName === 'maratona') {
    lives = 3;
    livesDiv.classList.remove('hidden');
    timerDiv.classList.add('hidden');
    lifeCountSpan.innerText = lives;
  } else {
    timerDiv.classList.add('hidden');
    livesDiv.classList.add('hidden');
  }

  // Inicia sessão no backend
  currentQuizSessionId = await startQuizSession(gameModeName);
  if (!currentQuizSessionId) return;

  try {
    const res = await fetch(`/questions?category_id=${catId}`, { credentials: 'include' });
    if (res.status === 401) {
      alert('Você precisa estar logado para jogar. Faça login.');
      window.location.href = '/';
      return;
    }
    if (!res.ok) throw new Error('Erro ao carregar perguntas');

    const data = await res.json();

    questions = data.map(q => {
      const correctAnswerObj = q.answers.find(a => a.is_correct);
      return {
        question: q.text,
        answers: q.answers.map(a => a.text),
        correctAnswer: correctAnswerObj ? correctAnswerObj.text : null
      };
    }).filter(q => q.correctAnswer !== null);

    if (questions.length === 0) {
      alert('Nenhuma pergunta válida encontrada para essa categoria.');
      return;
    }

    questions = shuffle(questions);
    currentQuestionIndex = 0;
    score = 0;
    scoreDisplay.innerText = score;

    document.getElementById("quiz-container").classList.remove("hidden");
    document.getElementById("category-select").classList.add("hidden");
    document.getElementById("mode-select").classList.add("hidden");

    loadQuestion();
  } catch (err) {
    alert('Erro ao carregar perguntas: ' + err.message);
  }
};

// Timer do modo cronometro
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeLeftSpan.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert(`Tempo esgotado! Sua pontuação final foi: ${score}`);
      finishQuiz();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// Função para carregar a pergunta atual
function loadQuestion() {
  if (currentQuestionIndex >= questions.length) {
    alert(`Parabéns! Você venceu o quiz!\nPontuação final: ${score}`);
    finishQuiz();
    return;
  }

  const q = questions[currentQuestionIndex];
  questionText.innerText = q.question;

  const shuffledAnswers = shuffle([...q.answers]);
  answersList.innerHTML = '';

  shuffledAnswers.forEach(answer => {
    const li = document.createElement('li');
    li.innerText = answer;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => checkAnswer(answer));
    answersList.appendChild(li);
  });

  nextButton.style.display = 'none';
}

function checkAnswer(selectedAnswer) {
  const q = questions[currentQuestionIndex];
  const answerItems = answersList.querySelectorAll('li');

  answerItems.forEach(li => {
    li.style.pointerEvents = "none";
    if (li.innerText === q.correctAnswer) li.classList.add('correct');
    if (li.innerText === selectedAnswer && selectedAnswer !== q.correctAnswer) li.classList.add('incorrect');
  });

  if (selectedAnswer === q.correctAnswer) {
    score++;
    scoreDisplay.innerText = score;
  } else {
    if (selectedGameModeName === 'maratona') {
      lives--;
      lifeCountSpan.innerText = lives;
      if (lives <= 0) {
        alert('Suas vidas acabaram! Fim do jogo.');
        finishQuiz();
        return;
      }
    }
    // No modo cronometro, não perde vida, só não pontua
  }

  currentQuestionIndex++;

  if (currentQuestionIndex < questions.length) {
    nextButton.style.display = "inline-block";
  } else {
    setTimeout(() => {
      alert("🎉 Quiz concluído!\nPontuação final: " + score);
      finishQuiz();
    }, 1000);
  }
}

nextButton.addEventListener('click', () => {
  loadQuestion();
});

// Finaliza o quiz (envia score, limpa estado, etc)
async function finishQuiz() {
  stopTimer();

  await sendScore(score, null);

  if (currentQuizSessionId) {
    await endQuizSession(currentQuizSessionId);
    currentQuizSessionId = null;
  }

  resetGame();
}

// Função para resetar o jogo
function resetGame() {
  score = 0;
  currentQuestionIndex = 0;
  scoreDisplay.innerText = score;

  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById('category-select').classList.remove('hidden');
  document.getElementById('mode-select').classList.remove('hidden');
  nextButton.style.display = "none";

  timerDiv.classList.add('hidden');
  livesDiv.classList.add('hidden');

  stopTimer();
}

function shuffle(array) {
  let currentIndex = array.length, temp, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    temp = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temp;
  }
  return array;
}

// Funções para comunicação backend (idem seu script original)
async function sendScore(score, game_mode_id = null) {
  try {
    const res = await fetch('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ score })
    });

    if (res.status === 401) {
      alert('Sua sessão expirou. Faça login novamente.');
      window.location.href = '/';
      return;
    }
  } catch (e) {
    console.error('Falha ao enviar score:', e);
  }
}

async function startQuizSession(game_mode_name) {
  try {
    const res = await fetch('/quiz_sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ game_mode_name })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Erro ao iniciar sessão do quiz.');
    }
    const data = await res.json();
    return data.session_id;
  } catch (error) {
    alert('Erro ao iniciar sessão do quiz: ' + error.message);
    return null;
  }
}

async function endQuizSession(sessionId) {
  try {
    const res = await fetch(`/quiz_sessions/${sessionId}/end`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Erro ao finalizar sessão do quiz.');
    }
  } catch (error) {
    console.error('Erro ao finalizar sessão:', error.message);
  }
}

// Reset botão
document.getElementById('btn-reset').addEventListener('click', () => {
  resetGame();
  if (currentQuizSessionId) {
    endQuizSession(currentQuizSessionId);
    currentQuizSessionId = null;
  }
});

// Tema escuro
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.innerText = document.body.classList.contains('dark') ? "☀️ Modo Claro" : "🌙 Modo Escuro";
});

document.getElementById('btn-leaderboard').addEventListener('click', () => {
  window.location.href = '/leaderboard.html';
});
document.getElementById('btn-friends').addEventListener('click', () => {
  window.location.href = '/friends.html';
});
