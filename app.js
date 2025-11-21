// app.js — Nexus Barber Shop
// Tickets + Barberos + Agenda + Tema oscuro + Firestore por usuario + PWA

/* ========== CONFIG FIREBASE ========== */
const firebaseConfig = {
  apiKey: "AIzaSyA6-RrCXbPPVPZ4VqQRest1n_aojN-goPA",
  authDomain: "nexus-barber-shop.firebaseapp.com",
  projectId: "nexus-barber-shop",
  storageBucket: "nexus-barber-shop.firebasestorage.app",
  messagingSenderId: "524186377414",
  appId: "1:524186377414:web:909c712216dc1834454bc7"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

/* ========== ESTADO LOCAL ========== */
const LOCAL_KEY = "nexus_barber_state_v2";

let state = {
  // Seguridad
  pin: "1234",

  // Branding
  appName: "Nexus Barber Shop",
  logoUrl: "",
  pdfHeaderText: "",
  pdfFooterText: "",
  footerText: "© 2025 Nexus Barber Shop — Sistema de tickets",

  // Datos
  tickets: [],
  barbers: [],
  appointments: [],

  // Tema (dark / light)
  theme: "dark",

  // Config calendario
  calendarDisabledWeekdays: [], // ej: [0,6] = domingo y sábado
  calendarDisabledHours: [],    // ej: [0,1,2,...,8,21,22,23]

  // Usuario / listeners
  user: null,
  unsubscribeTickets: null,
  unsubscribeBarbers: null,
  unsubscribeAppointments: null
};

// Ticket en edición (por número). null = nuevo
let currentEditingNumber = null;
// Barbero en edición (por id). null = nuevo
let currentEditingBarberId = null;
// Cita en edición (por id). null = nueva
let currentEditingAppointmentId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error("Error leyendo localStorage", e);
  }
}

function saveState() {
  const copy = { ...state };
  delete copy.user;
  delete copy.unsubscribeTickets;
  delete copy.unsubscribeBarbers;
  delete copy.unsubscribeAppointments;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(copy));
}

/* ========== FIRESTORE HELPERS ========== */

function ticketsCollectionRef(uid) {
  return db.collection("users").doc(uid).collection("barberTickets");
}

function barbersCollectionRef(uid) {
  return db.collection("users").doc(uid).collection("barbers");
}

function appointmentsCollectionRef(uid) {
  return db.collection("users").doc(uid).collection("appointments");
}

function brandingDocRef(uid) {
  return db.collection("users").doc(uid).collection("branding").doc("barberShop");
}

/* ========== DOM ========== */

// vistas
const pinScreen = document.getElementById("pinScreen");
const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

// PIN
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const pinEnterBtn = document.getElementById("pinEnterBtn");

// Auth
const googleSignInBtn = document.getElementById("googleSignInBtn");
const authBackToPinBtn = document.getElementById("authBackToPinBtn");

// nav / topbar
const appNameEditable = document.getElementById("appNameEditable");
const pinAppNameTitle = document.getElementById("pinAppName");
const userEmailSpan = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const appLogoImg = document.getElementById("appLogo");
const pinLogoImg = document.getElementById("pinLogo");
const footerTextSpan = document.getElementById("footerText");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const pages = {
  dashboard: document.getElementById("page-dashboard"),
  historial: document.getElementById("page-historial"),
  caja: document.getElementById("page-caja"),
  agenda: document.getElementById("page-agenda"),
  config: document.getElementById("page-config")
};

// Tema
const themeToggleBtn = document.getElementById("themeToggleBtn");

// dashboard form (tickets)
const ticketNumberInput = document.getElementById("ticketNumber");
const ticketDateInput = document.getElementById("ticketDate");
const clientNameInput = document.getElementById("clientName");
const barberSelect = document.getElementById("barberSelect"); // combo barbero
const barberCustomInput = document.getElementById("barberCustom"); // otro barbero manual
const paymentMethodSelect = document.getElementById("paymentMethod");
const serviceDescInput = document.getElementById("serviceDesc");
const quantityInput = document.getElementById("quantity");
const unitPriceInput = document.getElementById("unitPrice");
const tipAmountInput = document.getElementById("tipAmount");
const totalAmountInput = document.getElementById("totalAmount");
const newTicketBtn = document.getElementById("newTicketBtn");
const saveTicketBtn = document.getElementById("saveTicketBtn");
const formMessage = document.getElementById("formMessage");

// historial
const ticketsTableBody = document.getElementById("ticketsTableBody");
const filterStartInput = document.getElementById("filterStart");
const filterEndInput = document.getElementById("filterEnd");
const filterBarberSelect = document.getElementById("filterBarber");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const backupJsonBtn = document.getElementById("backupJsonBtn");

// caja
const cajaStartInput = document.getElementById("cajaStart");
const cajaEndInput = document.getElementById("cajaEnd");
const cajaApplyBtn = document.getElementById("cajaApplyBtn");
const cajaClearBtn = document.getElementById("cajaClearBtn");
const cajaTotalCashSpan = document.getElementById("cajaTotalCash");
const cajaTotalAthSpan = document.getElementById("cajaTotalAth");
const cajaTotalCardSpan = document.getElementById("cajaTotalCard");
const cajaTotalAllSpan = document.getElementById("cajaTotalAll");

