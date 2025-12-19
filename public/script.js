let translations = {};
let currentLang = "fr";

// Charger les traductions
async function loadTranslations() {
  const res = await fetch("translations.json");
  translations = await res.json();
  applyTranslations();
}

// Appliquer les traductions à l’UI
function applyTranslations() {
  const t = translations[currentLang];
  document.getElementById("page-title").textContent = t.title;
  document.getElementById("label-name").querySelector("span").textContent = t.name;
  document.getElementById("label-shortcut").querySelector("span").textContent = t.shortcut;
  document.getElementById("label-command").querySelector("span").textContent = t.command;
  document.getElementById("save-btn").textContent = t.save;
  document.getElementById("cancel").textContent = t.cancel;
  document.getElementById("existing-title").textContent = t.existing;

  // Mettre à jour les en-têtes du tableau
  const ths = document.querySelectorAll("#bind-table thead th");
  ths[0].textContent = t.name;
  ths[1].textContent = t.shortcut;
  ths[2].textContent = t.command;
  ths[3].textContent = t.actions;

  refreshTable();
}

// Sélecteur de langue
document.getElementById("lang-select").onchange = (e) => {
  currentLang = e.target.value;
  applyTranslations();
};

// Générateur d’ID simple
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Charger les binds readonly du .conf original
async function loadOriginalBinds() {
  const res = await fetch("/api/original-binds");
  const binds = await res.json();
  const table = document.querySelector("#bind-table tbody");
  const t = translations[currentLang];

  binds.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${b.shortcut}</td>
      <td>${b.command}</td>
      <td>
        <span class="info-icon" title="${t.readonly_info}">ℹ️</span>
      </td>
    `;
    table.appendChild(tr);
  });
}

// Charger tous les binds CRUD
async function loadBinds() {
  const res = await fetch("/api/binds");
  const binds = await res.json();
  const table = document.querySelector("#bind-table tbody");
  const t = translations[currentLang];

  binds.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${b.shortcut}</td>
      <td>${b.command}</td>
      <td>
        <button onclick="editBind('${b.id}')">${t.edit}</button>
        <button onclick="deleteBind('${b.id}')">${t.delete}</button>
      </td>
    `;
    table.appendChild(tr);
  });
}

// Charger les catégories et remplir le select
async function loadCategories() {
  const res = await fetch("/api/categories");
  const categories = await res.json();
  const select = document.getElementById("category");
  select.innerHTML = "";
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = `${cat.emoji} ${cat.name}`;
    select.appendChild(option);
  });
}

// Refresh complet de la table (readonly + CRUD)
async function refreshTable() {
  const tbody = document.querySelector("#bind-table tbody");
  tbody.innerHTML = "";
  await loadOriginalBinds();
  const resBinds = await fetch("/api/binds");
  const binds = await resBinds.json();
  const resCats = await fetch("/api/categories");
  const categories = await resCats.json();
  // Grouper les binds par catégorie
  const bindsByCat = {};
  categories.forEach(cat => { bindsByCat[cat.id] = []; });
  binds.forEach(b => {
    if (b.category && bindsByCat[b.category]) {
      bindsByCat[b.category].push(b);
    } else {
      // Catégorie inconnue ou absente
      if (!bindsByCat["other"]) bindsByCat["other"] = [];
      bindsByCat["other"].push(b);
    }
  });
  // Affichage par catégorie
  categories.forEach(cat => {
    if (!bindsByCat[cat.id] || !bindsByCat[cat.id].length) return;
    const trCat = document.createElement("tr");
    trCat.className = "category-row";
    trCat.innerHTML = `<td colspan="4"><span style="font-size:1.2em">${cat.emoji}</span> <b>${cat.name}</b></td>`;
    tbody.appendChild(trCat);
    bindsByCat[cat.id].forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.name}</td>
        <td>${b.shortcut}</td>
        <td>${b.command}</td>
        <td>
          <button onclick="editBind('${b.id}')">✏️</button>
          <button onclick="deleteBind('${b.id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// CRUD : Edit
window.editBind = async function(id) {
  const res = await fetch("/api/binds");
  const bind = (await res.json()).find(b => b.id === id);
  document.getElementById("bind-id").value = bind.id;
  document.getElementById("name").value = bind.name;
  document.getElementById("shortcut").value = bind.shortcut;
  document.getElementById("command").value = bind.command;
  document.getElementById("category").value = bind.category || "";
  document.getElementById("cancel").style.display = "inline";
};

// CRUD : Delete
window.deleteBind = async function(id) {
  await fetch(`/api/binds/${id}`, { method: "DELETE" });
  refreshTable();
};

// Formulaire Submit (Create / Update)
document.getElementById("bind-form").onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById("bind-id").value;
  const payload = {
    id,
    name: document.getElementById("name").value,
    shortcut: document.getElementById("shortcut").value,
    command: document.getElementById("command").value,
    category: document.getElementById("category").value
  };
  if (id) {
    await fetch("/api/binds", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } else {
    payload.id = generateId();
    await fetch("/api/binds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }
  document.getElementById("bind-form").reset();
  document.getElementById("bind-id").value = "";
  document.getElementById("cancel").style.display = "none";
  refreshTable();
};

// Cancel Edit
document.getElementById("cancel").onclick = () => {
  document.getElementById("bind-form").reset();
  document.getElementById("bind-id").value = "";
  document.getElementById("cancel").style.display = "none";
};

// Charger les traductions au démarrage
loadTranslations();
// Charger les catégories au démarrage (pour le select du formulaire)
loadCategories();
