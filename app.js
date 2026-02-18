/***************************************
  PROJECT: Student System (No Database)
  Tech: HTML + CSS + JS
  Storage: localStorage
  app.js (Single file - clean)
***************************************/

/* =========================
   STORAGE KEYS + SETTINGS
========================= */
const DB_USERS = "users_db";
const DB_LOGGED_EMAIL = "logged_user_email";
const DB_ADMIN_LOGGED = "admin_logged";
const DB_REQUESTS = "students_requests";
const DB_LAST_CREATED_EMAIL = "last_created_email";
const DB_LOCK = "registration_lock";      // "1" locked, else open
const DB_CAPACITY = "capacity";           // { IT: 50, ... }

const ADMIN_EMAIL = "mhamad-saman@gmail.iq";
const ADMIN_PASS = "mu123456hamad";

/* Departments used for allocation (matches admin-panel.html inputs cap_IT ... ) */
const UNI_DEPARTMENTS = ["IT", "CS", "SE", "Network", "Database", "Cyber", "AI"];

/* Min average rules (you can change anytime) */
const DEPT_MIN = {
  IT: 60,
  CS: 60,
  SE: 65,
  Network: 58,
  Database: 55,
  Cyber: 62,
  AI: 70
};

/* Subjects by section (your latest requirement) */
const SUBJECTS = {
  Scientific: ["Arabic", "English", "Kurdish", "Biology", "Physics", "Chemistry", "Mathematics"],
  Literary: ["Mathematics", "Kurdish", "Arabic", "English", "History", "Economics", "Geography"],
  Vocational: ["Drawing", "Practical Training", "Mathematics", "Physics", "Science", "Kurdish", "Arabic", "Computer", "Law", "English"]
};

/* Student runtime */
let CURRENT_SECTION = "";
let CURRENT_AVG = 0;
let SELECTED_DEPS = [];

/* =========================
   HELPERS
========================= */
function $(id) { return document.getElementById(id); }

function safeText(v) { return (v ?? "").toString().trim(); }

function show(el, msg = "") {
  if (!el) return;
  el.style.display = "block";
  if (msg) el.innerHTML = msg;
}
function hide(el) {
  if (!el) return;
  el.style.display = "none";
}

function go(page) { window.location.href = page; }

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clampGrade(n) {
  n = Number(n);
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/* =========================
   STORAGE FUNCTIONS
========================= */
function getUsers() {
  return JSON.parse(localStorage.getItem(DB_USERS) || "[]");
}
function saveUsers(users) {
  localStorage.setItem(DB_USERS, JSON.stringify(users));
}

function getRequests() {
  return JSON.parse(localStorage.getItem(DB_REQUESTS) || "[]");
}
function saveRequests(reqs) {
  localStorage.setItem(DB_REQUESTS, JSON.stringify(reqs));
}

function setLoggedEmail(email) { localStorage.setItem(DB_LOGGED_EMAIL, email); }
function getLoggedEmail() { return localStorage.getItem(DB_LOGGED_EMAIL); }
function logoutClearStudent() { localStorage.removeItem(DB_LOGGED_EMAIL); }

function isAdminLogged() { return localStorage.getItem(DB_ADMIN_LOGGED) === "1"; }
function setAdminLogged(on) {
  if (on) localStorage.setItem(DB_ADMIN_LOGGED, "1");
  else localStorage.removeItem(DB_ADMIN_LOGGED);
}

function isLocked() { return localStorage.getItem(DB_LOCK) === "1"; }
function setLocked(on) {
  if (on) localStorage.setItem(DB_LOCK, "1");
  else localStorage.removeItem(DB_LOCK);
}

function getCapacity() {
  const cap = JSON.parse(localStorage.getItem(DB_CAPACITY) || "null");
  if (cap && typeof cap === "object") return cap;
  const def = {};
  UNI_DEPARTMENTS.forEach(d => def[d] = 50);
  localStorage.setItem(DB_CAPACITY, JSON.stringify(def));
  return def;
}
function saveCapacityObj(cap) {
  localStorage.setItem(DB_CAPACITY, JSON.stringify(cap));
}

/* init storage once */
(function initStorage() {
  if (!localStorage.getItem(DB_USERS)) saveUsers([]);
  if (!localStorage.getItem(DB_REQUESTS)) saveRequests([]);
  getCapacity();
})();

/* =========================
   PAGE DETECTION
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop().toLowerCase();

  // login page name is prozha.html
  if (page === "prozha.html") autoFillLogin();

  if (page === "dashboard.html") {
    protectStudent();
    initDashboard();
    showStudentResultBadge();
    showMyRank();
  }

  if (page === "profile.html") {
    protectStudent();
    loadProfile();
  }

  if (page === "admin-panel.html") {
    protectAdmin();
    loadAdminDashboard();
    loadCapacityToInputs();
  }
});

/* =========================
   NAV
========================= */
function goRegister() { go("register.html"); }
function goLogin() { go("prozha.html"); }
function goDashboard() { go("dashboard.html"); }
function goProfile() { go("profile.html"); }

/* =========================
   LOGIN (prozha.html)
========================= */
function autoFillLogin() {
  const last = localStorage.getItem(DB_LAST_CREATED_EMAIL);
  if (last && $("loginEmail")) $("loginEmail").value = last;
}

function login() {
  const err = $("loginError");
  hide(err);

  const email = safeText($("loginEmail")?.value);
  const pass = safeText($("loginPassword")?.value);

  if (!email || !pass) return show(err, "Please enter Email and Password.");
  if (!isEmailValid(email)) return show(err, "Invalid email format.");

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) return show(err, "This account does not exist. Please Create Account.");
  if (user.password !== pass) return show(err, "Wrong password!");

  // remember me (optional)
  if ($("rememberMe")?.checked) localStorage.setItem("remember_me", "1");
  else localStorage.removeItem("remember_me");

  setLoggedEmail(email);
  go("dashboard.html");
}

