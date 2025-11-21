// app.js — Nexus Barber Shop
// Tickets + Caja + Agenda + Comisiones + Barberos + Branding + PIN + Firebase

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
const LOCAL_KEY = "nexus_barber_state_v1";

let state = {
  pin: "1234",
  appName: "Nexus Barber Shop",
  logoUrl: "",
  pdfHeaderText: "",
  pdfFooterText: "",
  footerText: "© 2025 Nexus Barber Shop — Sistema de tickets",
  theme: "dark",
  tickets: [],
  barbers: [],
  agenda: [],
  disabledWeekdays: "",
  disabledHours: "",
  user: null,
  unsubscribeTickets: null,
  unsubscribeBarbers: null,
  unsubscribeAgenda: null
};

// Ticket que se está editando (por número). null = nuevo.
let currentEditingNumber = null;
// Barbero que se está editando (por id). null = nuevo.
let currentBarberId = null;
// Cita que se está editando (por id). Para ahora solo borramos, sin edición.
let currentAgendaId = null;

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
  delete copy.unsubscribeAgenda;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(copy));
}

/* ========== FIRESTORE HELPERS ========== */
function userDoc() {
  if (!state.user) return null;
  return db.collection("users").doc(state.user.uid);
}

function ticketsCollectionRef() {
  const u = userDoc();
  return u ? u.collection("tickets") : null;
}

function barbersCollectionRef() {
  const u = userDoc();
  return u ? u.collection("barbers") : null;
}

function settingsDocRef() {
  const u = userDoc();
  return u ? u.collection("settings").doc("barberApp") : null;
}

function agendaCollectionRef() {
  const u = userDoc();
  return u ? u.collection("appointments") : null;
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
  comisiones: document.getElementById("page-comisiones"),
  config: document.getElementById("page-config")
};

// dashboard form
const ticketNumberInput = document.getElementById("ticketNumber");
const ticketDateInput = document.getElementById("ticketDate");
const clientNameInput = document.getElementById("clientName");
const barberSelect = document.getElementById("barberSelect");
const barberCustomInput = document.getElementById("barberCustom");
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
const filterBarber = document.getElementById("filterBarber");
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

// agenda
const agendaDateInput = document.getElementById("agendaDate");
const agendaTimeInput = document.getElementById("agendaTime");
const agendaBarberSelect = document.getElementById("agendaBarber");
const agendaStatusSelect = document.getElementById("agendaStatus");
const agendaClientInput = document.getElementById("agendaClient");
const agendaServiceInput = document.getElementById("agendaService");
const agendaAddBtn = document.getElementById("agendaAddBtn");
const agendaClearBtn = document.getElementById("agendaClearBtn");
const agendaTableBody = document.getElementById("agendaTableBody");
const calendarWarning = document.getElementById("calendarWarning");

// config / branding
const logoUrlInput = document.getElementById("logoUrlInput");
const pdfHeaderTextArea = document.getElementById("pdfHeaderText");
const pdfFooterTextArea = document.getElementById("pdfFooterText");
const footerTextInput = document.getElementById("footerTextInput");
const newPinInput = document.getElementById("newPinInput");
const changePinBtn = document.getElementById("changePinBtn");
const pinChangeMessage = document.getElementById("pinChangeMessage");
const saveBrandingBtn = document.getElementById("saveBrandingBtn");
const brandingStatus = document.getElementById("brandingStatus");

// config calendario
const disabledWeekdaysInput = document.getElementById("disabledWeekdaysInput");
const disabledHoursInput = document.getElementById("disabledHoursInput");

// barberos (config)
const barbersTableBody = document.getElementById("barbersTableBody");
const barberNameInput = document.getElementById("barberNameInput");
const barberPercentInput = document.getElementById("barberPercentInput");
const barberSaveBtn = document.getElementById("barberSaveBtn");
const barberCancelEditBtn = document.getElementById("barberCancelEditBtn");

// comisiones
const comiStartInput = document.getElementById("comiStart");
const comiEndInput = document.getElementById("comiEnd");
const comiBarberSelect = document.getElementById("comiBarber");
const comiApplyBtn = document.getElementById("comiApplyBtn");
const comiClearBtn = document.getElementById("comiClearBtn");
const comiTableBody = document.getElementById("comiTableBody");
const comiTotalSpan = document.getElementById("comiTotal");