// Agenda / Calendario
const agendaDateInput = document.getElementById("agendaDate");
const agendaTimeInput = document.getElementById("agendaTime");
const agendaBarberSelect = document.getElementById("agendaBarber");
const agendaClientInput = document.getElementById("agendaClient");
const agendaServiceInput = document.getElementById("agendaService");
const agendaStatusSelect = document.getElementById("agendaStatus");
const agendaAddBtn = document.getElementById("agendaAddBtn");
const agendaClearBtn = document.getElementById("agendaClearBtn");
const agendaTableBody = document.getElementById("agendaTableBody");
const calendarWarning = document.getElementById("calendarWarning");

// Config (branding, PIN, calendario)
const logoUrlInput = document.getElementById("logoUrlInput");
const pdfHeaderTextArea = document.getElementById("pdfHeaderText");
const pdfFooterTextArea = document.getElementById("pdfFooterText");
const footerTextInput = document.getElementById("footerTextInput");
const newPinInput = document.getElementById("newPinInput");
const changePinBtn = document.getElementById("changePinBtn");
const pinChangeMessage = document.getElementById("pinChangeMessage");
const saveBrandingBtn = document.getElementById("saveBrandingBtn");
const brandingStatus = document.getElementById("brandingStatus");

// Config calendario
const disabledWeekdaysInput = document.getElementById("disabledWeekdaysInput"); // ej: 0,6
const disabledHoursInput = document.getElementById("disabledHoursInput");       // ej: 0-8,21-23

// Config barberos (lista editable)
const barbersTableBody = document.getElementById("barbersTableBody");
const barberNameInput = document.getElementById("barberNameInput");
const barberPercentInput = document.getElementById("barberPercentInput");
const barberSaveBtn = document.getElementById("barberSaveBtn");
const barberCancelEditBtn = document.getElementById("barberCancelEditBtn");

/* ========== RENDER BRANDING + THEME ========== */

function applyTheme() {
  const root = document.documentElement;
  if (state.theme === "dark") {
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
  } else {
    root.classList.add("theme-light");
    root.classList.remove("theme-dark");
  }

  if (themeToggleBtn) {
    themeToggleBtn.textContent =
      state.theme === "dark" ? "Tema: Oscuro" : "Tema: Claro";
  }
}

function renderBranding() {
  if (appNameEditable) {
    appNameEditable.textContent = state.appName || "Nexus Barber Shop";
  }
  if (pinAppNameTitle) {
    pinAppNameTitle.textContent = state.appName || "Nexus Barber Shop";
  }

  if (logoUrlInput) logoUrlInput.value = state.logoUrl || "";
  if (pdfHeaderTextArea) pdfHeaderTextArea.value = state.pdfHeaderText || "";
  if (pdfFooterTextArea) pdfFooterTextArea.value = state.pdfFooterText || "";
  if (footerTextInput) {
    footerTextInput.value =
      state.footerText || "© 2025 Nexus Barber Shop — Sistema de tickets";
  }
  if (footerTextSpan) {
    footerTextSpan.textContent =
      state.footerText || "© 2025 Nexus Barber Shop — Sistema de tickets";
  }

  const logoSrc =
    state.logoUrl && state.logoUrl.trim() !== ""
      ? state.logoUrl.trim()
      : "assets/logo.png";

  if (appLogoImg) appLogoImg.src = logoSrc;
  if (pinLogoImg) pinLogoImg.src = logoSrc;

  // Calendario config
  if (disabledWeekdaysInput) {
    disabledWeekdaysInput.value = state.calendarDisabledWeekdays.join(",");
  }
  if (disabledHoursInput) {
    disabledHoursInput.value = state.calendarDisabledHours.join(",");
  }

  applyTheme();
}

/* ========== UTILIDADES CALENDARIO ========== */

function parseDisabledWeekdays(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => Number(s))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
}

function parseDisabledHours(str) {
  if (!str) return [];
  const result = [];
  const parts = str.split(",");
  parts.forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map((x) => Number(x.trim()));
      if (!isNaN(a) && !isNaN(b)) {
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        for (let h = start; h <= end; h++) {
          if (h >= 0 && h <= 23 && !result.includes(h)) result.push(h);
        }
      }
    } else {
      const h = Number(trimmed);
      if (!isNaN(h) && h >= 0 && h <= 23 && !result.includes(h)) {
        result.push(h);
      }
    }
  });
  return result;
}

function isDateAllowed(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const wd = d.getDay(); // 0 domingo
  return !state.calendarDisabledWeekdays.includes(wd);
}

function isTimeAllowed(timeStr) {
  if (!timeStr) return false;
  const [hStr] = timeStr.split(":");
  const h = Number(hStr);
  if (isNaN(h)) return false;
  return !state.calendarDisabledHours.includes(h);
}

function showCalendarWarning(msg) {
  if (!calendarWarning) return;
  calendarWarning.textContent = msg || "";
}

/* ========== TICKETS: NÚMERO + TABLA + CAJA ========== */

function nextTicketNumber() {
  if (!state.tickets.length) return 1;
  const max = state.tickets.reduce(
    (m, t) => Math.max(m, Number(t.number || 0)),
    0
  );
  return max + 1;
}