function logout() {
  // Used by both student + admin panel button in your HTML
  logoutClearStudent();
  setAdminLogged(false);
  go("prozha.html");
}

/* =========================
   REGISTER (register.html)
========================= */
function register() {
  const err = $("registerError");
  const ok = $("registerSuccess");
  hide(err); hide(ok);

  if (isLocked()) return show(err, "Registration is Locked by Admin.");

  const fullName = safeText($("fullName")?.value);
  const dob = safeText($("dob")?.value);
  const blood = safeText($("bloodGroup")?.value);
  const residence = safeText($("residence")?.value);
  const email = safeText($("regEmail")?.value);
  const password = safeText($("regPassword")?.value);

  if (!fullName || !dob || !blood || !residence || !email || !password) {
    return show(err, "Please fill all fields.");
  }
  if (!isEmailValid(email)) return show(err, "Invalid email format.");
  if (password.length < 6) return show(err, "Password must be at least 6 characters.");

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    return show(err, "This email already exists. Try another one.");
  }

  users.push({
    fullName, dob, blood, residence,
    email, password,

    section: "",
    grades: {},
    average: 0,

    selectedDepartments: [], // max 5
    submitted: false,

    status: "Pending",       // Pending / Approved / Accepted / Rejected
    acceptedDept: null
  });

  saveUsers(users);
  localStorage.setItem(DB_LAST_CREATED_EMAIL, email);

  show(ok, "Account created successfully! Redirecting to Login...");
  setTimeout(() => go("prozha.html"), 900);
}

/* =========================
   FORGOT (forgot.html)
========================= */
function resetPassword() {
  const err = $("fpError");
  const ok = $("fpSuccess");
  hide(err); hide(ok);

  const email = safeText($("fpEmail")?.value);
  const newPass = safeText($("fpPassword")?.value);

  if (!email || !newPass) return show(err, "Please fill all fields.");
  if (!isEmailValid(email)) return show(err, "Invalid email format.");
  if (newPass.length < 6) return show(err, "Password must be at least 6 characters.");

  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return show(err, "This email does not exist.");

  user.password = newPass;
  saveUsers(users);

  show(ok, "Password updated! Redirecting...");
  setTimeout(() => go("prozha.html"), 900);
}

/* =========================
   STUDENT PROTECTION
========================= */
function protectStudent() {
  const email = getLoggedEmail();
  if (!email) return go("prozha.html");

  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    logoutClearStudent();
    go("prozha.html");
  }
}