/* ========== RENDER: BRANDING, TICKETS, CAJA ========== */
function renderBranding() {
  appNameEditable.textContent = state.appName || "Nexus Barber Shop";
  pinAppNameTitle.textContent = state.appName || "Nexus Barber Shop";

  logoUrlInput.value = state.logoUrl || "";
  pdfHeaderTextArea.value = state.pdfHeaderText || "";
  pdfFooterTextArea.value = state.pdfFooterText || "";
  footerTextInput.value = state.footerText || "© 2025 Nexus Barber Shop — Sistema de tickets";
  footerTextSpan.textContent = state.footerText || "© 2025 Nexus Barber Shop — Sistema de tickets";

  disabledWeekdaysInput.value = state.disabledWeekdays || "";
  disabledHoursInput.value = state.disabledHours || "";

  const logoSrc = state.logoUrl && state.logoUrl.trim() !== ""
    ? state.logoUrl.trim()
    : "assets/logo.png";
  appLogoImg.src = logoSrc;
  pinLogoImg.src = logoSrc;
}

function nextTicketNumber() {
  if (!state.tickets.length) return 1;
  const max = state.tickets.reduce(
    (m, t) => Math.max(m, Number(t.number || 0)),
    0
  );
  return max + 1;
}

function renderTicketNumber() {
  ticketNumberInput.value = nextTicketNumber();
}

/* Historial con botones Editar / X */
function renderTicketsTable(listOverride) {
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

/* CAJA: totales por método */
function computeCajaTotals() {
  const start = cajaStartInput.value;
  const end = cajaEndInput.value;

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
  pinScreen.classList.remove("hidden");
  authScreen.classList.add("hidden");
  appShell.classList.add("hidden");
  pinInput.value = "";
  pinError.textContent = "";
}

function showAuthScreen() {
  pinScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showAppShell() {
  pinScreen.classList.add("hidden");
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function setActivePage(pageName) {
  Object.keys(pages).forEach((name) => {
    pages[name].classList.toggle("active-page", name === pageName);
  });
  navButtons.forEach((btn) => {
    const target = btn.getAttribute("data-page");
    btn.classList.toggle("nav-btn-active", target === pageName);
  });
}

/* ========== PIN ========== */
function handlePinEnter() {
  const v = (pinInput.value || "").trim();
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

/* ========== AUTH GOOGLE + LISTENERS FIRESTORE ========== */

function startTicketsListener() {
  if (state.unsubscribeTickets) {
    state.unsubscribeTickets();
    state.unsubscribeTickets = null;
  }
  const col = ticketsCollectionRef();
  if (!col) return;

  state.unsubscribeTickets = col
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
        // refrescar comisiones también
        renderCommissions();
      },
      (err) => {
        console.error("onSnapshot tickets error", err);
      }
    );
}

function startBarbersListener() {
  if (state.unsubscribeBarbers) {
    state.unsubscribeBarbers();
    state.unsubscribeBarbers = null;
  }
  const col = barbersCollectionRef();
  if (!col) return;

  state.unsubscribeBarbers = col.onSnapshot(
    (snap) => {
      const arr = [];
      snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
      if (arr.length === 0) {
        // si no hay, usamos defaults en memoria
        if (!state.barbers || state.barbers.length === 0) {
          state.barbers = getDefaultBarbers();
        }
      } else {
        state.barbers = arr;
      }
      saveState();
      renderBarbersTable();
      loadBarbersIntoSelects();
      renderCommissions();
    },
    (err) => {
      console.error("onSnapshot barbers error", err);
    }
  );
}

function startAgendaListener() {
  if (state.unsubscribeAgenda) {
    state.unsubscribeAgenda();
    state.unsubscribeAgenda = null;
  }
  const col = agendaCollectionRef();
  if (!col) return;

  state.unsubscribeAgenda = col
    .orderBy("date", "asc")
    .orderBy("time", "asc")
    .onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        state.agenda = arr;
        saveState();
        renderAgendaTable();
      },
      (err) => {
        console.error("onSnapshot agenda error", err);
      }
    );
}

async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    state.user = user;
    userEmailSpan.textContent = user.email || "";
    saveState();

    await loadBrandingFromCloud();
    await ensureDefaultBarbersInCloud();

    startTicketsListener();
    startBarbersListener();
    startAgendaListener();

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
  if (state.unsubscribeAgenda) {
    state.unsubscribeAgenda();
    state.unsubscribeAgenda = null;
  }
  state.user = null;
  userEmailSpan.textContent = "Sin conexión a Google";
  saveState();
  showPinScreen();
}

