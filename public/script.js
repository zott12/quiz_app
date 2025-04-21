const questionsOriginal = [
    {
      question: "Qual é a capital do Brasil?",
      answers: ["Brasília", "Rio de Janeiro", "São Paulo", "Salvador"],
      correctAnswer: "Brasília"
    },
    {
      question: "Quem pintou a Mona Lisa?",
      answers: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
      correctAnswer: "Leonardo da Vinci"
    },
    {
      question: "Qual é o maior planeta do sistema solar?",
      answers: ["Terra", "Júpiter", "Saturno", "Netuno"],
      correctAnswer: "Júpiter"
    },
    {
      question: "Qual é a fórmula da água?",
      answers: ["H2O", "CO2", "NaCl", "O2"],
      correctAnswer: "H2O"
    }
  ];

  const allQuestions = {
    esportes: {
      futebol: [
        {
          question: "Quantos jogadores um time de futebol tem em campo?",
          answers: ["9", "10", "11", "12"],
          correctAnswer: "11"
        },
        {
          question: "Qual país venceu a Copa do Mundo de 2002?",
          answers: ["Alemanha", "Brasil", "Argentina", "França"],
          correctAnswer: "Brasil"
        }
      ]
    },
    ciencia: {
      astronomia: [
        {
          question: "Qual é o planeta mais próximo do Sol?",
          answers: ["Terra", "Vênus", "Mercúrio", "Marte"],
          correctAnswer: "Mercúrio"
        },
        {
          question: "Quantos planetas existem no Sistema Solar?",
          answers: ["7", "8", "9", "10"],
          correctAnswer: "8"
        }
      ]
    }
  };
  

  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  
  async function sendScore(score) {
    try {
      await fetch('/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      });
    } catch (e) {
      console.error('Falha ao enviar score:', e);
    }
  }
  
  const questionText = document.getElementById('question-text');
  const answersList  = document.getElementById('answers-list');
  const scoreDisplay = document.getElementById('score');
  const nextButton   = document.getElementById('next-button');
  const categorySelect = document.getElementById('category');
  const subcategorySelect = document.getElementById('subcategory');
  const startQuizBtn = document.getElementById('start-quiz');
  const quizContainer = document.getElementById('quiz');

  
  categorySelect.addEventListener('change', () => {
    const selected = categorySelect.value;
    subcategorySelect.innerHTML = '<option value="">-- Selecione --</option>';
  
    if (selected === 'esportes') {
      subcategorySelect.innerHTML += '<option value="futebol">Futebol</option>';
      subcategorySelect.style.display = 'inline-block';
    } else if (selected === 'ciencia') {
      subcategorySelect.innerHTML += '<option value="astronomia">Astronomia</option>';
      subcategorySelect.style.display = 'inline-block';
    } else {
      subcategorySelect.style.display = 'none'; // Oculta subcategoria em “Geral”
    }
  });
  

  startQuizBtn.addEventListener('click', () => {
    const cat = categorySelect.value;
    const sub = subcategorySelect.value;
  
    if (!cat) {
      alert("Selecione uma categoria!");
      return;
    }
  
    if (cat === 'geral') {
      questions = shuffle([...questionsOriginal]);
    } else {
      if (!sub) {
        alert("Selecione uma subcategoria!");
        return;
      }
      questions = shuffle([...allQuestions[cat][sub]]);
    }
  
    currentQuestionIndex = 0;
    score = 0;
    scoreDisplay.innerText = score;
  
    quizContainer.style.display = "block";
    loadQuestion();
  });
  

  nextButton.addEventListener('click', () => {
    loadQuestion();
    nextButton.style.display = 'none';
  });
  
  // Função de embaralhar usando Fisher-Yates
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
  
  function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
      alert(`Parabéns! Você venceu o quiz!\nPontuação final: ${score}`);
      resetGame();
      return;
    }
  
    const q = questions[currentQuestionIndex];
    questionText.innerText = q.question;
  
    // Embaralha as alternativas da pergunta
    const shuffledAnswers = shuffle([...q.answers]);
  
    answersList.innerHTML = '';
    shuffledAnswers.forEach(answer => {
      const li = document.createElement('li');
      li.innerText = answer;
      li.addEventListener('click', () => checkAnswer(answer));
      answersList.appendChild(li);
    });
  }
  
  document.getElementById('btn-reset').addEventListener('click', () => {
    resetGame();
  });
  
  function checkAnswer(selectedAnswer) {
    const q = questions[currentQuestionIndex];
    const answerItems = answersList.querySelectorAll('li');
  
    answerItems.forEach(li => {
      // Desativa os cliques
      li.style.pointerEvents = "none";
  
      // Destaca a correta em verde
      if (li.innerText === q.correctAnswer) {
        li.classList.add('correct');
      }
  
      // Se for a resposta clicada errada, marca como incorreta
      if (li.innerText === selectedAnswer && selectedAnswer !== q.correctAnswer) {
        li.classList.add('incorrect');
      }
    });
  
    if (selectedAnswer === q.correctAnswer) {
      score++;
      scoreDisplay.innerText = score;
      nextButton.style.display = 'inline-block';
      currentQuestionIndex++;
    } else {
      // Espera 1s antes de mostrar "Perdeu", para o efeito visual
      setTimeout(() => gameOver(), 1000);
    }
  }
  
  
  function gameOver() {
    alert(`Você perdeu! Pontuação: ${score}`);
    resetGame();
  }
  
  function resetGame() {
    score = 0;
    currentQuestionIndex = 0;
    scoreDisplay.innerText = score;
  
    // Embaralha perguntas ao reiniciar
    questions = shuffle([...questionsOriginal]);
    loadQuestion();
  }
  
  // Início do jogo
  questions = shuffle([...questionsOriginal]);
  loadQuestion();

  const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  
  if (document.body.classList.contains('dark')) {
    themeToggle.innerText = "☀️ Modo Claro";
  } else {
    themeToggle.innerText = "🌙 Modo Escuro";
  }
});