function renderTicketNumber() {
  if (ticketNumberInput) {
    ticketNumberInput.value = nextTicketNumber();
  }
}

/* Historial con botones Editar / X */
function renderTicketsTable(listOverride) {
  if (!ticketsTableBody) return;
  const list = listOverride || state.tickets;
  ticketsTableBody.innerHTML = "";
  list
    .slice()
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.number || ""}</td>
        <td>${t.date || ""}</td>
        <td>${t.clientName || ""}</td>
        <td>${t.barber || ""}</td>
        <td>${t.serviceDesc || ""}</td>
        <td>${t.paymentMethod || ""}</td>
        <td>$${Number(t.totalAmount || 0).toFixed(2)}</td>
        <td>
          <button class="btn-table edit" data-action="edit" data-number="${t.number}">
            Editar
          </button>
          <button class="btn-table delete" data-action="delete" data-number="${t.number}">
            X
          </button>
        </td>
      `;
      ticketsTableBody.appendChild(tr);
    });
}

/* Caja: totales por método */
function computeCajaTotals() {
  if (!cajaTotalCashSpan) return;
  const start = cajaStartInput ? cajaStartInput.value : "";
  const end = cajaEndInput ? cajaEndInput.value : "";

  let efectivo = 0;
  let ath = 0;
  let tarjeta = 0;

  state.tickets.forEach((t) => {
    if (!t.date) return;
    if (start && t.date < start) return;
    if (end && t.date > end) return;

    const total = Number(t.totalAmount || 0);
    if (t.paymentMethod === "Efectivo") efectivo += total;
    else if (t.paymentMethod === "ATH Móvil") ath += total;
    else if (t.paymentMethod === "Tarjeta") tarjeta += total;
  });

  const all = efectivo + ath + tarjeta;

  cajaTotalCashSpan.textContent = `$${efectivo.toFixed(2)}`;
  cajaTotalAthSpan.textContent = `$${ath.toFixed(2)}`;
  cajaTotalCardSpan.textContent = `$${tarjeta.toFixed(2)}`;
  cajaTotalAllSpan.textContent = `$${all.toFixed(2)}`;
}

/* ========== VISTAS / PÁGINAS ========== */

function showPinScreen() {
  if (pinScreen) pinScreen.classList.remove("hidden");
  if (authScreen) authScreen.classList.add("hidden");
  if (appShell) appShell.classList.add("hidden");
  if (pinInput) pinInput.value = "";
  if (pinError) pinError.textContent = "";
}

function showAuthScreen() {
  if (pinScreen) pinScreen.classList.add("hidden");
  if (authScreen) authScreen.classList.remove("hidden");
  if (appShell) appShell.classList.add("hidden");
}

function showAppShell() {
  if (pinScreen) pinScreen.classList.add("hidden");
  if (authScreen) authScreen.classList.add("hidden");
  if (appShell) appShell.classList.remove("hidden");
}

function setActivePage(pageName) {
  Object.keys(pages).forEach((name) => {
    const page = pages[name];
    if (!page) return;
    page.classList.toggle("active-page", name === pageName);
  });
  navButtons.forEach((btn) => {
    const target = btn.getAttribute("data-page");
    btn.classList.toggle("nav-btn-active", target === pageName);
  });
}

/* ========== PIN ========== */

function handlePinEnter() {
  const v = (pinInput?.value || "").trim();
  if (!pinError) return;
  if (!v) {
    pinError.textContent = "Ingrese el PIN.";
    return;
  }
  if (v === state.pin) {
    pinError.textContent = "";
    if (state.user) {
      showAppShell();
    } else {
      showAuthScreen();
    }
  } else {
    pinError.textContent = "PIN incorrecto.";
  }
}

/* ========== AUTH + LISTENERS FIRESTORE ========== */

async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    state.user = user;
    if (userEmailSpan) userEmailSpan.textContent = user.email || "";
    saveState();
    startTicketsListener(user.uid);
    startBarbersListener(user.uid);
    startAppointmentsListener(user.uid);
    loadBrandingFromCloud(user.uid);
    showAppShell();
  } catch (err) {
    console.error("Error Google SignIn", err);
    alert("No se pudo iniciar sesión con Google.");
  }
}

async function signOutAndReset() {
  try {
    await auth.signOut();
  } catch (e) {
    console.error("Error signOut", e);
  }
  if (state.unsubscribeTickets) {
    state.unsubscribeTickets();
    state.unsubscribeTickets = null;
  }
  if (state.unsubscribeBarbers) {
    state.unsubscribeBarbers();
    state.unsubscribeBarbers = null;
  }
  if (state.unsubscribeAppointments) {
    state.unsubscribeAppointments();
    state.unsubscribeAppointments = null;
  }
  state.user = null;
  if (userEmailSpan) userEmailSpan.textContent = "Sin conexión a Google";
  saveState();
  showPinScreen();
}

auth.onAuthStateChanged((user) => {
  state.user = user || null;
  if (user) {
    if (userEmailSpan) userEmailSpan.textContent = user.email || "";
    startTicketsListener(user.uid);
    startBarbersListener(user.uid);
    startAppointmentsListener(user.uid);
    loadBrandingFromCloud(user.uid);
  } else {
    if (userEmailSpan) userEmailSpan.textContent = "Sin conexión a Google";
    if (state.unsubscribeTickets) {
      state.unsubscribeTickets();
      state.unsubscribeTickets = null;
    }
    if (state.unsubscribeBarbers) {
      state.unsubscribeBarbers();
      state.unsubscribeBarbers = null;
    }
    if (state.unsubscribeAppointments) {
      state.unsubscribeAppointments();
      state.unsubscribeAppointments = null;
    }
  }
});

/* LISTENERS */

function startTicketsListener(uid) {
  if (!uid) return;
  if (state.unsubscribeTickets) {
    state.unsubscribeTickets();
    state.unsubscribeTickets = null;
  }
  state.unsubscribeTickets = ticketsCollectionRef(uid)
    .orderBy("number", "asc")
    .onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push(doc.data()));
        state.tickets = arr;
        saveState();
        renderTicketNumber();
        renderTicketsTable();
        computeCajaTotals();
      },
      (err) => console.error("onSnapshot tickets error", err)
    );
}

function startBarbersListener(uid) {
  if (!uid) return;
  if (state.unsubscribeBarbers) {
    state.unsubscribeBarbers();
    state.unsubscribeBarbers = null;
  }
  state.unsubscribeBarbers = barbersCollectionRef(uid)
    .orderBy("name", "asc")
    .onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        state.barbers = arr;
        saveState();
        renderBarbersUI();
        renderBarbersInSelects();
      },
      (err) => console.error("onSnapshot barbers error", err)
    );
}

function startAppointmentsListener(uid) {
  if (!uid) return;
  if (state.unsubscribeAppointments) {
    state.unsubscribeAppointments();
    state.unsubscribeAppointments = null;
  }
  state.unsubscribeAppointments = appointmentsCollectionRef(uid)
    .orderBy("date", "asc")
    .orderBy("time", "asc")
    .onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        state.appointments = arr;
        saveState();
        renderAgendaTable();
      },
      (err) => console.error("onSnapshot appointments error", err)
    );
}

/* ========== TICKETS: FORM ========== */

function recalcTotal() {
  const qty = Number(quantityInput?.value || 0);
  const unit = Number(unitPriceInput?.value || 0);
  const tip = Number(tipAmountInput?.value || 0);
  const subtotal = qty * unit;
  const total = subtotal + tip;
  if (totalAmountInput) totalAmountInput.value = total.toFixed(2);
}

function resetFormForNewTicket() {
  const today = new Date();
  if (ticketDateInput) {
    ticketDateInput.value = today.toISOString().slice(0, 10);
  }
  if (clientNameInput) clientNameInput.value = "";
  if (barberSelect) barberSelect.value = "";
  if (barberCustomInput) barberCustomInput.value = "";
  if (paymentMethodSelect) paymentMethodSelect.value = "";
  if (serviceDescInput) serviceDescInput.value = "";
  if (quantityInput) quantityInput.value = 1;
  if (unitPriceInput) unitPriceInput.value = "";
  if (tipAmountInput) tipAmountInput.value = "";
  recalcTotal();
  renderTicketNumber();
  if (formMessage) formMessage.textContent = "";
  currentEditingNumber = null;
}

function collectTicketFromForm() {
  const number = Number(ticketNumberInput?.value || 0);
  const date = ticketDateInput?.value;
  const clientName = (clientNameInput?.value || "").trim();
  const barberPre = barberSelect?.value || "";
  const barberCustom = (barberCustomInput?.value || "").trim();
  const barber = barberCustom || barberPre || "";
  const paymentMethod = paymentMethodSelect?.value || "";
  const serviceDesc = (serviceDescInput?.value || "").trim();
  const quantity = Number(quantityInput?.value || 0);
  const unitPrice = Number(unitPriceInput?.value || 0);
  const tipAmount = Number(tipAmountInput?.value || 0);
  const totalAmount = Number(totalAmountInput?.value || 0);

  if (
    !number ||
    !date ||
    !clientName ||
    !barber ||
    !paymentMethod ||
    !serviceDesc ||
    quantity <= 0 ||
    unitPrice < 0
  ) {
    throw new Error("Faltan campos requeridos.");
  }

  return {
    number,
    date,
    clientName,
    barber,
    paymentMethod,
    serviceDesc,
    quantity,
    unitPrice,
    tipAmount,
    totalAmount,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function saveTicket() {
  const uid = state.user?.uid;
  if (!uid) {
    if (formMessage)
      formMessage.textContent = "Conéctate con Google antes de guardar tickets.";
    return;
  }
  try {
    const ticket = collectTicketFromForm();
    const docId = String(ticket.number);
    await ticketsCollectionRef(uid).doc(docId).set(ticket, { merge: true });
    if (formMessage) {
      formMessage.textContent = currentEditingNumber
        ? "Ticket actualizado correctamente."
        : "Ticket guardado y sincronizado con Firebase.";
    }
    currentEditingNumber = null;
    resetFormForNewTicket();
  } catch (err) {
    console.error("Error guardando ticket", err);
    if (formMessage) {
      formMessage.textContent = err.message || "Error al guardar el ticket.";
    }
  }
}

/* ========== BRANDING EN FIRESTORE (POR USUARIO) ========== */

async function loadBrandingFromCloud(uid) {
  if (!uid) return;
  try {
    const snap = await brandingDocRef(uid).get();
    if (snap.exists) {
      const data = snap.data();
      if (data.appName) state.appName = data.appName;
      if (data.logoUrl !== undefined) state.logoUrl = data.logoUrl;
      if (data.pdfHeaderText !== undefined)
        state.pdfHeaderText = data.pdfHeaderText;
      if (data.pdfFooterText !== undefined)
        state.pdfFooterText = data.pdfFooterText;
      if (data.footerText !== undefined) state.footerText = data.footerText;
      if (Array.isArray(data.calendarDisabledWeekdays)) {
        state.calendarDisabledWeekdays = data.calendarDisabledWeekdays;
      }
      if (Array.isArray(data.calendarDisabledHours)) {
        state.calendarDisabledHours = data.calendarDisabledHours;
      }
      if (data.theme === "light" || data.theme === "dark") {
        state.theme = data.theme;
      }
      saveState();
      renderBranding();
    }
  } catch (e) {
    console.error("Error cargando branding", e);
  }
}

async function saveBrandingToCloud() {
  const uid = state.user?.uid;
  if (!uid) {
    if (brandingStatus)
      brandingStatus.textContent =
        "Conéctate con Google para guardar branding.";
    return;
  }
  try {
    const payload = {
      appName: state.appName,
      logoUrl: state.logoUrl || "",
      pdfHeaderText: state.pdfHeaderText || "",
      pdfFooterText: state.pdfFooterText || "",
      footerText: state.footerText || "",
      calendarDisabledWeekdays: state.calendarDisabledWeekdays,
      calendarDisabledHours: state.calendarDisabledHours,
      theme: state.theme
    };
    await brandingDocRef(uid).set(payload, { merge: true });
    if (brandingStatus)
      brandingStatus.textContent = "Branding guardado en Firebase.";
  } catch (e) {
    console.error("Error guardando branding", e);
    if (brandingStatus) brandingStatus.textContent = "Error al guardar branding.";
  }
}

/* ========== FILTROS / LISTA ========== */

function getFilteredTickets() {
  const start = filterStartInput ? filterStartInput.value : "";
  const end = filterEndInput ? filterEndInput.value : "";
  const barberFilter = filterBarberSelect ? filterBarberSelect.value : "";

  return state.tickets.filter((t) => {
    let ok = true;
    if (start && t.date < start) ok = false;
    if (end && t.date > end) ok = false;
    if (barberFilter && t.barber !== barberFilter) ok = false;
    return ok;
  });
}

/* ========== PDF + BACKUP JSON ========== */

function exportTicketsToPDF() {
  const jsPDFLib = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFLib) {
    alert("La librería jsPDF no se cargó.");
    return;
  }

  const list = getFilteredTickets();
  if (!list.length) {
    alert("No hay tickets para exportar con el filtro actual.");
    return;
  }

  const doc = new jsPDFLib({ orientation: "p", unit: "mm", format: "a4" });

  const marginLeft = 12;

  const col = {
    num: marginLeft,
    date: marginLeft + 12,
    client: marginLeft + 38,
    barber: marginLeft + 80,
    service: marginLeft + 112,
    method: marginLeft + 150,
    total: 200
  };

  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(state.appName || "Nexus Barber Shop", marginLeft, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (state.pdfHeaderText) {
    const lines = doc.splitTextToSize(state.pdfHeaderText, 180);
    doc.text(lines, marginLeft, y);
    y += lines.length * 4 + 2;
  } else {
    y += 2;
  }

  const now = new Date();
  doc.text(`Generado: ${now.toLocaleString()}`, marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("#", col.num, y);
  doc.text("Fecha", col.date, y);
  doc.text("Cliente", col.client, y);
  doc.text("Barbero", col.barber, y);
  doc.text("Servicio", col.service, y);
  doc.text("Método", col.method, y);
  doc.text("Total", col.total, y, { align: "right" });
  y += 4;

  doc.setFont("helvetica", "normal");

  let grandTotal = 0;

  list.forEach((t) => {
    if (y > 270) {
      doc.addPage();
      y = 14;
    }

    const total = Number(t.totalAmount || 0);
    grandTotal += total;

    doc.text(String(t.number || ""), col.num, y);
    doc.text(String(t.date || ""), col.date, y);
    doc.text(String(t.clientName || "").substring(0, 18), col.client, y);
    doc.text(String(t.barber || "").substring(0, 14), col.barber, y);
    doc.text(String(t.serviceDesc || "").substring(0, 20), col.service, y);
    doc.text(String(t.paymentMethod || ""), col.method, y);
    doc.text(`$${total.toFixed(2)}`, col.total, y, { align: "right" });

    y += 4;
  });

  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`GRAN TOTAL: $${grandTotal.toFixed(2)}`, marginLeft, y);

  if (state.pdfFooterText) {
    const footerLines = doc.splitTextToSize(state.pdfFooterText, 180);
    doc.setFontSize(9);
    doc.text(footerLines, marginLeft, 288);
  }

  doc.save("tickets-nexus-barber-shop.pdf");
}

function downloadBackupJson() {
  const payload = {
    appName: state.appName,
    tickets: state.tickets,
    barbers: state.barbers,
    appointments: state.appointments,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-nexus-barber-shop.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========== CAMBIAR PIN ========== */

function changePin() {
  if (!newPinInput || !pinChangeMessage) return;
  const newPin = (newPinInput.value || "").trim();
  if (!newPin || newPin.length < 4) {
    pinChangeMessage.textContent = "El PIN debe tener al menos 4 dígitos.";
    return;
  }
  state.pin = newPin;
  saveState();
  pinChangeMessage.textContent = "PIN actualizado correctamente.";
  newPinInput.value = "";
}

/* ========== BARBERS UI + CRUD ========== */

function renderBarbersUI() {
  if (!barbersTableBody) return;
  barbersTableBody.innerHTML = "";
  state.barbers.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name || ""}</td>
      <td>${(b.percent || 0).toFixed(0)}%</td>
      <td>
        <button class="btn-table edit" data-barber-id="${b.id}">Editar</button>
        <button class="btn-table delete" data-barber-id="${b.id}">X</button>
      </td>
    `;
    barbersTableBody.appendChild(tr);
  });
}