auth.onAuthStateChanged((user) => {
  state.user = user || null;
  if (user) {
    userEmailSpan.textContent = user.email || "";
    startTicketsListener();
    startBarbersListener();
    startAgendaListener();
  } else {
    userEmailSpan.textContent = "Sin conexión a Google";
    if (state.unsubscribeTickets) state.unsubscribeTickets();
    if (state.unsubscribeBarbers) state.unsubscribeBarbers();
    if (state.unsubscribeAgenda) state.unsubscribeAgenda();
    state.unsubscribeTickets = null;
    state.unsubscribeBarbers = null;
    state.unsubscribeAgenda = null;
  }
});

/* ========== DASHBOARD: TICKETS ========== */
function recalcTotal() {
  const qty = Number(quantityInput.value || 0);
  const unit = Number(unitPriceInput.value || 0);
  const tip = Number(tipAmountInput.value || 0);
  const subtotal = qty * unit;
  const total = subtotal + tip;
  totalAmountInput.value = total.toFixed(2);
}

function resetFormForNewTicket() {
  const today = new Date();
  ticketDateInput.value = today.toISOString().slice(0, 10);
  clientNameInput.value = "";
  barberSelect.value = "";
  barberCustomInput.value = "";
  paymentMethodSelect.value = "";
  serviceDescInput.value = "";
  quantityInput.value = 1;
  unitPriceInput.value = "";
  tipAmountInput.value = "";
  recalcTotal();
  ticketNumberInput.value = nextTicketNumber();
  formMessage.textContent = "";
  currentEditingNumber = null;
}

function collectTicketFromForm() {
  const number = Number(ticketNumberInput.value || 0);
  const date = ticketDateInput.value;
  const clientName = clientNameInput.value.trim();
  const barberPre = barberSelect.value;
  const barberCustom = barberCustomInput.value.trim();
  const barber = barberCustom || barberPre || "";
  const paymentMethod = paymentMethodSelect.value;
  const serviceDesc = serviceDescInput.value.trim();
  const quantity = Number(quantityInput.value || 0);
  const unitPrice = Number(unitPriceInput.value || 0);
  const tipAmount = Number(tipAmountInput.value || 0);
  const totalAmount = Number(totalAmountInput.value || 0);

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
  if (!state.user) {
    formMessage.textContent = "Conéctate con Google antes de guardar tickets.";
    return;
  }
  try {
    const ticket = collectTicketFromForm();
    const col = ticketsCollectionRef();
    if (!col) {
      throw new Error("No se encontró la colección de tickets.");
    }
    const docId = String(ticket.number);

    await col.doc(docId).set(ticket, { merge: true });

    formMessage.textContent = currentEditingNumber
      ? "Ticket actualizado correctamente."
      : "Ticket guardado y sincronizado con Firebase.";

    currentEditingNumber = null;
    resetFormForNewTicket();
  } catch (err) {
    console.error("Error guardando ticket", err);
    formMessage.textContent = err.message || "Error al guardar el ticket.";
  }
}

/* ========== BRANDING EN FIRESTORE (POR USUARIO) ========== */

async function loadBrandingFromCloud() {
  if (!state.user) return;
  const docRef = settingsDocRef();
  if (!docRef) return;
  try {
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (data.appName) state.appName = data.appName;
      if (data.logoUrl !== undefined) state.logoUrl = data.logoUrl;
      if (data.pdfHeaderText !== undefined) state.pdfHeaderText = data.pdfHeaderText;
      if (data.pdfFooterText !== undefined) state.pdfFooterText = data.pdfFooterText;
      if (data.footerText !== undefined) state.footerText = data.footerText;
      if (data.disabledWeekdays !== undefined) state.disabledWeekdays = data.disabledWeekdays;
      if (data.disabledHours !== undefined) state.disabledHours = data.disabledHours;

      saveState();
      renderBranding();
    }
  } catch (e) {
    console.error("Error cargando branding", e);
  }
}

