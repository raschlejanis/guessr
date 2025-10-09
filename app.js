// Photo MCQ Game (UZH build)
// Configuration
const ROUNDS = 5;
const OPTIONS_PER_QUESTION = 5;
const DATA_URL = 'data/questions.json';

// Embedded fallback dataset (UZH)
const EMBEDDED_QUESTIONS = [
  { id: 1, image: "images/BotanischerGarten.jpg", answer: "Botanischer Garten" },
  { id: 2, image: "images/Hauptgebäude.jpg", answer: "UZH Hauptgebäude" },
  { id: 3, image: "images/UBErziehungswissenschaften.jpg", answer: "UB Erziehungswissenschaften" },
  { id: 4, image: "images/Careum.jpg", answer: "Careum" },
  { id: 5, image: "images/UBBetriebswirtschaftslehre.jpg", answer: "UB Betriebswirtschaftslehre" }
];

// State
let allQuestions = [];
let gameQuestions = [];
let currentIndex = 0;
let score = 0;

// Elements
const screenStart = document.getElementById('screen-start');
const screenGame = document.getElementById('screen-game');
const screenResult = document.getElementById('screen-result');
const btnStart = document.getElementById('btn-start');
const btnNext = document.getElementById('btn-next');
const btnRestart = document.getElementById('btn-restart');
const imgEl = document.getElementById('question-image');
const optionsEl = document.getElementById('options');
const roundIndicator = document.getElementById('round-indicator');
const scoreIndicator = document.getElementById('score-indicator');
const resultSummary = document.getElementById('result-summary');

// Utility
function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sampleUnique(arr, count, excludeIdx){
  const indices = arr.map((_,i)=>i).filter(i=>i!==excludeIdx);
  shuffle(indices);
  return indices.slice(0,count);
}

function setScreen(target){
  [screenStart, screenGame, screenResult].forEach(s=>s.classList.remove('active'));
  target.classList.add('active');
}

async function loadData(){
  try {
    const res = await fetch(DATA_URL);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const valid = data.filter(q=>q && q.image && q.answer);
    if(valid.length < OPTIONS_PER_QUESTION) throw new Error('Not enough questions');
    allQuestions = valid.map((q, idx)=>({ id:q.id ?? idx, image:q.image, answer:String(q.answer) }));
  } catch(err){
    console.warn('Using embedded fallback. Reason:', err);
    const valid = EMBEDDED_QUESTIONS.filter(q=>q && q.image && q.answer);
    if(valid.length < OPTIONS_PER_QUESTION){
      alert('Dataset too small. Add more entries.');
      return;
    }
    allQuestions = valid.map((q, idx)=>({ id:q.id ?? idx, image:q.image, answer:String(q.answer) }));
  }
}

function startGame(){
  score = 0;
  currentIndex = 0;
  scoreIndicator.textContent = `Score: ${score}`;
  const pool = [...allQuestions];
  shuffle(pool);
  gameQuestions = pool.slice(0, ROUNDS);
  setScreen(screenGame);
  renderRound();
}

function buildOptionsFor(questionIdx){
  const q = gameQuestions[questionIdx];
  const correct = q.answer;
  const wrongNeeded = OPTIONS_PER_QUESTION - 1;
  const source = allQuestions;
  const wrongIndices = sampleUnique(source, wrongNeeded, allQuestions.indexOf(q));
  const wrongAnswers = wrongIndices.map(i=>source[i].answer).filter(a=>a!==correct);
  const set = new Set(wrongAnswers);
  if(set.size < wrongNeeded){
    const alt = source.map(s=>s.answer).filter(a=>a!==correct && !set.has(a));
    shuffle(alt);
    while(set.size < wrongNeeded && alt.length){ set.add(alt.pop()); }
  }
  const options = shuffle([correct, ...Array.from(set).slice(0, wrongNeeded)]);
  return options;
}

function renderRound(){
  const q = gameQuestions[currentIndex];
  roundIndicator.textContent = `Round ${currentIndex+1}/${ROUNDS}`;
  imgEl.src = q.image;
  imgEl.alt = `Question image for ${q.answer}`;
  optionsEl.innerHTML = '';
  btnNext.disabled = true;

  const options = buildOptionsFor(currentIndex);
  options.forEach((label)=>{
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', ()=> handleAnswer(btn, label === q.answer));
    li.appendChild(btn);
    optionsEl.appendChild(li);
  });
}

function handleAnswer(button, isCorrect){
  [...document.querySelectorAll('.option-btn')].forEach(b=>b.disabled = true);
  if(isCorrect){
    button.classList.add('correct');
    score++;
    scoreIndicator.textContent = `Score: ${score}`;
  } else {
    button.classList.add('wrong');
    [...document.querySelectorAll('.option-btn')].find(b=>b.textContent===gameQuestions[currentIndex].answer)?.classList.add('correct');
  }
  btnNext.disabled = false;
}

function next(){
  if(currentIndex < ROUNDS-1){
    currentIndex++;
    renderRound();
  } else {
    finish();
  }
}

function finish(){
  resultSummary.textContent = `You scored ${score} out of ${ROUNDS}.`;
  setScreen(screenResult);
}

btnStart.addEventListener('click', startGame);
btnNext.addEventListener('click', next);
btnRestart.addEventListener('click', ()=>{ setScreen(screenStart); });

loadData();