/* =========================
   DASHBOARD
========================= */
function initDashboard() {
  const email = getLoggedEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return;

  if ($("welcomeText")) $("welcomeText").innerHTML = `Welcome <b>${user.fullName}</b> (${user.email})`;

  CURRENT_SECTION = user.section || "";
  SELECTED_DEPS = Array.isArray(user.selectedDepartments) ? user.selectedDepartments : [];
  CURRENT_AVG = Number(user.average || 0);

  if ($("avgValue")) $("avgValue").innerText = user.section ? CURRENT_AVG : "--";

  if (CURRENT_SECTION) {
    highlightSection(CURRENT_SECTION);
    updateSectionBadge(CURRENT_SECTION);
    renderGrades(CURRENT_SECTION, user.grades || {});
    renderDepartments(CURRENT_AVG);
  } else {
    if ($("gradesGrid")) $("gradesGrid").innerHTML = "<p style='opacity:0.7'>Choose a section first.</p>";
    renderDepartments(0);
  }

  renderSelectedList();
}

function selectSection(sectionName) {
  CURRENT_SECTION = sectionName;
  highlightSection(sectionName);
  updateSectionBadge(sectionName);

  const email = getLoggedEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return;

  user.section = sectionName;
  saveUsers(users);

  renderGrades(sectionName, user.grades || {});
  show($("sectionMsg"), `Section selected: <b>${sectionName}</b>`);
  setTimeout(() => hide($("sectionMsg")), 900);
}

function highlightSection(sectionName) {
  document.querySelectorAll(".section-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".section-btn").forEach(b => {
    if (b.innerText.trim() === sectionName) b.classList.add("active");
  });
}

function updateSectionBadge(sectionName) {
  if ($("sectionBadge")) $("sectionBadge").innerText = `Section: ${sectionName}`;
}

function renderGrades(sectionName, saved = {}) {
  const grid = $("gradesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  (SUBJECTS[sectionName] || []).forEach(sub => {
    const wrap = document.createElement("div");
    wrap.className = "input-group";

    const lab = document.createElement("label");
    lab.innerText = sub;

    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = 0;
    inp.max = 100;
    inp.placeholder = "0 - 100";
    inp.id = "grade_" + sub.replaceAll(" ", "_");
    if (saved[sub] !== undefined) inp.value = saved[sub];

    inp.addEventListener("input", () => {
      inp.value = clampGrade(inp.value);
    });

    wrap.appendChild(lab);
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  });
}

function getGradesFromUI() {
  const grades = {};
  (SUBJECTS[CURRENT_SECTION] || []).forEach(sub => {
    const id = "grade_" + sub.replaceAll(" ", "_");
    const v = Number($(id)?.value);
    grades[sub] = clampGrade(v);
  });
  return grades;
}

function calculateAverage(showMsg = true) {
  if (!CURRENT_SECTION) {
    if (showMsg) alert("Choose a section first!");
    return 0;
  }

  const grades = getGradesFromUI();
  const vals = Object.values(grades);
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

  CURRENT_AVG = Math.round(avg * 100) / 100;
  if ($("avgValue")) $("avgValue").innerText = CURRENT_AVG;

  const email = getLoggedEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    user.grades = grades;
    user.average = CURRENT_AVG;
    saveUsers(users);
  }

  renderDepartments(CURRENT_AVG);
  return CURRENT_AVG;
}

function saveGrades() {
  if (!CURRENT_SECTION) return alert("Choose section first!");
  calculateAverage(false);
  alert("Grades saved successfully!");
}

function loadGrades() {
  const email = getLoggedEmail();
  const user = getUsers().find(u => u.email === email);
  if (!user) return;

  if (!user.section) return alert("No section selected yet!");

  CURRENT_SECTION = user.section;
  highlightSection(CURRENT_SECTION);
  updateSectionBadge(CURRENT_SECTION);

  renderGrades(CURRENT_SECTION, user.grades || {});
  CURRENT_AVG = Number(user.average || 0);
  if ($("avgValue")) $("avgValue").innerText = CURRENT_AVG;

  renderDepartments(CURRENT_AVG);
  alert("Grades loaded!");
}

/* Departments grid (green available / red locked) */
function renderDepartments(avg) {
  const box = $("departments");
  if (!box) return;

  box.innerHTML = "";

  UNI_DEPARTMENTS.forEach(dep => {
    const min = DEPT_MIN[dep] ?? 0;
    const allowed = avg >= min;

    const d = document.createElement("div");
    d.className = "dep";
    d.innerHTML = `<b>${dep}</b><br><span style="opacity:0.75">Min Average: ${min}</span>`;

    if (allowed) {
      d.classList.add("available");
      d.addEventListener("click", () => addDepartment(dep));
    } else {
      d.classList.add("locked");
      d.title = "Locked";
    }
    box.appendChild(d);
  });
}

