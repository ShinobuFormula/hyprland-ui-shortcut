#!/usr/bin/env node
import fs from "fs";
import path from "path";

const CONF = path.resolve("../hyprland.conf");
const OUT_MD = "keybinds.md";
const OUT_HTML = "keybinds.html";
const TEMPLATE = "template.html";

// Lecture du fichier Hyprland
const lines = fs.readFileSync(CONF, "utf8").split("\n");

// Variables ($terminal etc.)
const vars = {};
const binds = [];
const mouseBinds = [];

let pendingName = null; // ← nom venant du commentaire #@bind

for (const line of lines) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#")) {
    // Commentaire spécial
    if (clean.startsWith("#@bind")) {
      const match = clean.match(/name="(.+?)"/);
      if (match) pendingName = match[1];
    }
    continue;
  }

  // Variables
  if (clean.startsWith("$")) {
    const [key, value] = clean.split("=").map(s => s.trim());
    vars[key] = value;
    continue;
  }

  // Keybindings clavier
  if (clean.startsWith("bind =")) {
    const [, rest] = clean.split("=");
    const [mod, key, action, ...cmd] = rest.split(",").map(s => s.trim());

    binds.push({
      mod,
      key,
      action,
      cmd: cmd.join(", "),
      name: pendingName
    });

    pendingName = null;
    continue;
  }

  // Mouse bindings
  if (clean.startsWith("bindm =")) {
    const [, rest] = clean.split("=");
    const [mod, key, action] = rest.split(",").map(s => s.trim());

    mouseBinds.push({
      mod,
      key,
      action,
      name: pendingName
    });

    pendingName = null;
  }
}

// Résolution des variables
const resolveVars = str =>
  Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(k, v),
    str
  );

// Catégories
const categories = {
  "🪟 Fenêtres": [],
  "🌐 Applications": [],
  "🎵 Multimédia": [],
  "🗂️ Workspaces": [],
  "🖱️ Souris": [],
  "🔧 Autres": []
};

// Classement
for (const b of binds) {
  const combo = `${b.mod} + ${b.key}`;
  const cmd = resolveVars(b.cmd);

  const entry = {
    combo,
    cmd,
    name: b.name
  };

  if (b.action === "workspace") {
    categories["🗂️ Workspaces"].push(entry);
  } else if (cmd.includes("mpv")) {
    categories["🎵 Multimédia"].push(entry);
  } else if (b.action === "exec") {
    categories["🌐 Applications"].push(entry);
  } else {
    categories["🪟 Fenêtres"].push(entry);
  }
}

// Souris
for (const m of mouseBinds) {
  categories["🖱️ Souris"].push({
    combo: `${m.mod} + ${m.key}`,
    cmd: m.action,
    name: m.name
  });
}

// Génération Markdown
let md = `# ⌨️ Hyprland – Pense-bête\n\n`;

for (const [cat, items] of Object.entries(categories)) {
  if (!items.length) continue;

  md += `## ${cat}\n\n| Raccourci | Action |\n|---|---|\n`;

  for (const i of items) {
    md += `| \`${i.combo}\` | ${
      i.name ? `**${i.name}** — ` : ""
    }${i.cmd} |\n`;
  }

  md += "\n";
}

fs.writeFileSync(OUT_MD, md);

// Injection SAFE dans le HTML
const template = fs.readFileSync(TEMPLATE, "utf8");
const html = template.replace("{{CONTENT}}", JSON.stringify(md));
fs.writeFileSync(OUT_HTML, html);

console.log("✔ Cheatsheet générée avec succès");