async function saveBrandingToCloud() {
  if (!state.user) {
    brandingStatus.textContent = "Conéctate con Google para guardar branding.";
    return;
  }
  const docRef = settingsDocRef();
  if (!docRef) {
    brandingStatus.textContent = "No se encontró el documento de configuración.";
    return;
  }
  try {
    const payload = {
      appName: state.appName,
      logoUrl: state.logoUrl || "",
      pdfHeaderText: state.pdfHeaderText || "",
      pdfFooterText: state.pdfFooterText || "",
      footerText: state.footerText || "",
      disabledWeekdays: state.disabledWeekdays || "",
      disabledHours: state.disabledHours || ""
    };
    await docRef.set(payload, { merge: true });
    brandingStatus.textContent = "Branding guardado en Firebase.";
  } catch (e) {
    console.error("Error guardando branding", e);
    brandingStatus.textContent = "Error al guardar branding.";
  }
}

/* ========== FILTROS / LISTA DE TICKETS ========== */
function getFilteredTickets() {
  const start = filterStartInput.value;
  const end = filterEndInput.value;
  const barberFilter = filterBarber.value;

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
  doc.text(
    `GRAN TOTAL: $${grandTotal.toFixed(2)}`,
    marginLeft,
    y
  );

  if (state.pdfFooterText) {
    const footerLines = doc.splitTextToSize(state.pdfFooterText, 180);
    doc.setFontSize(9);
    doc.text(footerLines, marginLeft, 288);
  }

  doc.save("tickets-nexus-barber.pdf");
}

