/* NYAP Team Accomplishment Cake - script.js
   Features:
   - Add sticks (name, accomplishment, color, height%)
   - Persist sticks to localStorage
   - Click stick -> confetti + popup
   - Export / Import JSON
   - Draggable badge
*/

const STORAGE_KEY = 'nyap-cake-board-v1';

const state = {
  sticks: []
};

const cakeContainer = document.getElementById('cake-container');
const sticksLayer = document.getElementById('sticks-layer');
const addBtn = document.getElementById('add-stick-btn');
const modal = document.getElementById('modal');
const form = document.getElementById('stick-form');
const cancelBtn = document.getElementById('cancel-btn');
const popup = document.getElementById('popup');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const clearBtn = document.getElementById('clear-board-btn');

const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

function resizeCanvas() {
  confettiCanvas.width = cakeContainer.clientWidth;
  confettiCanvas.height = cakeContainer.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// --- persistence
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sticks)) state.sticks = parsed.sticks;
  } catch (e) {
    console.error('Failed to load state', e);
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sticks: state.sticks }));
}

// --- rendering sticks
function renderSticks() {
  sticksLayer.innerHTML = '';
  const cakeRect = cakeContainer.getBoundingClientRect();
  const width = cakeRect.width;
  // We'll place sticks along cake width; each stick gets left = random safe area
  state.sticks.forEach((s, idx) => {
    const stickEl = document.createElement('div');
    stickEl.className = 'stick';
    stickEl.style.zIndex = 20 + idx;
    // position: pick left percent if saved, otherwise compute
    const leftPct = (s.leftPct ?? (10 + (idx * 12)) % 80);
    stickEl.style.left = `${leftPct}%`;
    // bottom offset: base baseline plus small variation depending on tier (we'll use height)
    const heightPx = Math.max(30, Math.min(220, (s.heightPct / 100) * 220));
    stickEl.style.bottom = `${24}px`;
    stickEl.dataset.id = s.id;

    // pole
    const pole = document.createElement('div');
    pole.className = 'pole';
    pole.style.height = `${heightPx}px`;
    stickEl.appendChild(pole);

    // flag
    const flag = document.createElement('div');
    flag.className = 'flag';
    flag.style.backgroundColor = s.color || '#FFD24C';
    flag.textContent = s.name || 'Anonymous';
    // small text for accessibility
    flag.setAttribute('title', s.accomplishment || '');
    stickEl.appendChild(flag);

    // click behavior
    stickEl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      triggerConfettiAt(ev.clientX, ev.clientY);
      showPopup(s);
      // mark as popped (simple visual)
      flag.style.transform = 'translateX(8px) rotate(6deg) scale(0.98)';
      setTimeout(()=>flag.style.transform='', 600);
    });

    sticksLayer.appendChild(stickEl);
  });
}

// --- modal handling
addBtn.addEventListener('click', () => {
  openModal();
});
function openModal() {
  modal.classList.remove('hidden');
  form.reset();
  form.elements['color'].value = '#FFD24C';
  form.elements['height'].value = 60;
}
function closeModal() {
  modal.classList.add('hidden');
}
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = fd.get('name').trim() || 'Anonymous';
  const accomplishment = fd.get('accomplishment').trim() || '';
  const color = fd.get('color') || '#FFD24C';
  const heightPct = Number(fd.get('height')) || 60;
  const id = `s_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  // compute a reasonable leftPct (avoid overlap naive)
  const leftPct = computeLeftForNewStick();
  const stick = { id, name, accomplishment, color, heightPct, leftPct };
  state.sticks.push(stick);
  saveState();
  renderSticks();
  closeModal();
});

function computeLeftForNewStick(){
  // place in next gap, naive: try multiples of 8% that are not taken
  const used = new Set(state.sticks.map(s => Math.round(s.leftPct)));
  for (let p = 10; p <= 88; p += 8) {
    if (!used.has(p)) return p;
  }
  return (10 + Math.floor(Math.random()*70));
}

// --- popup
function showPopup(stick) {
  popup.innerHTML =