function renderBarbersInSelects() {
  const barbersNames = state.barbers.map((b) => b.name);

  if (barberSelect) {
    const current = barberSelect.value;
    barberSelect.innerHTML = `<option value="">Seleccionar...</option>`;
    barbersNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      barberSelect.appendChild(opt);
    });
    if (current && barbersNames.includes(current)) {
      barberSelect.value = current;
    }
  }

  if (filterBarberSelect) {
    const currentF = filterBarberSelect.value;
    filterBarberSelect.innerHTML = `<option value="">Todos</option>`;
    barbersNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      filterBarberSelect.appendChild(opt);
    });
    if (currentF && barbersNames.includes(currentF)) {
      filterBarberSelect.value = currentF;
    }
  }

  if (agendaBarberSelect) {
    const currentA = agendaBarberSelect.value;
    agendaBarberSelect.innerHTML = `<option value="">Seleccionar...</option>`;
    barbersNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      agendaBarberSelect.appendChild(opt);
    });
    if (currentA && barbersNames.includes(currentA)) {
      agendaBarberSelect.value = currentA;
    }
  }
}

async function addBarber(name, percent) {
  const uid = state.user?.uid;
  if (!uid) {
    alert("Inicia sesión con Google para gestionar barberos.");
    return;
  }
  await barbersCollectionRef(uid).add({
    name,
    percent: Number(percent) || 0
  });
}

