/* =======================
   CONFIG
======================= */
const MAX_BIRTHDAYS = 60;
const STORAGE_KEY = 'cse24_birthdays_v1';

/* =======================
   INITIAL DATA (seed)
   (Change the years if you want real birth years)
======================= */
const seed = [
  { name: 'Argha',       date: '2000-11-09' },
  { name: 'Biki',        date: '2000-01-02' },
  { name: 'Bishwashree', date: '2000-10-12' },
  { name: 'Biswajyoti',  date: '2000-05-12' },
  { name: 'Iqram',       date: '2000-07-31' },
  { name: 'Uddipan',     date: '2000-07-04' },
];

/* =======================
   STATE
======================= */
let birthdays = load();

/* =======================
   DOM HOOKS
======================= */
const grid = document.getElementById('birthdayGrid');
const counter = document.getElementById('counter');
const form = document.getElementById('birthdayForm');
const formError = document.getElementById('formError');
const nameInput = document.getElementById('nameInput');
const dateInput = document.getElementById('dateInput');
const searchName = document.getElementById('searchName');
const nextBirthdayText = document.getElementById('next-birthday-text');
const monthFilters = document.getElementById('monthFilters');
const nextThreeList = document.getElementById('nextThreeList');

let currentMonthFilter = 'all';

/* =======================
   EVENT LISTENERS
======================= */
if (form) form.addEventListener('submit', onSubmit);
if (searchName) searchName.addEventListener('input', renderAll);

if (monthFilters) {
  monthFilters.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      document.querySelectorAll('#monthFilters .btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentMonthFilter = e.target.dataset.month;
      renderAll();
    }
  });
}

/* Smooth scroll for anchor links (fallback for older browsers) */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
  });
});

/* =======================
   INITIAL RENDER
======================= */
renderAll();

/* =======================
   HANDLERS
======================= */
function onSubmit(e){
  e.preventDefault();
  formError.classList.add('d-none');

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (!name || !date) {
    showError('Please fill all fields.');
    return;
  }

  if (birthdays.length >= MAX_BIRTHDAYS) {
    showError(`Maximum of ${MAX_BIRTHDAYS} birthdays reached.`);
    return;
  }

  if (birthdays.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    showError('This name already exists.');
    return;
  }

  birthdays.push({ name, date });
  save();
  renderAll();

  form.reset();
  const modalEl = document.getElementById('addBirthdayModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }
}

function showError(msg){
  formError.textContent = msg;
  formError.classList.remove('d-none');
}

/* =======================
   RENDER
======================= */
function renderAll(){
  // search + month filter
  const filter = searchName?.value?.trim().toLowerCase() || '';
  const filtered = birthdays
    .slice()
    .sort(sortByMonthDay)
    .filter(b => b.name.toLowerCase().includes(filter))
    .filter(b => {
      if (currentMonthFilter === 'all') return true;
      return new Date(b.date).getMonth() === parseInt(currentMonthFilter);
    });

  // render birthday grid
  grid.innerHTML = filtered.map(b => `
    <div class="col-md-6 col-lg-4">
      <div class="card p-3 birthday-card h-100">
        <h5 class="mb-1">${escapeHTML(b.name)}</h5>
        <p class="mb-0 text-secondary">${formatDate(b.date)}</p>
      </div>
    </div>
  `).join('');

  counter.textContent = `${birthdays.length}/${MAX_BIRTHDAYS} stored`;

  // next (single) birthday widget
  const next = getNextBirthday(birthdays);
  nextBirthdayText.textContent = next
    ? `${next.name} — ${formatDate(next.date)} (${daysUntil(next.date)} day${daysUntil(next.date)!==1?'s':''} left)`
    : 'No birthdays added yet.';

  // next 3 birthdays
  renderNextThree();
}

function renderNextThree(){
  const sorted = birthdays
    .slice()
    .map(b => ({ ...b, daysLeft: daysUntil(b.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  nextThreeList.innerHTML = sorted.length
    ? sorted.map(b => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          ${escapeHTML(b.name)}
          <span class="badge bg-primary">${b.daysLeft} day${b.daysLeft!==1?'s':''}</span>
        </li>`).join('')
    : '<li class="list-group-item">No birthdays yet.</li>';
}

/* =======================
   UTILS
======================= */
function sortByMonthDay(a,b){
  const am = new Date(a.date).getMonth();
  const ad = new Date(a.date).getDate();
  const bm = new Date(b.date).getMonth();
  const bd = new Date(b.date).getDate();
  return am - bm || ad - bd;
}

function formatDate(dateStr){
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = d.toLocaleString(undefined, { month: 'long' });
  return `${day}${suffix} ${month}`;
}

function getOrdinalSuffix(n){
  if([11,12,13].includes(n%100)) return 'th';
  switch(n%10){
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function getNextBirthday(list){
  if(list.length === 0) return null;
  const today = new Date();
  let next = null;
  let minDiff = Infinity;

  list.forEach(b => {
    const d = new Date(b.date);
    let candidate = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if(candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
    const diff = candidate - today;
    if(diff < minDiff){
      minDiff = diff;
      next = { ...b, nextDate: candidate };
    }
  });

  return next;
}

function daysUntil(dateStr){
  const today = stripTime(new Date());
  const d = new Date(dateStr);
  let candidate = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if(candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  const diffMs = candidate - today;
  return Math.ceil(diffMs / (1000*60*60*24));
}

function stripTime(d){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed.slice();
  }
  try{
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error();
    return parsed;
  }catch{
    return seed.slice();
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
}

function escapeHTML(str){
  return str.replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}