function downloadBackupJson() {
  const data = {
    generatedAt: new Date().toISOString(),
    tickets: state.tickets
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tickets-nexus-barber.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========== CAMBIAR PIN ========== */
function changePin() {
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

/* ========== BARBEROS: LISTA, EDICIÓN, BORRADO ========== */
function getDefaultBarbers() {
  return [
    { id: "edwin", name: "Edwin", percent: 40 },
    { id: "carlos", name: "Carlos", percent: 35 },
    { id: "luis", name: "Luis", percent: 35 }
  ];
}

async function ensureDefaultBarbersInCloud() {
  if (!state.user) return;
  const col = barbersCollectionRef();
  if (!col) return;
  try {
    const snap = await col.limit(1).get();
    if (snap.empty) {
      const defaults = getDefaultBarbers();
      const batch = db.batch();
      defaults.forEach((b) => {
        const ref = col.doc(b.id);
        batch.set(ref, { name: b.name, percent: b.percent });
      });
      await batch.commit();
    }
  } catch (e) {
    console.error("Error asegurando barberos por defecto", e);
  }
}

function loadBarbersIntoSelects() {
  if (!barberSelect || !filterBarber || !agendaBarberSelect || !comiBarberSelect) return;

  barberSelect.innerHTML = `<option value="">Seleccionar...</option>`;
  filterBarber.innerHTML = `<option value="">Todos</option>`;
  agendaBarberSelect.innerHTML = `<option value="">Seleccionar...</option>`;
  comiBarberSelect.innerHTML = `<option value="">Todos</option>`;

  state.barbers.forEach((b) => {
    const opt1 = document.createElement("option");
    opt1.value = b.name;
    opt1.textContent = b.name;
    barberSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = b.name;
    opt2.textContent = b.name;
    filterBarber.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = b.name;
    opt3.textContent = b.name;
    agendaBarberSelect.appendChild(opt3);

    const opt4 = document.createElement("option");
    opt4.value = b.name;
    opt4.textContent = b.name;
    comiBarberSelect.appendChild(opt4);
  });
}

function renderBarbersTable() {
  if (!barbersTableBody) return;
  barbersTableBody.innerHTML = "";

  state.barbers.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${Number(b.percent || 0).toFixed(1)}%</td>
      <td>
        <button class="btn-table edit" data-id="${b.id}">Editar</button>
        <button class="btn-table delete" data-id="${b.id}">X</button>
      </td>
    `;
    barbersTableBody.appendChild(tr);
  });
}

function resetBarberForm() {
  currentBarberId = null;
  if (barberNameInput) barberNameInput.value = "";
  if (barberPercentInput) barberPercentInput.value = "";
}

async function handleBarberSave() {
  if (!barberNameInput || !barberPercentInput) return;
  if (!state.user) {
    alert("Conéctate con Google para guardar barberos.");
    return;
  }

  const name = barberNameInput.value.trim();
  const percent = Number(barberPercentInput.value || 0);

  if (!name) {
    alert("Escribe el nombre del barbero.");
    return;
  }
  if (percent < 0 || percent > 100) {
    alert("El porcentaje debe estar entre 0 y 100.");
    return;
  }

  const col = barbersCollectionRef();
  if (!col) {
    alert("No se encontró la colección de barberos.");
    return;
  }

  try {
    // Editar
    if (currentBarberId) {
      await col.doc(currentBarberId).set(
        { name, percent },
        { merge: true }
      );
    } else {
      const id = `b_${Date.now()}`;
      await col.doc(id).set({ name, percent });
    }

    resetBarberForm();
  } catch (e) {
    console.error("Error guardando barbero", e);
    alert("No se pudo guardar el barbero.");
  }
}

if (barbersTableBody) {
  barbersTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    if (!id) return;

    const barber = state.barbers.find((b) => b.id === id);
    if (!barber) return;

    if (btn.classList.contains("edit")) {
      currentBarberId = id;
      if (barberNameInput) barberNameInput.value = barber.name;
      if (barberPercentInput) barberPercentInput.value = barber.percent;
      return;
    }

    if (btn.classList.contains("delete")) {
      if (!state.user) {
        alert("Conéctate con Google para eliminar barberos.");
        return;
      }
      const ok = confirm(`¿Eliminar al barbero "${barber.name}"?`);
      if (!ok) return;

      try {
        const col = barbersCollectionRef();
        if (!col) throw new Error("No hay colección de barberos.");
        await col.doc(id).delete();
      } catch (err) {
        console.error("Error eliminando barbero", err);
        alert("No se pudo eliminar el barbero.");
      }
    }
  });
}

/* ========== AGENDA / CALENDARIO ========== */

function parseWeekdays(str) {
  const set = new Set();
  if (!str) return set;
  str.split(",").forEach((part) => {
    const n = parseInt(part.trim(), 10);
    if (!isNaN(n) && n >= 0 && n <= 6) set.add(n);
  });
  return set;
}

function parseHours(str) {
  const set = new Set();
  if (!str) return set;
  str.split(",").forEach((part) => {
    const p = part.trim();
    if (!p) return;
    if (p.includes("-")) {
      const [startStr, endStr] = p.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let h = start; h <= end; h++) {
          if (h >= 0 && h <= 23) set.add(h);
        }
      }
    } else {
      const h = parseInt(p, 10);
      if (!isNaN(h) && h >= 0 && h <= 23) set.add(h);
    }
  });
  return set;
}

function isSlotDisabled(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    const weekday = d.getDay();
    const hour = parseInt(timeStr.split(":")[0], 10);

    const disabledDays = parseWeekdays(state.disabledWeekdays);
    const disabledHours = parseHours(state.disabledHours);

    if (disabledDays.has(weekday)) return true;
    if (disabledHours.has(hour)) return true;
  } catch (e) {
    console.error("Error evaluando slot", e);
  }
  return false;
}

function resetAgendaForm() {
  const today = new Date().toISOString().slice(0, 10);
  agendaDateInput.value = today;
  agendaTimeInput.value = "";
  agendaBarberSelect.value = "";
  agendaStatusSelect.value = "Pendiente";
  agendaClientInput.value = "";
  agendaServiceInput.value = "";
  calendarWarning.textContent = "";
  currentAgendaId = null;
}

function renderAgendaTable() {
  if (!agendaTableBody) return;
  agendaTableBody.innerHTML = "";
  state.agenda
    .slice()
    .sort((a, b) => {
      const ad = (a.date || "") + (a.time || "");
      const bd = (b.date || "") + (b.time || "");
      return ad.localeCompare(bd);
    })
    .forEach((cita) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cita.date || ""}</td>
        <td>${cita.time || ""}</td>
        <td>${cita.barber || ""}</td>
        <td>${cita.client || ""}</td>
        <td>${cita.service || ""}</td>
        <td>${cita.status || ""}</td>
        <td>
          <button class="btn-table delete" data-id="${cita.id}">X</button>
        </td>
      `;
      agendaTableBody.appendChild(tr);
    });
}

async function saveAgendaItem() {
  if (!state.user) {
    calendarWarning.textContent = "Conéctate con Google antes de guardar citas.";
    return;
  }

  const date = agendaDateInput.value;
  const time = agendaTimeInput.value;
  const barber = agendaBarberSelect.value;
  const client = agendaClientInput.value.trim();
  const service = agendaServiceInput.value.trim();
  const status = agendaStatusSelect.value;

  if (!date || !time || !barber || !client || !service) {
    calendarWarning.textContent = "Completa todos los campos de la cita.";
    return;
  }

  if (isSlotDisabled(date, time)) {
    calendarWarning.textContent = "Este día u hora está deshabilitado en la configuración.";
    return;
  }

  const col = agendaCollectionRef();
  if (!col) {
    calendarWarning.textContent = "No se encontró la colección de agenda.";
    return;
  }

  try {
    const payload = {
      date,
      time,
      barber,
      client,
      service,
      status,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (currentAgendaId) {
      await col.doc(currentAgendaId).set(payload, { merge: true });
    } else {
      await col.add(payload);
    }

    calendarWarning.textContent = "";
    resetAgendaForm();
  } catch (e) {
    console.error("Error guardando cita", e);
    calendarWarning.textContent = "No se pudo guardar la cita.";
  }
}

if (agendaTableBody) {
  agendaTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button.delete");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (!state.user) {
      alert("Conéctate con Google para eliminar citas.");
      return;
    }
    const ok = confirm("¿Eliminar esta cita?");
    if (!ok) return;
    try {
      const col = agendaCollectionRef();
      if (!col) throw new Error("No hay colección de agenda.");
      await col.doc(id).delete();
    } catch (err) {
      console.error("Error eliminando cita", err);
      alert("No se pudo eliminar la cita.");
    }
  });
}

