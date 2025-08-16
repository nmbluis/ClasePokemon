// =================== CONFIG & STATE ===================
const API = "https://pokeapi.co/api/v2";
const PER_PAGE = 12;

let currentPage = 1;
let allIndex = [];              // [{id, name, url}]
let filteredList = [];          // [{id, name}]
const cacheDetails = new Map(); // id -> full pokemon data
const cacheTypeSets = new Map();// type -> Set(ids)

const ui = {
  grid: document.getElementById("pokemonGrid"),
  loading: document.getElementById("loading"),
  empty: document.getElementById("emptyState"),
  search: document.getElementById("searchInput"),
  gen: document.getElementById("generationSelect"),
  sort: document.getElementById("sortSelect"),
  typeBox: document.getElementById("typeFilters"),
  clear: document.getElementById("clearFilters"),
  prev: document.getElementById("prevBtn"),
  next: document.getElementById("nextBtn"),
  pageInfo: document.getElementById("pageInfo"),
  totalCount: document.getElementById("totalCount"),
  pageBadge: document.getElementById("currentPageBadge"),
  stats: {
    results: document.getElementById("statResults"),
    type: document.getElementById("statType"),
    gen: document.getElementById("statGen"),
    order: document.getElementById("statOrder")
  },
  modal: document.getElementById("pokemonModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalContent: document.getElementById("modalContent"),
  closeModal: document.getElementById("closeModal"),
};

const TYPES = [
  "normal","fire","water","electric","grass","ice","fighting","poison","ground",
  "flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"
];

const TYPES_ES = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico",
  grass: "Planta", ice: "Hielo", fighting: "Lucha", poison: "Veneno",
  ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro",
  steel: "Acero", fairy: "Hada"
};

const GENERATIONS = {
  1: { start: 1,   end: 151, name: "Kanto" },
  2: { start: 152, end: 251, name: "Johto" },
  3: { start: 252, end: 386, name: "Hoenn" },
  4: { start: 387, end: 493, name: "Sinnoh" },
  5: { start: 494, end: 649, name: "Unova" },
  6: { start: 650, end: 721, name: "Kalos" },
  7: { start: 722, end: 809, name: "Alola" },
};

const state = {
  search: "",
  type: "",
  gen: "",
  sort: "id",
};

// =================== INIT ===================
init();

async function init() {
  await loadIndex();
  renderTypeButtons();
  attachEvents();
  applyFilters();
}

// =================== LOAD INDEX ===================
async function loadIndex() {
  const info = await fetch(`${API}/pokemon?limit=1`).then(r => r.json());
  const total = info.count;

  const res = await fetch(`${API}/pokemon?limit=${total}`);
  const data = await res.json();

  allIndex = data.results.map(r => {
    const id = Number(r.url.split("/").filter(Boolean).pop());
    return { id, name: r.name, url: r.url };
  }).filter(p => p.id <= 809);
  ui.totalCount.textContent = allIndex.length.toString();
}

// =================== UI HELPERS ===================
function badgeForType(t) {
  const colors = {
    normal: "bg-slate-400", fire: "bg-red-500", water: "bg-sky-500", electric: "bg-yellow-400",
    grass: "bg-emerald-500", ice: "bg-cyan-400", fighting: "bg-orange-700", poison: "bg-purple-500",
    ground: "bg-yellow-600", flying: "bg-indigo-400", psychic: "bg-pink-500", bug: "bg-lime-500",
    rock: "bg-yellow-800", ghost: "bg-violet-700", dragon: "bg-indigo-700", dark: "bg-gray-800",
    steel: "bg-gray-500", fairy: "bg-fuchsia-400"
  };
  return `inline-block text-white text-xs rounded-full px-2 py-0.5 ${colors[t]||"bg-slate-400"}`;
}

function cardSkeleton() {
  return `<div class="bg-white rounded-2xl border border-slate-200 shadow-md p-5 h-[290px] animate-pulse"></div>`;
}

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function renderTypeButtons() {
  ui.typeBox.innerHTML = "";
  TYPES.forEach(type => {
    const b = document.createElement("button");
    b.textContent = TYPES_ES[type] || capitalize(type);
    b.dataset.type = type;
    b.className = "px-3 py-1.5 rounded-xl border-2 shadow-sm text-sm border-slate-300 hover:bg-slate-50";
    b.addEventListener("click", () => {
      if (state.type === type) state.type = "";
      else state.type = type;
      ui.typeBox.querySelectorAll("button").forEach(btn => btn.classList.remove("border-blue-400","bg-blue-50","text-blue-700"));
      if (state.type) b.classList.add("border-blue-400","bg-blue-50","text-blue-700");
      applyFilters();
    });
    ui.typeBox.appendChild(b);
  });
}

