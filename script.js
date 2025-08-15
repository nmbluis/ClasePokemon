const apiUrl = "https://pokeapi.co/api/v2/pokemon";
const pokemonGrid = document.getElementById("pokemonGrid");
const loading = document.getElementById("loading");
const searchInput = document.getElementById("searchInput");
const generationSelect = document.getElementById("generationSelect");
const sortSelect = document.getElementById("sortSelect");
const clearFiltersBtn = document.getElementById("clearFilters");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const typeFiltersContainer = document.getElementById("typeFilters");
const modal = document.getElementById("pokemonModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModal");

let allPokemon = [];
let filteredPokemon = [];
let currentPage = 1;
const perPage = 12;

// Inicializar
async function init() {
    await loadAllPokemon();
    renderTypeButtons();
    applyFilters();
}

// Cargar todos los Pokémon
async function loadAllPokemon() {
    loading.classList.remove("hidden");
    let url = `${apiUrl}?limit=151`; // Solo Gen 1 para rendimiento inicial
    let res = await fetch(url);
    let data = await res.json();

    allPokemon = await Promise.all(
        data.results.map(async p => {
            let resDetails = await fetch(p.url);
            let details = await resDetails.json();
            return {
                id: details.id,
                name: details.name,
                image: details.sprites.other["official-artwork"].front_default,
                types: details.types.map(t => t.type.name),
                height: details.height,
                weight: details.weight
            };
        })
    );

    loading.classList.add("hidden");
}

// Renderizar botones de tipo
function renderTypeButtons() {
    const types = [...new Set(allPokemon.flatMap(p => p.types))];
    types.forEach(type => {
        let btn = document.createElement("button");
        btn.textContent = type;
        btn.className =
            "bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm m-1";
        btn.addEventListener("click", () => {
            if (btn.classList.contains("bg-blue-400")) {
                btn.classList.remove("bg-blue-400", "text-white");
                btn.classList.add("bg-gray-200");
            } else {
                document.querySelectorAll("#typeFilters button").forEach(b =>
                    b.classList.remove("bg-blue-400", "text-white")
                );
                btn.classList.remove("bg-gray-200");
                btn.classList.add("bg-blue-400", "text-white");
            }
            applyFilters();
        });
        typeFiltersContainer.appendChild(btn);
    });
}

// Aplicar filtros
function applyFilters() {
    let search = searchInput.value.toLowerCase();
    let selectedType = document.querySelector("#typeFilters .bg-blue-400")
        ? document.querySelector("#typeFilters .bg-blue-400").textContent
        : "";
    let selectedGen = generationSelect.value;
    let sortBy = sortSelect.value;

    filteredPokemon = allPokemon.filter(p => {
        let matchesName = p.name.includes(search);
        let matchesType = selectedType ? p.types.includes(selectedType) : true;
        let matchesGen = selectedGen
            ? getGeneration(p.id) === parseInt(selectedGen)
            : true;
        return matchesName && matchesType && matchesGen;
    });

    filteredPokemon.sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return a[sortBy] - b[sortBy];
    });

    currentPage = 1;
    renderPage();
}

// Determinar generación por ID
function getGeneration(id) {
    if (id <= 151) return 1;
    if (id <= 251) return 2;
    if (id <= 386) return 3;
    if (id <= 493) return 4;
    if (id <= 649) return 5;
    if (id <= 721) return 6;
    return 7;
}

// Renderizar página
function renderPage() {
    pokemonGrid.innerHTML = "";
    let start = (currentPage - 1) * perPage;
    let end = start + perPage;
    let pageItems = filteredPokemon.slice(start, end);

    pageItems.forEach(p => {
        let card = document.createElement("div");
        card.className =
            "bg-white rounded-lg shadow-md p-4 transform transition-transform hover:-translate-y-2 hover:shadow-lg cursor-pointer";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-contain mb-2">
            <h3 class="text-lg font-bold capitalize text-center">${p.name}</h3>
            <p class="text-sm text-gray-600 text-center">#${p.id}</p>
            <div class="flex justify-center gap-2 mt-2">
                ${p.types
                    .map(
                        t =>
                            `<span class="px-2 py-1 bg-gray-200 rounded text-xs">${t}</span>`
                    )
                    .join("")}
            </div>
        `;
        card.addEventListener("click", () => openModal(p));
        pokemonGrid.appendChild(card);
    });

    pageInfo.textContent = `Página ${currentPage} de ${Math.ceil(
        filteredPokemon.length / perPage
    )}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = end >= filteredPokemon.length;
}

// Abrir modal
function openModal(pokemon) {
    modalTitle.textContent = pokemon.name.toUpperCase();
    modalContent.innerHTML = `
        <img src="${pokemon.image}" alt="${pokemon.name}" class="w-48 h-48 object-contain mx-auto mb-4">
        <p><strong>ID:</strong> ${pokemon.id}</p>
        <p><strong>Tipos:</strong> ${pokemon.types.join(", ")}</p>
        <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
        <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
    `;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

// Cerrar modal
closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
});
modal.addEventListener("click", e => {
    if (e.target === modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
});

// Eventos
searchInput.addEventListener("input", applyFilters);
generationSelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    generationSelect.value = "";
    sortSelect.value = "id";
    document.querySelectorAll("#typeFilters button").forEach(b =>
        b.classList.remove("bg-blue-400", "text-white")
    );
    applyFilters();
});
prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
});
nextBtn.addEventListener("click", () => {
    if (currentPage * perPage < filteredPokemon.length) {
        currentPage++;
        renderPage();
    }
});

// Iniciar app
init();