async function updateBarber(id, name, percent) {
  const uid = state.user?.uid;
  if (!uid || !id) return;
  await barbersCollectionRef(uid)
    .doc(id)
    .set(
      {
        name,
        percent: Number(percent) || 0
      },
      { merge: true }
    );
}

async function deleteBarber(id) {
  const uid = state.user?.uid;
  if (!uid || !id) return;
  const ok = confirm("¿Eliminar barbero?");
  if (!ok) return;
  await barbersCollectionRef(uid).doc(id).delete();
}

/* ========== AGENDA / CALENDARIO: UI + CRUD ========== */

function renderAgendaTable() {
  if (!agendaTableBody) return;
  agendaTableBody.innerHTML = "";
  state.appointments
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .forEach((ap) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${ap.date || ""}</td>
        <td>${ap.time || ""}</td>
        <td>${ap.barber || ""}</td>
        <td>${ap.clientName || ""}</td>
        <td>${ap.serviceDesc || ""}</td>
        <td>${ap.status || ""}</td>
        <td>
          <button class="btn-table edit" data-appt-id="${ap.id}">Editar</button>
          <button class="btn-table delete" data-appt-id="${ap.id}">X</button>
        </td>
      `;
      agendaTableBody.appendChild(tr);
    });
}

function collectAppointmentFromForm() {
  const date = agendaDateInput?.value;
  const time = agendaTimeInput?.value;
  const barber = agendaBarberSelect?.value || "";
  const clientName = (agendaClientInput?.value || "").trim();
  const serviceDesc = (agendaServiceInput?.value || "").trim();
  const status = agendaStatusSelect?.value || "Pendiente";

  if (!date || !time || !barber || !clientName || !serviceDesc) {
    throw new Error("Faltan campos requeridos en la cita.");
  }

  if (!isDateAllowed(date)) {
    throw new Error("La fecha seleccionada está deshabilitada en el calendario.");
  }
  if (!isTimeAllowed(time)) {
    throw new Error("La hora seleccionada está deshabilitada en el calendario.");
  }

  return {
    date,
    time,
    barber,
    clientName,
    serviceDesc,
    status
  };
}

function resetAgendaForm() {
  const today = new Date().toISOString().slice(0, 10);
  if (agendaDateInput) agendaDateInput.value = today;
  if (agendaTimeInput) agendaTimeInput.value = "";
  if (agendaBarberSelect) agendaBarberSelect.value = "";
  if (agendaClientInput) agendaClientInput.value = "";
  if (agendaServiceInput) agendaServiceInput.value = "";
  if (agendaStatusSelect) agendaStatusSelect.value = "Pendiente";
  currentEditingAppointmentId = null;
  showCalendarWarning("");
}

async function saveAppointment() {
  const uid = state.user?.uid;
  if (!uid) {
    alert("Conéctate con Google para gestionar citas.");
    return;
  }
  try {
    const ap = collectAppointmentFromForm();
    if (!ap) return;
    const col = appointmentsCollectionRef(uid);
    if (currentEditingAppointmentId) {
      await col.doc(currentEditingAppointmentId).set(ap, { merge: true });
    } else {
      await col.add(ap);
    }
    resetAgendaForm();
  } catch (e) {
    console.error(e);
    showCalendarWarning(e.message || "Error guardando cita.");
  }
}

async function deleteAppointment(id) {
  const uid = state.user?.uid;
  if (!uid || !id) return;
  const ok = confirm("¿Eliminar la cita?");
  if (!ok) return;
  await appointmentsCollectionRef(uid).doc(id).delete();
}

/* ========== EVENTOS ========== */

// PIN
if (pinEnterBtn) {
  pinEnterBtn.addEventListener("click", handlePinEnter);
}
if (pinInput) {
  pinInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handlePinEnter();
  });
}

// Auth
if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", signInWithGoogle);
}
if (authBackToPinBtn) {
  authBackToPinBtn.addEventListener("click", showPinScreen);
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", signOutAndReset);
}

// Navegación
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.getAttribute("data-page");
    setActivePage(page);
  });
});

// Branding / nombre app
if (appNameEditable) {
  appNameEditable.addEventListener("input", () => {
    state.appName = appNameEditable.textContent.trim() || "Nexus Barber Shop";
    saveState();
    renderBranding();
  });
}

if (logoUrlInput) {
  logoUrlInput.addEventListener("input", () => {
    state.logoUrl = logoUrlInput.value.trim();
    saveState();
    renderBranding();
  });
}

if (pdfHeaderTextArea) {
  pdfHeaderTextArea.addEventListener("input", () => {
    state.pdfHeaderText = pdfHeaderTextArea.value;
    saveState();
  });
}

if (pdfFooterTextArea) {
  pdfFooterTextArea.addEventListener("input", () => {
    state.pdfFooterText = pdfFooterTextArea.value;
    saveState();
  });
}

if (footerTextInput) {
  footerTextInput.addEventListener("input", () => {
    state.footerText = footerTextInput.value;
    saveState();
    if (footerTextSpan) footerTextSpan.textContent = state.footerText;
  });
}

if (saveBrandingBtn) {
  saveBrandingBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveBrandingToCloud();
  });
}

// Tema
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    applyTheme();
    saveBrandingToCloud();
  });
}

// Cambiar PIN
if (changePinBtn) {
  changePinBtn.addEventListener("click", (e) => {
    e.preventDefault();
    changePin();
  });
}

// Tickets: nuevo / guardar
if (newTicketBtn) {
  newTicketBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetFormForNewTicket();
  });
}

if (quantityInput) quantityInput.addEventListener("input", recalcTotal);
if (unitPriceInput) unitPriceInput.addEventListener("input", recalcTotal);
if (tipAmountInput) tipAmountInput.addEventListener("input", recalcTotal);

if (saveTicketBtn) {
  saveTicketBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveTicket();
  });
}

// Historial: filtros
if (applyFilterBtn) {
  applyFilterBtn.addEventListener("click", () => {
    const list = getFilteredTickets();
    renderTicketsTable(list);
  });
}

if (clearFilterBtn) {
  clearFilterBtn.addEventListener("click", () => {
    if (filterStartInput) filterStartInput.value = "";
    if (filterEndInput) filterEndInput.value = "";
    if (filterBarberSelect) filterBarberSelect.value = "";
    renderTicketsTable();
  });
}

// Caja
if (cajaApplyBtn) {
  cajaApplyBtn.addEventListener("click", () => {
    computeCajaTotals();
  });
}

if (cajaClearBtn) {
  cajaClearBtn.addEventListener("click", () => {
    const today = new Date().toISOString().slice(0, 10);
    if (cajaStartInput) cajaStartInput.value = today;
    if (cajaEndInput) cajaEndInput.value = today;
    computeCajaTotals();
  });
}

// Export PDF / Backup
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportTicketsToPDF);
}
if (backupJsonBtn) {
  backupJsonBtn.addEventListener("click", downloadBackupJson);
}

// Tabla historial: editar / borrar tickets
if (ticketsTableBody) {
  ticketsTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const number = Number(btn.dataset.number);
    if (!number) return;

    const ticket = state.tickets.find((t) => Number(t.number) === number);
    if (!ticket) return;

    if (action === "edit") {
      currentEditingNumber = number;
      if (ticketNumberInput) ticketNumberInput.value = ticket.number;
      if (ticketDateInput) ticketDateInput.value = ticket.date;
      if (clientNameInput) clientNameInput.value = ticket.clientName;
      if (serviceDescInput) serviceDescInput.value = ticket.serviceDesc;
      if (quantityInput) quantityInput.value = ticket.quantity;
      if (unitPriceInput) unitPriceInput.value = ticket.unitPrice;
      if (tipAmountInput) tipAmountInput.value = ticket.tipAmount || 0;

      if (barberSelect && barberCustomInput) {
        const names = state.barbers.map((b) => b.name);
        if (names.includes(ticket.barber)) {
          barberSelect.value = ticket.barber;
          barberCustomInput.value = "";
        } else {
          barberSelect.value = "";
          barberCustomInput.value = ticket.barber || "";
        }
      }

      if (paymentMethodSelect)
        paymentMethodSelect.value = ticket.paymentMethod;

      recalcTotal();
      if (formMessage)
        formMessage.textContent = `Editando ticket #${ticket.number}`;
      setActivePage("dashboard");
    }

    if (action === "delete") {
      const uid = state.user?.uid;
      if (!uid) {
        alert("Conéctate con Google para eliminar tickets.");
        return;
      }
      const ok = confirm(`¿Eliminar el ticket #${number}?`);
      if (!ok) return;
      try {
        await ticketsCollectionRef(uid).doc(String(number)).delete();
      } catch (err) {
        console.error("Error eliminando ticket", err);
        alert("No se pudo eliminar el ticket.");
      }
    }
  });
}

