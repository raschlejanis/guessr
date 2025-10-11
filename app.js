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

// ---- Supabase config ----
const SUPABASE_URL = "https://ncoxnrrxqxmyavxdgglm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb3hucnJ4cXhteWF2eGRnZ2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDc5NzYsImV4cCI6MjA3NTQ4Mzk3Nn0.kwZoLSHSCX3L1ny_SJ4sf4Mm_su3WLBbva_Mfgc6QYg";

// Minimal REST helper (no extra deps)
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// API
async function submitScore(nickname, score, gameMode) {
  const body = JSON.stringify([{ nickname, score, game_mode: gameMode }]);
  return sbFetch("scores", { method: "POST", body });
}

async function fetchLeaderboard(gameMode = "classic", limit = 10) {
  const params = new URLSearchParams({
    select: "*",
    order: "score.desc,created_at.asc",
    limit: String(limit),
    game_mode: `eq.${gameMode}`
  });
  return sbFetch(`scores?${params.toString()}`, { method: "GET" });
}

async function renderLeaderboard(gameMode = "classic") {
  const list = document.getElementById("lb-list");
  list.innerHTML = "<li>Loading…</li>";
  try {
    const rows = await fetchLeaderboard(gameMode, 10);
    list.innerHTML = "";
    rows.forEach((r, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${r.nickname} — ${r.score}`;
      list.appendChild(li);
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = "<li>Couldn’t load scores</li>";
  }
}
function finish() {
  resultSummary.textContent = `You scored ${score} out of ${ROUNDS}.`;

  (async () => {
    let nickname = localStorage.getItem("nickname") || prompt("Nickname:", "Player");
    if (nickname) {
      nickname = nickname.trim().slice(0,24);
      localStorage.setItem("nickname", nickname);
      try { await submitScore(nickname, score, "classic"); } catch(e) { console.error(e); }
    }
    await renderLeaderboard("classic");
    setScreen(screenResult);
  })();
}

// On boot:
renderLeaderboard("classic");



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