let mode = null;
let timeLeft = 60;
let timerInterval;
let lives = 3;

function startMode(selectedMode) {
    mode = selectedMode;
    questions = shuffle([...allQuestions.esportes.futebol]); // ou qualquer categoria por enquanto
    currentQuestionIndex = 0;
    score = 0;
    scoreDisplay.innerText = score;
  
    document.getElementById('mode-select').style.display = 'none';
    quizContainer.style.display = 'block';
  
    if (mode === 'cronometro') {
      document.getElementById('timer').style.display = 'block';
      startTimer();
    }
  
    if (mode === 'maratona') {
      lives = 3;
      document.getElementById('lives').style.display = 'block';
      document.getElementById('life-count').innerText = lives;
    }
  
    loadQuestion();
  }

  function startTimer() {
    timeLeft = 60;
    document.getElementById('time-left').innerText = timeLeft;
  
    timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById('time-left').innerText = timeLeft;
  
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("⏰ Tempo esgotado! Sua pontuação: " + score);
        resetGame();
      }
    }, 1000);
  }

  function checkAnswer(selectedAnswer) {
    const q = questions[currentQuestionIndex];
    const answerItems = answersList.querySelectorAll('li');
  
    // Desativa os cliques
    answerItems.forEach(li => {
      li.style.pointerEvents = "none";
      if (li.innerText === q.correctAnswer) li.classList.add('correct');
      if (li.innerText === selectedAnswer && selectedAnswer !== q.correctAnswer) li.classList.add('incorrect');
    });
  
    // Resposta correta
    if (selectedAnswer === q.correctAnswer) {
      score++;
      scoreDisplay.innerText = score;
    } else {
      // Modo maratona perde vida
      if (mode === 'maratona') {
        lives--;
        document.getElementById('life-count').innerText = lives;
  
        if (lives <= 0) {
          setTimeout(() => {
            alert("💀 Você perdeu! Fim da maratona.\nPontuação: " + score);
            resetGame();
          }, 1000);
          return;
        }
      }
    }
  
    // Vai pra próxima pergunta se ainda tiver
    currentQuestionIndex++;
    if (currentQuestionIndex < 20 && currentQuestionIndex < questions.length) {
      nextButton.style.display = "inline-block"; // Exibe botão "Próxima"
    } else {
      setTimeout(() => {
        alert("🎉 Quiz concluído!\nPontuação final: " + score);
        resetGame();
      }, 1000);
    }
  }
  
  function resetGame() {
    clearInterval(timerInterval);
    score = 0;
    currentQuestionIndex = 0;
    scoreDisplay.innerText = score;
    lives = 3;
    document.getElementById('life-count').innerText = lives;
  
    document.getElementById('timer').style.display = 'none';
    document.getElementById('lives').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('mode-select').style.display = 'block';
  }

document.getElementById('btn-leaderboard').addEventListener('click', () => {
  window.location.href = '/leaderboard.html';
});