// Barbers: tabla editar / eliminar
if (barbersTableBody) {
  barbersTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.barberId;
    const action = btn.classList.contains("edit") ? "edit" : "delete";
    const barber = state.barbers.find((b) => b.id === id);
    if (!barber) return;

    if (action === "edit") {
      currentEditingBarberId = id;
      if (barberNameInput) barberNameInput.value = barber.name || "";
      if (barberPercentInput)
        barberPercentInput.value = barber.percent || 0;
    } else if (action === "delete") {
      deleteBarber(id);
    }
  });
}

if (barberSaveBtn) {
  barberSaveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = (barberNameInput?.value || "").trim();
    const percent = Number(barberPercentInput?.value || 0);
    if (!name) {
      alert("Escribe el nombre del barbero.");
      return;
    }
    if (currentEditingBarberId) {
      await updateBarber(currentEditingBarberId, name, percent);
    } else {
      await addBarber(name, percent);
    }
    if (barberNameInput) barberNameInput.value = "";
    if (barberPercentInput) barberPercentInput.value = "";
    currentEditingBarberId = null;
  });
}

if (barberCancelEditBtn) {
  barberCancelEditBtn.addEventListener("click", (e) => {
    e.preventDefault();
    currentEditingBarberId = null;
    if (barberNameInput) barberNameInput.value = "";
    if (barberPercentInput) barberPercentInput.value = "";
  });
}