// =================== FILTER PIPELINE ===================
async function applyFilters() {
  let base = genUniverse(state.gen);

  if (state.search.trim()) {
    const s = state.search.trim().toLowerCase();
    base = base.filter(p => p.name.includes(s));
  }

  if (state.type) {
    const set = await getIdsForType(state.type);
    base = base.filter(p => set.has(p.id));
  }

  filteredList = base;
  await sortFiltered(state.sort);

  currentPage = 1;
  renderPage();

  ui.stats.results.textContent = filteredList.length.toString();
  ui.stats.type.textContent = state.type ? TYPES_ES[state.type] : "—";
  ui.stats.gen.textContent = state.gen ? `${state.gen} (${GENERATIONS[state.gen].name})` : "Todas";
  ui.stats.order.textContent = displayOrder(state.sort);
}

function genUniverse(genVal) {
  if (!genVal) return [...allIndex];
  const {start,end} = GENERATIONS[genVal];
  return allIndex.filter(p => p.id >= start && p.id <= end);
}

function displayOrder(key){
  switch (key){
    case "id": return "ID";
    case "name": return "Nombre";
    case "height": return "Altura";
    case "weight": return "Peso";
    default: return key;
  }
}

async function sortFiltered(criteria){
  if(criteria==="id"){ filteredList.sort((a,b)=>a.id-b.id); return; }
  if(criteria==="name"){ filteredList.sort((a,b)=>a.name.localeCompare(b.name)); return; }
  await ensureDetailsFor(filteredList.map(p=>p.id));
  filteredList.sort((a,b)=>{
    const A = cacheDetails.get(a.id);
    const B = cacheDetails.get(b.id);
    if(!A||!B) return 0;
    if(criteria==="height") return A.height-B.height;
    if(criteria==="weight") return A.weight-B.weight;
    return 0;
  });
}

async function getIdsForType(type){
  if(cacheTypeSets.has(type)) return cacheTypeSets.get(type);
  const data = await fetch(`${API}/type/${type}`).then(r=>r.json());
  const ids = new Set(data.pokemon.map(p=>Number(p.pokemon.url.split("/").filter(Boolean).pop())).filter(id=>id<=809));
  cacheTypeSets.set(type,ids);
  return ids;
}

// =================== RENDER ===================
async function renderPage(){
  ui.grid.innerHTML = "";
  ui.empty.classList.add("hidden");
  ui.loading.classList.remove("hidden");

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PER_PAGE));
  const start = (currentPage-1)*PER_PAGE;
  const pageSlice = filteredList.slice(start, start+PER_PAGE);

  ui.grid.innerHTML = pageSlice.map(()=>cardSkeleton()).join("");

  await ensureDetailsFor(pageSlice.map(p=>p.id));

  ui.grid.innerHTML = "";
  pageSlice.forEach(p=>{
    const d = cacheDetails.get(p.id);
    if(!d) return;
    ui.grid.appendChild(pokemonCard(d));
  });

  ui.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  ui.pageBadge.textContent = `${currentPage}`;
  ui.prev.disabled = currentPage<=1;
  ui.next.disabled = currentPage>=totalPages;

  ui.loading.classList.add("hidden");
  if(pageSlice.length===0) ui.empty.classList.remove("hidden");
}

