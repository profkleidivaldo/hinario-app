/* Hinário Adventista PWA — letras incorporadas e cópia local para uso offline. */
const $ = s => document.querySelector(s);
const DB_NAME = "hinario-adventista-offline";
const DB_VERSION = 1;
const STORE = "dados";
const CACHE_KEY = "todos-os-hinos";
const state = {
  filter: "all",
  current: null,
  query: "",
  favorites: new Set(JSON.parse(localStorage.getItem("hasd-favs") || "[]").map(Number)),
  recent: JSON.parse(localStorage.getItem("hasd-recent") || "[]").map(Number)
};
let hymns = [];

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB indisponível"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Não foi possível abrir o armazenamento local"));
  });
}
async function storeOffline(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ savedAt: new Date().toISOString(), hymns: data }, CACHE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Falha ao salvar hinos")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Salvamento cancelado")); };
  });
}
async function readOffline() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(CACHE_KEY);
    req.onsuccess = () => { const result = req.result; db.close(); resolve(result || null); };
    req.onerror = () => { db.close(); reject(req.error || new Error("Falha ao ler hinos locais")); };
  });
}
function cleanText(value) {
  return String(value ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/&nbsp;/gi, " ").trim();
}
function normalizeHymns(raw = window.hymns) {
  if (!raw || typeof raw !== "object") return [];
  const entries = Array.isArray(raw) ? raw.map((v, i) => [String(i + 1), v]) : Object.entries(raw);
  return entries.map(([key, item]) => {
    const id = Number(item?.id ?? item?.numero ?? item?.number ?? key);
    if (!Number.isInteger(id) || id < 1 || id > 613 || !item || typeof item !== "object") return null;
    const title = cleanText(item.tt ?? item.title ?? item.titulo ?? item.nome ?? item.name) || `Hino ${pad(id)}`;
    const verseParts = Object.entries(item)
      .filter(([k, v]) => /^\d+$/.test(k) && Number(k) > 1 && String(v ?? "").trim() && String(v).trim() !== "♫")
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, v]) => cleanText(v))
      .filter(Boolean);
    return {
      id, title,
      lyrics: verseParts.join("\n\n"),
      originalTitle: cleanText(item.ot),
      credits: cleanText(item.cr).replace(/\n/g, " · "),
      bibleVerse: cleanText(item.bv)
    };
  }).filter(Boolean).sort((a, b) => a.id - b.id);
}
function pad(n) { return String(n).padStart(3, "0"); }
function savePrefs() {
  localStorage.setItem("hasd-favs", JSON.stringify([...state.favorites]));
  localStorage.setItem("hasd-recent", JSON.stringify(state.recent));
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function setOfflineStatus(message, kind = "") {
  const el = $("#offlineStatus");
  if (!el) return;
  el.textContent = message;
  el.className = "offline-status" + (kind ? ` ${kind}` : "");
}
function render() {
  const q = state.query.trim().toLocaleLowerCase("pt-BR");
  const list = hymns.filter(h => {
    const matches = !q || pad(h.id).includes(q) || String(h.id) === q ||
      h.title.toLocaleLowerCase("pt-BR").includes(q) ||
      h.lyrics.toLocaleLowerCase("pt-BR").includes(q);
    return matches && (state.filter === "favorites" ? state.favorites.has(h.id) :
      state.filter === "recent" ? state.recent.includes(h.id) : true);
  });
  $("#hymnGrid").innerHTML = list.map(h =>
    `<button class="hymn-card" data-id="${h.id}">
      <span class="hymn-id">${pad(h.id)}</span>
      <span class="hymn-info"><strong>${esc(h.title)}</strong><small>${h.lyrics ? "Letra salva neste dispositivo" : "Letra não cadastrada"}</small></span>
      <span class="card-heart">${state.favorites.has(h.id) ? "♥" : ""}</span>
    </button>`).join("");
  $("#count").textContent = `${list.length} ${list.length === 1 ? "hino" : "hinos"}`;
  $("#empty").classList.toggle("hidden", list.length > 0);
  $("#hymnGrid").classList.toggle("hidden", list.length === 0);
  document.querySelectorAll(".hymn-card").forEach(b => b.addEventListener("click", () => openHymn(Number(b.dataset.id))));
}
function openHymn(id) {
  const h = hymns.find(x => x.id === id);
  if (!h) return;
  state.current = id;
  state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 20);
  savePrefs();
  $("#readerNumber").textContent = "HINO " + pad(h.id);
  $("#readerTitle").textContent = h.title;
  $("#lyrics").textContent = h.lyrics || "A letra deste hino não consta no arquivo recebido.";
  $("#favBtn").textContent = state.favorites.has(id) ? "♥" : "♡";
  const meta = [h.originalTitle, h.credits, h.bibleVerse].filter(Boolean);
  $("#hymnMeta").textContent = meta.join(" • ");
  $("#hymnMeta").classList.toggle("hidden", meta.length === 0);
  $("#reader").classList.remove("hidden");
  $("#reader").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#prevBtn").disabled = id <= 1;
  $("#nextBtn").disabled = id >= 613;
  if (location.hash !== "#h" + pad(id)) history.replaceState(null, "", "#h" + pad(id));
}
async function ensureOfflineCopy() {
  if (!hymns.length) return;
  setOfflineStatus("Preparando as letras para leitura sem internet…", "working");
  try {
    await storeOffline(hymns);
    setOfflineStatus(`Modo offline pronto: ${hymns.length} hinos salvos neste dispositivo.`, "ready");
  } catch (err) {
    setOfflineStatus("As letras estão carregadas, mas o navegador não permitiu criar a cópia offline. Use um navegador atualizado e abra o site por HTTPS.", "warning");
  }
}
async function initialize() {
  const fromFile = normalizeHymns(window.hymns);
  if (fromFile.length) {
    hymns = fromFile;
    // Salva automaticamente na primeira visita online; também atualiza a cópia local quando há conexão.
    await ensureOfflineCopy();
  } else {
    try {
      const saved = await readOffline();
      if (saved?.hymns?.length) {
        hymns = saved.hymns;
        setOfflineStatus(`Sem conexão: ${hymns.length} hinos recuperados do armazenamento local.`, "ready");
      }
    } catch (_) {}
  }
  if (!hymns.length) {
    hymns = Array.from({ length: 613 }, (_, i) => ({ id: i + 1, title: `Hino ${pad(i + 1)}`, lyrics: "" }));
    setOfflineStatus("Não foi possível carregar as letras. Conecte-se à internet e recarregue a página.", "warning");
  }
  render();
  const match = location.hash.match(/#h(\d{1,3})/);
  if (match) openHymn(Number(match[1]));
}
$("#search").addEventListener("input", e => { state.query = e.target.value; render(); });
document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
  state.filter = b.dataset.filter;
  document.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === b));
  $("#listTitle").textContent = state.filter === "favorites" ? "Seus favoritos" :
    state.filter === "recent" ? "Acessados recentemente" : "Hinos do hinário";
  render();
}));
$("#favBtn").addEventListener("click", () => {
  if (state.favorites.has(state.current)) state.favorites.delete(state.current);
  else state.favorites.add(state.current);
  savePrefs();
  $("#favBtn").textContent = state.favorites.has(state.current) ? "♥" : "♡";
  render();
});
$("#backBtn").addEventListener("click", () => {
  $("#reader").classList.add("hidden");
  history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("#prevBtn").addEventListener("click", () => openHymn(state.current - 1));
$("#nextBtn").addEventListener("click", () => openHymn(state.current + 1));
$("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("hasd-dark", document.body.classList.contains("dark"));
});
if (localStorage.getItem("hasd-dark") === "true") document.body.classList.add("dark");
$("#downloadOfflineBtn").addEventListener("click", ensureOfflineCopy);
window.addEventListener("online", () => setOfflineStatus("Conexão disponível. As letras estão armazenadas neste dispositivo.", "ready"));
window.addEventListener("offline", () => setOfflineStatus("Você está sem internet. As letras salvas continuam disponíveis.", "ready"));
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("#search").focus(); }
  if (e.key === "Escape") { $("#reader").classList.add("hidden"); $("#search").blur(); }
});
let deferredInstall;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredInstall = e; $("#installBtn").classList.remove("hidden");
});
$("#installBtn").addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt(); await deferredInstall.userChoice;
  deferredInstall = null; $("#installBtn").classList.add("hidden");
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {
    setOfflineStatus("Não foi possível ativar o cache do aplicativo. Confira se o site está publicado em HTTPS.", "warning");
  }));
}
initialize();
