/* ==========================================
   1. DATABASE LOKAL (IndexedDB)
   ========================================== */
let db;
const request = indexedDB.open("LifePlannerDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  db.createObjectStore("tasks", { keyPath: "id" });
  db.createObjectStore("finance", { keyPath: "id" });
  db.createObjectStore("habits", { keyPath: "id" });
  db.createObjectStore("goals", { keyPath: "id" });
  db.createObjectStore("license", { keyPath: "key" });
};

request.onsuccess = (e) => {
  db = e.target.result;
  initApp();
};

/* ==========================================
   2. INITIALIZATION & NAVIGATION
   ========================================== */
function initApp() {
  document.getElementById("current-date-text").innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  renderTasks();
  renderFinance();
  renderHabits();
  renderGoals();
  checkLicenseStatus();
  registerSW();
}

function switchTab(tabName) {
  document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.classList.add('text-slate-400');
  });

  document.getElementById(`mod-${tabName}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-${tabName}`);
  activeBtn.classList.add('bg-indigo-600', 'text-white');
  activeBtn.classList.remove('text-slate-400');
}

function toggleModal(id) {
  document.getElementById(id).classList.toggle('hidden');
}

/* ==========================================
   3. MODUL 1: DAILY PLANNER
   ========================================== */
function addTask(e) {
  e.preventDefault();
  const title = document.getElementById("input-task-title").value;
  const priority = document.getElementById("input-task-priority").value;
  const task = { id: Date.now().toString(), title, priority, completed: false };

  const tx = db.transaction("tasks", "readwrite");
  tx.objectStore("tasks").add(task);
  tx.oncomplete = () => {
    document.getElementById("form-task").reset();
    renderTasks();
  };
}

function renderTasks() {
  const tx = db.transaction("tasks", "readonly");
  const store = tx.objectStore("tasks");
  const req = store.getAll();
  req.onsuccess = () => {
    const list = document.getElementById("list-tasks");
    list.innerHTML = "";
    req.result.forEach(t => {
      list.innerHTML += `
        <div class="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/60">
          <div class="flex items-center space-x-3">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700">
            <span class="${t.completed ? 'line-through text-slate-500' : 'text-slate-200'} text-sm">${t.title}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-2 py-0.5 rounded bg-slate-700">${t.priority}</span>
            <button onclick="deleteItem('tasks', '${t.id}', renderTasks)" class="text-xs text-rose-400 hover:text-rose-300">Hapus</button>
          </div>
        </div>`;
    });
  };
}

function toggleTask(id) {
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  store.get(id).onsuccess = (e) => {
    const data = e.target.result;
    data.completed = !data.completed;
    store.put(data).onsuccess = renderTasks;
  };
}

/* ==========================================
   4. MODUL 2: FINANCIAL PLANNER
   ========================================== */
function addTransaction(e) {
  e.preventDefault();
  const desc = document.getElementById("fin-desc").value;
  const amount = parseFloat(document.getElementById("fin-amount").value);
  const type = document.getElementById("fin-type").value;
  const item = { id: Date.now().toString(), desc, amount, type, date: new Date().toISOString() };

  const tx = db.transaction("finance", "readwrite");
  tx.objectStore("finance").add(item);
  tx.oncomplete = () => {
    document.getElementById("form-finance").reset();
    renderFinance();
  };
}