function pokemonCard(p){
  const div = document.createElement("div");
  div.className = "bg-white rounded-2xl border border-slate-200 shadow-md p-5 transition hover:-translate-y-1.5 hover:shadow-lg cursor-pointer";
  const types = p.types.map(t=>t.type.name);

  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-slate-500 text-sm">#${String(p.id).padStart(3,"0")}</span>
      <div class="flex gap-2">
        ${types.map(t=>`<span class="${badgeForType(t)}">${TYPES_ES[t]||capitalize(t)}</span>`).join("")}
      </div>
    </div>
    <div class="h-32 flex items-center justify-center">
      <img class="h-28 object-contain" src="${p.sprites.other?.['official-artwork']?.front_default||p.sprites.front_default}" alt="${p.name}">
    </div>
    <h3 class="text-center mt-2 text-lg font-extrabold text-slate-800 capitalize">${p.name}</h3>
    <div class="grid grid-cols-2 gap-3 mt-4">
      <div class="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
        <div class="text-xs text-slate-500">Altura</div>
        <div class="font-semibold">${(p.height/10).toFixed(1)}m</div>
      </div>
      <div class="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-center">
        <div class="text-xs text-slate-500">Peso</div>
        <div class="font-semibold">${(p.weight/10).toFixed(1)}kg</div>
      </div>
    </div>
    <button class="mt-4 w-full rounded-xl bg-emerald-500 text-white font-semibold py-2 hover:bg-emerald-600 shadow">
      Ver Detalles 📚
    </button>
  `;
  div.querySelector("button").addEventListener("click", e=>{ e.stopPropagation(); openModal(p.id); });
  div.addEventListener("click", ()=>openModal(p.id));
  return div;
}

// =================== DETAILS / MODAL ===================
async function openModal(id){
  const p = cacheDetails.get(id)||await fetchPokemon(id);
  ui.modalTitle.textContent = `#${String(p.id).padStart(3,'0')} ${capitalize(p.name)}`;
  ui.modalContent.innerHTML = `
    <div class="text-center mb-4">
      <img src="${p.sprites.other?.['official-artwork']?.front_default||p.sprites.front_default}" class="w-40 h-40 object-contain mx-auto" alt="${p.name}">
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <div class="text-xs text-slate-500">Altura</div>
        <div class="font-semibold">${(p.height/10).toFixed(1)} m</div>
      </div>
      <div class="bg-slate-100 rounded-xl p-3 border border-slate-200">
        <div class="text-xs text-slate-500">Peso</div>
        <div class="font-semibold">${(p.weight/10).toFixed(1)} kg</div>
      </div>
    </div>
    <div class="mb-4">
      <div class="text-sm text-slate-500 mb-1">Tipos</div>
      <div class="flex gap-2">
        ${p.types.map(t=>`<span class="${badgeForType(t.type.name)}">${TYPES_ES[t.type.name]||capitalize(t.type.name)}</span>`).join("")}
      </div>
    </div>
    <div class="mb-1 text-sm text-slate-500">Estadísticas Base</div>
    ${p.stats.map(s=>{
      const name = s.stat.name.replace("-"," ");
      const val = s.base_stat;
      const pct = Math.min((val/200)*100,100);
      return `<div class="mb-2">
        <div class="flex justify-between text-sm">
          <span class="capitalize">${name}</span><span>${val}</span>
        </div>
        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-2 bg-sky-500" style="width:${pct}%"></div>
        </div>
      </div>`;
    }).join("")}
  `;
  ui.modal.classList.remove("hidden");
  ui.modal.classList.add("flex");
}

ui.closeModal.addEventListener("click", closeModal);
ui.modal.addEventListener("click", (e)=>{ if(e.target===ui.modal) closeModal(); });
function closeModal(){ ui.modal.classList.add("hidden"); ui.modal.classList.remove("flex"); }

// =================== DATA FETCH HELPERS ===================
async function ensureDetailsFor(ids){
  const missing = ids.filter(id=>!cacheDetails.has(id));
  for(let i=0;i<missing.length;i+=20){
    const chunk = missing.slice(i,i+20);
    const results = await Promise.all(chunk.map(id=>fetchPokemon(id)));
    results.forEach(p=>{ if(p) cacheDetails.set(p.id,p); });
  }
}

async function fetchPokemon(id){
  try{
    const data = await fetch(`${API}/pokemon/${id}`).then(r=>r.json());
    cacheDetails.set(id,data);
    return data;
  }catch(e){ console.error("Error fetch pokemon", id, e); return null; }
}

// =================== EVENTS ===================
function attachEvents(){
  let t;
  ui.search.addEventListener("input", e=>{
    clearTimeout(t);
    t=setTimeout(()=>{
      state.search=e.target.value;
      applyFilters();
    },300);
  });

  ui.gen.addEventListener("change", e=>{
    state.gen=e.target.value;
    applyFilters();
  });

  ui.sort.addEventListener("change", e=>{
    state.sort=e.target.value;
    applyFilters();
  });

  ui.clear.addEventListener("click", ()=>{
    ui.search.value=""; ui.gen.value=""; ui.sort.value="id";
    state.search=""; state.gen=""; state.sort="id"; state.type="";
    ui.typeBox.querySelectorAll("button").forEach(b=>b.classList.remove("border-blue-400","bg-blue-50","text-blue-700"));
    applyFilters();
  });

  ui.prev.addEventListener("click", ()=>{
    if(currentPage>1){ currentPage--; renderPage(); }
  });
  ui.next.addEventListener("click", ()=>{
    const totalPages=Math.max(1,Math.ceil(filteredList.length/PER_PAGE));
    if(currentPage<totalPages){ currentPage++; renderPage(); }
  });
}