/* max 5 choices */
function addDepartment(depName) {
  if (SELECTED_DEPS.includes(depName)) return alert("Already selected!");
  if (SELECTED_DEPS.length >= 5) return alert("Maximum is 5 choices only!");

  SELECTED_DEPS.push(depName);
  saveSelectedToUser();
  renderSelectedList();
}

function removeDepartment(depName) {
  SELECTED_DEPS = SELECTED_DEPS.filter(x => x !== depName);
  saveSelectedToUser();
  renderSelectedList();
}

function saveSelectedToUser() {
  const email = getLoggedEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return;

  user.selectedDepartments = [...SELECTED_DEPS];
  saveUsers(users);
}

function renderSelectedList() {
  const ul = $("selectedList");
  if (!ul) return;

  ul.innerHTML = "";

  if (!SELECTED_DEPS.length) {
    ul.innerHTML = "<li style='opacity:0.7'>No departments selected.</li>";
    return;
  }

  SELECTED_DEPS.forEach(dep => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${dep}</span>
      <button class="small-btn" onclick="removeDepartment('${dep.replaceAll("'", "\\'")}')">Remove</button>
    `;
    ul.appendChild(li);
  });
}

function clearSelections() {
  if (!confirm("Clear all selected departments?")) return;
  SELECTED_DEPS = [];
  saveSelectedToUser();
  renderSelectedList();
}

function submitDepartments() {
  if (isLocked()) return alert("Registration is Locked by Admin!");
  if (!CURRENT_SECTION) return alert("Choose section first!");
  if (!SELECTED_DEPS.length) return alert("Select at least 1 department!");

  calculateAverage(false);

  const email = getLoggedEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return;

  const req = {
    fullName: user.fullName,
    email: user.email,
    section: user.section,
    average: user.average,

    // 5 choices
    choices: (user.selectedDepartments || []).slice(0, 5),

    acceptedDept: user.acceptedDept || null,
    status: user.status || "Pending",
    createdAt: new Date().toLocaleString()
  };

  let reqs = getRequests();
  const idx = reqs.findIndex(r => r.email === email);
  if (idx >= 0) reqs[idx] = req;
  else reqs.push(req);

  saveRequests(reqs);

  user.submitted = true;
  user.status = req.status || "Pending";
  saveUsers(users);

  show($("submitMsg"), "Submitted successfully! Admin will review.");
  setTimeout(() => hide($("submitMsg")), 1400);
}

function printResult() { window.print(); }

/* =========================
   PROFILE (profile.html)
========================= */
function loadProfile() {
  const email = getLoggedEmail();
  const user = getUsers().find(u => u.email === email);
  if (!user) return;

  if ($("pName")) $("pName").innerText = user.fullName;
  if ($("pDob")) $("pDob").innerText = user.dob;
  if ($("pResidence")) $("pResidence").innerText = user.residence;
  if ($("pBlood")) $("pBlood").innerText = user.blood;
  if ($("pEmail")) $("pEmail").innerText = user.email;
  if ($("pSection")) $("pSection").innerText = user.section || "--";
  if ($("pAvg")) $("pAvg").innerText = user.average ?? 0;
}

/* =========================
   ADMIN LOGIN (admin.html)
========================= */
function adminLogin() {
  const err = $("adminError");
  hide(err);

  const email = safeText($("adminEmail")?.value);
  const pass = safeText($("adminPassword")?.value);

  if (!email || !pass) return show(err, "Please enter admin email and password.");
  if (email !== ADMIN_EMAIL || pass !== ADMIN_PASS) return show(err, "Wrong admin credentials!");

  setAdminLogged(true);
  go("admin-panel.html");
}

function protectAdmin() {
  if (!isAdminLogged()) go("admin.html");
}

/* =========================
   ADMIN LOCK/UNLOCK
========================= */
function lockRegistration() {
  setLocked(true);
  alert("🔒 Registration Locked!");
  loadAdminDashboard();
}

function unlockRegistration() {
  setLocked(false);
  alert("🔓 Registration Open!");
  loadAdminDashboard();
}

/* =========================
   ADMIN CAPACITY
========================= */
function loadCapacityToInputs() {
  const cap = getCapacity();
  UNI_DEPARTMENTS.forEach(d => {
    const inp = $("cap_" + d);
    if (inp) inp.value = cap[d] ?? 0;
  });
}

function saveCapacity() {
  const cap = {};
  UNI_DEPARTMENTS.forEach(d => {
    cap[d] = Math.max(0, Number($("cap_" + d)?.value || 0));
  });
  saveCapacityObj(cap);
  alert("✅ Capacity Saved!");
  loadAdminDashboard();
}

/* =========================
   ALLOCATION (5 choices)
   - Sort by average DESC
   - Each student gets first available dept based on capacity
   - Others go to next choice
========================= */
function runAllocation() {
  let reqs = getRequests();
  const cap = getCapacity();

  // reset results
  reqs = reqs.map(r => ({
    ...r,
    acceptedDept: null,
    status: "Rejected"
  }));

  // sort by avg desc
  reqs.sort((a, b) => Number(b.average) - Number(a.average));

  const used = {};
  UNI_DEPARTMENTS.forEach(d => used[d] = 0);

  for (const r of reqs) {
    const choices = Array.isArray(r.choices) ? r.choices.slice(0, 5) : [];
    for (const ch of choices) {
      if (!ch) continue;
      if (cap[ch] === undefined) continue;

      if (used[ch] < cap[ch]) {
        used[ch]++;
        r.acceptedDept = ch;
        r.status = "Accepted";
        break;
      }
    }
  }

  saveRequests(reqs);

  // sync users (status + accepted dept)
  const users = getUsers();
  reqs.forEach(r => {
    const u = users.find(x => x.email === r.email);
    if (u) {
      u.status = r.status;
      u.acceptedDept = r.acceptedDept;
    }
  });
  saveUsers(users);

  alert("⚡ Allocation Done!");
  loadAdminDashboard();
}

/* =========================
   ADMIN TABLE + ACTIONS
========================= */
function loadAdminDashboard() {
  protectAdmin();

  const reqs = getRequests();
  const tbody = $("studentsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!reqs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="opacity:.7">No students registered yet.</td>
      </tr>
    `;
    return;
  }

  reqs
    .sort((a,b)=> (b.average||0) - (a.average||0))
    .forEach((r,i)=>{
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${r.fullName || "-"}</td>
        <td>${r.email}</td>
        <td>${r.section || "-"}</td>
        <td><b>${r.average || 0}</b></td>
        <td>
          <button class="small-btn" onclick="approveStudent('${r.email}')">Approve</button>
          <button class="small-btn" onclick="deleteStudent('${r.email}')">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
}

function rejectStudent(email) {
  const reqs = getRequests();
  const idx = reqs.findIndex(r => r.email === email);
  if (idx < 0) return;

  reqs[idx].status = "Rejected";
  reqs[idx].acceptedDept = null;
  saveRequests(reqs);

  const users = getUsers();
  const u = users.find(x => x.email === email);
  if (u) {
    u.status = "Rejected";
    u.acceptedDept = null;
    saveUsers(users);
  }

  loadAdminDashboard();
}

function deleteStudent(email) {
  if (!confirm("Delete this student?")) return;

  let reqs = getRequests();
  reqs = reqs.filter(r => r.email !== email);
  saveRequests(reqs);

  const users = getUsers();
  const u = users.find(x => x.email === email);
  if (u) {
    u.submitted = false;
    u.status = "Pending";
    u.acceptedDept = null;
    saveUsers(users);
  }

  loadAdminDashboard();
}

/* =========================
   PART 5: SEARCH / FILTER / SORT / TOP
   (Works if you add UI, but functions exist anyway)
========================= */
function searchStudents() {
  const text = safeText($("searchInput")?.value).toLowerCase();
  const rows = document.querySelectorAll("#studentsTableBody tr");
  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(text) ? "" : "none";
  });
}