/* ========== COMISIONES ========== */

function computeCommissionsData() {
  const start = comiStartInput.value;
  const end = comiEndInput.value;
  const barberFilter = comiBarberSelect.value;

  const map = new Map();

  state.tickets.forEach((t) => {
    if (!t.date) return;
    if (start && t.date < start) return;
    if (end && t.date > end) return;
    if (barberFilter && t.barber !== barberFilter) return;

    const barberName = t.barber || "Desconocido";
    const total = Number(t.totalAmount || 0);

    if (!map.has(barberName)) {
      map.set(barberName, {
        barber: barberName,
        total: 0,
        percent: null,
        commission: 0
      });
    }
    const entry = map.get(barberName);
    entry.total += total;
  });

  const defaultPercent = 30;

  const list = Array.from(map.values()).map((entry) => {
    const b = state.barbers.find((bb) => bb.name === entry.barber);
    const percent = b ? Number(b.percent || 0) : defaultPercent;
    const commission = entry.total * (percent / 100);
    return {
      barber: entry.barber,
      total: entry.total,
      percent,
      commission
    };
  });

  let totalComi = 0;
  list.forEach((e) => {
    totalComi += e.commission;
  });

  return { list, totalComi };
}

function renderCommissions() {
  if (!comiTableBody || !comiTotalSpan) return;

  const { list, totalComi } = computeCommissionsData();

  comiTableBody.innerHTML = "";
  list.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.barber}</td>
      <td>${row.percent.toFixed(1)}%</td>
      <td>$${row.total.toFixed(2)}</td>
      <td>$${row.commission.toFixed(2)}</td>
    `;
    comiTableBody.appendChild(tr);
  });

  comiTotalSpan.textContent = `$${totalComi.toFixed(2)}`;
}

/* ========== EVENTOS ========== */
pinEnterBtn.addEventListener("click", handlePinEnter);
pinInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") handlePinEnter();
});

googleSignInBtn.addEventListener("click", signInWithGoogle);
authBackToPinBtn.addEventListener("click", showPinScreen);
logoutBtn.addEventListener("click", signOutAndReset);

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.getAttribute("data-page");
    setActivePage(page);
  });
});

appNameEditable.addEventListener("input", () => {
  state.appName = appNameEditable.textContent.trim() || "Nexus Barber Shop";
  saveState();
  renderBranding();
});

logoUrlInput.addEventListener("input", () => {
  state.logoUrl = logoUrlInput.value.trim();
  saveState();
  renderBranding();
});

pdfHeaderTextArea.addEventListener("input", () => {
  state.pdfHeaderText = pdfHeaderTextArea.value;
  saveState();
});

pdfFooterTextArea.addEventListener("input", () => {
  state.pdfFooterText = pdfFooterTextArea.value;
  saveState();
});

footerTextInput.addEventListener("input", () => {
  state.footerText = footerTextInput.value;
  saveState();
  footerTextSpan.textContent = state.footerText;
});

disabledWeekdaysInput.addEventListener("input", () => {
  state.disabledWeekdays = disabledWeekdaysInput.value.trim();
  saveState();
});

disabledHoursInput.addEventListener("input", () => {
  state.disabledHours = disabledHoursInput.value.trim();
  saveState();
});

saveBrandingBtn.addEventListener("click", (e) => {
  e.preventDefault();
  saveBrandingToCloud();
});

changePinBtn.addEventListener("click", (e) => {
  e.preventDefault();
  changePin();
});

newTicketBtn.addEventListener("click", (e) => {
  e.preventDefault();
  resetFormForNewTicket();
});

quantityInput.addEventListener("input", recalcTotal);
unitPriceInput.addEventListener("input", recalcTotal);
tipAmountInput.addEventListener("input", recalcTotal);

saveTicketBtn.addEventListener("click", (e) => {
  e.preventDefault();
  saveTicket();
});

applyFilterBtn.addEventListener("click", () => {
  const list = getFilteredTickets();
  renderTicketsTable(list);
});

clearFilterBtn.addEventListener("click", () => {
  filterStartInput.value = "";
  filterEndInput.value = "";
  filterBarber.value = "";
  renderTicketsTable();
});

cajaApplyBtn.addEventListener("click", () => {
  computeCajaTotals();
});

cajaClearBtn.addEventListener("click", () => {
  const today = new Date().toISOString().slice(0, 10);
  cajaStartInput.value = today;
  cajaEndInput.value = today;
  computeCajaTotals();
});

exportPdfBtn.addEventListener("click", exportTicketsToPDF);
backupJsonBtn.addEventListener("click", downloadBackupJson);

// Editar / eliminar tickets
ticketsTableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const number = Number(btn.dataset.number);
  if (!number) return;

  const ticket = state.tickets.find((t) => Number(t.number) === number);
  if (!ticket) return;

  if (action === "edit") {
    currentEditingNumber = number;

    ticketNumberInput.value = ticket.number;
    ticketDateInput.value = ticket.date;
    clientNameInput.value = ticket.clientName;
    serviceDescInput.value = ticket.serviceDesc;
    quantityInput.value = ticket.quantity;
    unitPriceInput.value = ticket.unitPrice;
    tipAmountInput.value = ticket.tipAmount || 0;

    if (state.barbers.some((b) => b.name === ticket.barber)) {
      barberSelect.value = ticket.barber;
      barberCustomInput.value = "";
    } else {
      barberSelect.value = "";
      barberCustomInput.value = ticket.barber || "";
    }

    paymentMethodSelect.value = ticket.paymentMethod;

    recalcTotal();
    formMessage.textContent = `Editando ticket #${ticket.number}`;
    setActivePage("dashboard");
  }

  if (action === "delete") {
    if (!state.user) {
      alert("Conéctate con Google para eliminar tickets.");
      return;
    }
    const ok = confirm(`¿Eliminar el ticket #${number}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try {
      const col = ticketsCollectionRef();
      if (!col) throw new Error("No hay colección de tickets.");
      await col.doc(String(number)).delete();
    } catch (err) {
      console.error("Error eliminando ticket", err);
      alert("No se pudo eliminar el ticket.");
    }
  }
});

// Barberos: guardar / cancelar
if (barberSaveBtn) {
  barberSaveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleBarberSave();
  });
}

if (barberCancelEditBtn) {
  barberCancelEditBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetBarberForm();
  });
}

// Agenda: guardar / limpiar
if (agendaAddBtn) {
  agendaAddBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveAgendaItem();
  });
}

if (agendaClearBtn) {
  agendaClearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetAgendaForm();
  });
}

// Comisiones
if (comiApplyBtn) {
  comiApplyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    renderCommissions();
  });
}

if (comiClearBtn) {
  comiClearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    comiStartInput.value = "";
    comiEndInput.value = "";
    comiBarberSelect.value = "";
    renderCommissions();
  });
}

/* ========== INIT + PWA ========== */
function init() {
  loadState();
  renderBranding();
  renderTicketNumber();
  renderTicketsTable(state.tickets);

  const today = new Date().toISOString().slice(0, 10);
  cajaStartInput.value = today;
  cajaEndInput.value = today;
  computeCajaTotals();

  resetFormForNewTicket();
  resetAgendaForm();
  renderBarbersTable();
  loadBarbersIntoSelects();
  renderCommissions();

  setActivePage("dashboard");
  showPinScreen();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("SW error", err));
  }
}

init();