// Agenda: guardar / limpiar
if (agendaAddBtn) {
  agendaAddBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveAppointment();
  });
}
if (agendaClearBtn) {
  agendaClearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetAgendaForm();
  });
}

// Agenda: tabla editar / borrar
if (agendaTableBody) {
  agendaTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.apptId;
    const isEdit = btn.classList.contains("edit");
    const ap = state.appointments.find((a) => a.id === id);
    if (!ap) return;

    if (isEdit) {
      currentEditingAppointmentId = id;
      if (agendaDateInput) agendaDateInput.value = ap.date || "";
      if (agendaTimeInput) agendaTimeInput.value = ap.time || "";
      if (agendaBarberSelect) agendaBarberSelect.value = ap.barber || "";
      if (agendaClientInput) agendaClientInput.value = ap.clientName || "";
      if (agendaServiceInput) agendaServiceInput.value = ap.serviceDesc || "";
      if (agendaStatusSelect) agendaStatusSelect.value = ap.status || "Pendiente";
      setActivePage("agenda");
    } else {
      deleteAppointment(id);
    }
  });
}

// Calendario: avisos si se escoge algo deshabilitado
if (agendaDateInput) {
  agendaDateInput.addEventListener("change", () => {
    const d = agendaDateInput.value;
    if (d && !isDateAllowed(d)) {
      showCalendarWarning("Ese día está deshabilitado en el calendario.");
    } else {
      showCalendarWarning("");
    }
  });
}
if (agendaTimeInput) {
  agendaTimeInput.addEventListener("change", () => {
    const t = agendaTimeInput.value;
    if (t && !isTimeAllowed(t)) {
      showCalendarWarning("Esa hora está deshabilitada en el calendario.");
    } else {
      showCalendarWarning("");
    }
  });
}

// Config calendario: guardar cambios en disabled días/horas
if (disabledWeekdaysInput) {
  disabledWeekdaysInput.addEventListener("input", () => {
    state.calendarDisabledWeekdays = parseDisabledWeekdays(
      disabledWeekdaysInput.value
    );
    saveState();
  });
}
if (disabledHoursInput) {
  disabledHoursInput.addEventListener("input", () => {
    state.calendarDisabledHours = parseDisabledHours(
      disabledHoursInput.value
    );
    saveState();
  });
}

/* ========== INIT + PWA ========== */

function init() {
  loadState();
  renderBranding();
  renderTicketNumber();
  renderTicketsTable(state.tickets);

  const today = new Date().toISOString().slice(0, 10);
  if (cajaStartInput) cajaStartInput.value = today;
  if (cajaEndInput) cajaEndInput.value = today;
  computeCajaTotals();

  resetFormForNewTicket();
  resetAgendaForm();
  setActivePage("dashboard");
  showPinScreen();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("SW error", err));
  }
}

init();