function renderFinance() {
  const tx = db.transaction("finance", "readonly");
  const req = tx.objectStore("finance").getAll();
  req.onsuccess = () => {
    const list = document.getElementById("list-finance");
    list.innerHTML = "";
    let income = 0, expense = 0;

    req.result.forEach(f => {
      if(f.type === 'income') income += f.amount;
      else expense += f.amount;

      list.innerHTML += `
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700/60">
          <div>
            <p class="text-sm font-medium text-slate-200">${f.desc}</p>
            <p class="text-xs text-slate-400">${new Date(f.date).toLocaleDateString('id-ID')}</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm font-bold ${f.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
              ${f.type === 'income' ? '+' : '-'} Rp ${f.amount.toLocaleString('id-ID')}
            </span>
            <button onclick="deleteItem('finance', '${f.id}', renderFinance)" class="text-xs text-rose-400">Hapus</button>
          </div>
        </div>`;
    });

    document.getElementById("stat-income").innerText = `Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById("stat-expense").innerText = `Rp ${expense.toLocaleString('id-ID')}`;
    document.getElementById("stat-balance").innerText = `Rp ${(income - expense).toLocaleString('id-ID')}`;
  };
}

/* ==========================================
   5. MODUL 3: HABIT & HEALTH TRACKER
   ========================================== */
function addHabit(e) {
  e.preventDefault();
  const title = document.getElementById("habit-title").value;
  const item = { id: Date.now().toString(), title, streak: 0, lastCompleted: null };

  const tx = db.transaction("habits", "readwrite");
  tx.objectStore("habits").add(item);
  tx.oncomplete = () => {
    document.getElementById("form-habit").reset();
    renderHabits();
  };
}

function renderHabits() {
  const tx = db.transaction("habits", "readonly");
  const req = tx.objectStore("habits").getAll();
  req.onsuccess = () => {
    const list = document.getElementById("list-habits");
    list.innerHTML = "";
    req.result.forEach(h => {
      list.innerHTML += `
        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
          <div>
            <h4 class="font-semibold text-sm text-slate-200">${h.title}</h4>
            <p class="text-xs text-indigo-400 mt-1">🔥 Streak: ${h.streak} Hari</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="checkInHabit('${h.id}')" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-xs font-semibold">Selesai Hari Ini</button>
            <button onclick="deleteItem('habits', '${h.id}', renderHabits)" class="text-xs text-rose-400">✕</button>
          </div>
        </div>`;
    });
  };
}

function checkInHabit(id) {
  const tx = db.transaction("habits", "readwrite");
  const store = tx.objectStore("habits");
  store.get(id).onsuccess = (e) => {
    const h = e.target.result;
    h.streak += 1;
    store.put(h).onsuccess = renderHabits;
  };
}

/* ==========================================
   6. MODUL 4: GOAL & LONG-TERM PLANNER
   ========================================== */
function addGoal(e) {
  e.preventDefault();
  const title = document.getElementById("goal-title").value;
  const target = parseFloat(document.getElementById("goal-target").value) || 0;
  const item = { id: Date.now().toString(), title, target, current: 0 };

  const tx = db.transaction("goals", "readwrite");
  tx.objectStore("goals").add(item);
  tx.oncomplete = () => {
    document.getElementById("form-goal").reset();
    renderGoals();
  };
}

function renderGoals() {
  const tx = db.transaction("goals", "readonly");
  const req = tx.objectStore("goals").getAll();
  req.onsuccess = () => {
    const list = document.getElementById("list-goals");
    list.innerHTML = "";
    req.result.forEach(g => {
      const progress = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
      list.innerHTML += `
        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
          <div class="flex justify-between items-start">
            <h4 class="font-bold text-sm text-slate-100">${g.title}</h4>
            <button onclick="deleteItem('goals', '${g.id}', renderGoals)" class="text-xs text-rose-400">Hapus</button>
          </div>
          ${g.target > 0 ? `
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Progress: ${progress}%</span>
              <span>Rp ${g.current.toLocaleString('id-ID')} / Rp${g.target.toLocaleString('id-ID')}</span>
            </div>
            <div class="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-full transition-all duration-300" style="width: ${progress}%"></div>
            </div>
          </div>` : ''}
        </div>`;
    });
  };
}

/* ==========================================
   7. LISENSI & OTENTIKASI LYNK.ID (BACKEND SIMULATION)
   ========================================== */
let currentUserEmail = null;

function handleCredentialResponse(response) {
  // Decode Google ID Token (JWT)
  const responsePayload = parseJwt(response.credential);
  currentUserEmail = responsePayload.email;
  alert(`Berhasil Login Google: ${currentUserEmail}`);
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

function verifyAndActivateLicense() {
  const orderId = document.getElementById("license-order-id").value;
  if (!orderId || !currentUserEmail) {
    alert("Harap isi Order ID Lynk.id dan lakukan Login Google terlebih dahulu!");
    return;
  }

  // Dapatkan Hardware ID unik perangkat saat ini
  const deviceFingerprint = getDeviceFingerprint();

  // SIMULASI AKSI VERIFIKASI SERVERLESS BACKEND
  const licenseData = {
    key: "active_license",
    orderId: orderId,
    email: currentUserEmail,
    activeDevice: deviceFingerprint,
    status: "ACTIVE_LIFETIME"
  };

  const tx = db.transaction("license", "readwrite");
  tx.objectStore("license").put(licenseData);
  tx.oncomplete = () => {
    alert("Lisensi Berhasil Diaktifkan untuk Perangkat Ini!");
    toggleModal('license-modal');
    checkLicenseStatus();
  };
}

function checkLicenseStatus() {
  const tx = db.transaction("license", "readonly");
  const req = tx.objectStore("license").get("active_license");
  req.onsuccess = (e) => {
    const lic = e.target.result;
    const badge = document.getElementById("license-badge");
    const licStatus = document.getElementById("lic-status");
    const licDevices = document.getElementById("lic-devices");

    if (lic && lic.status === "ACTIVE_LIFETIME") {
      badge.className = "px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer";
      badge.innerHTML = `<span>✓</span> <span>Lisensi Lifetime Aktif</span>`;
      licStatus.innerText = "Aktif (Lifetime)";
      licStatus.className = "text-emerald-400 font-bold";
      licDevices.innerText = "1 / 2 Perangkat";
    }
  };
}

function getDeviceFingerprint() {
  return navigator.userAgent + "-" + screen.width + "x" + screen.height;
}

function deleteItem(storeName, id, callback) {
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  tx.oncomplete = callback;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
}