function filterStatus(status) {
  const reqs = getRequests();
  const tbody = $("studentsTableBody");
  if (!tbody) return;

  const filtered = status === "All" ? reqs : reqs.filter(r => r.status === status);
  tbody.innerHTML = "";

  filtered
    .sort((a, b) => Number(b.average) - Number(a.average))
    .forEach((r, i) => {
      const tr = document.createElement("tr");
      const choices = (r.choices || []).join(" / ");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${r.fullName}</td>
        <td>${r.email}</td>
        <td><b>${r.average}</b></td>
        <td>${choices}</td>
        <td>${r.acceptedDept || "-"}</td>
        <td><span class="tag">${r.status}</span></td>
        <td>
          <div class="right-actions">
            <button class="small-btn" onclick="approveStudent('${r.email}')">Approve</button>
            <button class="small-btn" onclick="rejectStudent('${r.email}')">Reject</button>
            <button class="small-btn" onclick="deleteStudent('${r.email}')">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function sortByAverage() {
  const reqs = getRequests().sort((a, b) => Number(b.average) - Number(a.average));
  saveRequests(reqs);
  loadAdminDashboard();
}

function showTopStudents() {
  const reqs = getRequests().sort((a, b) => Number(b.average) - Number(a.average)).slice(0, 5);
  let msg = "🏆 TOP 5 STUDENTS\n\n";
  reqs.forEach((s, i) => msg += `${i + 1}. ${s.fullName} → ${s.average}\n`);
  alert(msg);
}

function printStudents() {
  window.print();
}

/* =========================
   STUDENT RESULT BADGE + RANK
========================= */
function showStudentResultBadge() {
  const email = getLoggedEmail();
  const user = getUsers().find(u => u.email === email);
  if (!user) return;

  const bar = document.querySelector(".topbar");
  if (!bar) return;

  // remove old badge if exists
  const old = document.getElementById("resultBadge");
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = "resultBadge";
  div.style.marginTop = "6px";
  div.style.opacity = "0.95";

  if (user.status === "Accepted") {
    div.innerHTML = `🎉 Accepted in: <b>${user.acceptedDept}</b>`;
  } else if (user.status === "Approved") {
    div.innerHTML = `✅ Approved by Admin (waiting allocation)`;
  } else if (user.status === "Rejected") {
    div.innerHTML = `❌ Rejected`;
  } else {
    div.innerHTML = `⏳ Pending Review`;
  }

  bar.appendChild(div);
}

function showMyRank() {
  const email = getLoggedEmail();
  if (!email) return;

  const reqs = getRequests().sort((a, b) => Number(b.average) - Number(a.average));
  const idx = reqs.findIndex(r => r.email === email);
  if (idx < 0) return;

  const bar = document.querySelector(".topbar");
  if (!bar) return;

  const old = document.getElementById("rankBadge");
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = "rankBadge";
  div.style.marginTop = "4px";
  div.innerHTML = `🏅 Your Rank: <b>${idx + 1}</b> / ${reqs.length}`;

  bar.appendChild(div);
}
/* =========================
   ADMIN SIDEBAR + SECTIONS + HISTORY + PROFILE
   (ADD ONCE - NO DUPLICATES)
========================= */

// ---------- SIDEBAR TOGGLE ----------
function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  sb.classList.toggle("open");
}

// close sidebar when clicking outside
document.addEventListener("click", (e) => {
  const sb = document.getElementById("sidebar");
  if (!sb) return;

  const toggleBtn = document.querySelector(".menu-toggle");
  const clickedInside = sb.contains(e.target);
  const clickedToggle = toggleBtn && toggleBtn.contains(e.target);

  if (sb.classList.contains("open") && !clickedInside && !clickedToggle) {
    sb.classList.remove("open");
  }
});

// ---------- SHOW SECTION ----------
function showSection(id) {
  document.querySelectorAll(".panel-section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");

  // refresh when opening sections (if ids exist)
  if (id === "secRequests") loadAdminDashboard();
  if (id === "secCapacity") loadCapacityToInputs();
  if (id === "secHistory") loadHistory();
  if (id === "secAccepted") loadAcceptedTable();
  if (id === "secProfile") loadAdminProfile();
}

function setActive(btn) {
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

// ---------- HISTORY ----------
const ADMIN_HISTORY_KEY = "admin_history";

function addHistory(msg) {
  const arr = JSON.parse(localStorage.getItem(ADMIN_HISTORY_KEY) || "[]");
  arr.unshift({ msg, at: new Date().toLocaleString() });
  localStorage.setItem(ADMIN_HISTORY_KEY, JSON.stringify(arr.slice(0, 200)));
}

function loadHistory() {
  const ul = document.getElementById("historyList");
  const box = document.getElementById("adminHistoryList");
  const arr = JSON.parse(localStorage.getItem(ADMIN_HISTORY_KEY) || "[]");

  // UL version
  if (ul) {
    ul.innerHTML = "";
    if (!arr.length) {
      ul.innerHTML = "<li style='opacity:.7'>No history yet.</li>";
      return;
    }
    arr.forEach(x => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${x.msg}</span><span style="opacity:.7">${x.at}</span>`;
      ul.appendChild(li);
    });
  }

  // DIV cards version
  if (box && box.tagName !== "UL" && box.tagName !== "OL") {
    if (!arr.length) {
      box.innerHTML = `<div style="opacity:.75">No history yet.</div>`;
      return;
    }
    box.innerHTML = arr.map(l => `
      <div class="h-item">
        <div class="h-text">${l.msg}</div>
        <div class="h-time">${l.at}</div>
      </div>
    `).join("");
  }
}

function clearHistory() {
  if (!confirm("Clear history?")) return;
  localStorage.removeItem(ADMIN_HISTORY_KEY);
  loadHistory();
}

// ---------- ACCEPTED TABLE (from requests) ----------
function loadAcceptedTable() {
  const body = document.getElementById("acceptedBody") || document.getElementById("acceptedTableBody");
  if (!body) return;

  const reqs = getRequests();
  const accepted = reqs.filter(r => (r.status || "").toLowerCase() === "accepted");

  body.innerHTML = "";
  if (!accepted.length) {
    body.innerHTML = `<tr><td colspan="6" style="opacity:.7">No accepted students yet.</td></tr>`;
    return;
  }

  accepted
    .sort((a, b) => (b.average || 0) - (a.average || 0))
    .forEach((r, i) => {
      body.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${r.fullName || "-"}</td>
          <td><span class="tag">${r.email}</span></td>
          <td>${r.section || "-"}</td>
          <td><b>${r.average || 0}</b></td>
          <td>${r.acceptedDept || "-"}</td>
        </tr>
      `;
    });
}

// ---------- ADMIN PROFILE (change creds local only) ----------
const ADMIN_CREDS_KEY = "admin_creds_custom";

function getAdminCreds() {
  const saved = JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || "null");
  if (saved && saved.email && saved.pass) return saved;
  return { email: ADMIN_EMAIL, pass: ADMIN_PASS };
}

function loadAdminProfile() {
  const info = getAdminCreds();
  const el = document.getElementById("adminProfileEmail");
  if (el) el.textContent = info.email || "--";
}

function updateAdminCreds() {
  const email = (document.getElementById("newAdminEmail")?.value || "").trim();
  const pass = (document.getElementById("newAdminPass")?.value || "").trim();

  const ok = document.getElementById("adminProfileMsg");
  const err = document.getElementById("adminProfileErr");
  if (ok) ok.style.display = "none";
  if (err) err.style.display = "none";

  if (!email || !pass) {
    if (err) { err.style.display = "block"; err.innerHTML = "Please fill new Email and Password."; }
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (err) { err.style.display = "block"; err.innerHTML = "Invalid email format."; }
    return;
  }
  if (pass.length < 6) {
    if (err) { err.style.display = "block"; err.innerHTML = "Password must be at least 6 characters."; }
    return;
  }

  localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify({ email, pass }));
  addHistory("Admin credentials updated");
  loadAdminProfile();

  if (ok) { ok.style.display = "block"; ok.innerHTML = "✅ Saved successfully."; }
}

// override adminLogin to use saved creds (NO duplicate redeclare)
const _oldAdminLogin = adminLogin;
adminLogin = function () {
  const email = (document.getElementById("adminEmail")?.value || "").trim();
  const password = (document.getElementById("adminPassword")?.value || "").trim();
  const err = document.getElementById("adminError");
  if (err) { err.style.display = "none"; err.innerHTML = ""; }

  if (!email || !password) {
    if (err) { err.style.display = "block"; err.innerHTML = "Please enter admin email and password."; }
    return;
  }

  const creds = getAdminCreds();
  if (email !== creds.email || password !== creds.pass) {
    if (err) { err.style.display = "block"; err.innerHTML = "Wrong admin credentials!"; }
    return;
  }

  localStorage.setItem("admin_logged", "1");
  addHistory("Admin logged in");
  window.location.href = "admin-panel.html";
};

// boot extras on admin panel
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop().toLowerCase();
  if (page === "admin-panel.html") {
    loadHistory();
    loadAcceptedTable();
    loadAdminProfile();
  }
});
function adminLogout() {
  localStorage.removeItem(DB_ADMIN_LOGGED);
  window.location.href = "admin.html";
}