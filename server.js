const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Plus de binds.json, tout se fait dans binds.generated.conf
const GENERATED_CONF = path.resolve(__dirname, "binds.generated.conf");

// Chemin du Hyprland conf original
const ORIGINAL_CONF = path.resolve(process.env.HOME, ".config/hypr/hyprland.conf");

// Fonction utilitaire pour lire les binds CRUD
function readBinds() {
  if (!fs.existsSync(GENERATED_CONF)) return [];
  const lines = fs.readFileSync(GENERATED_CONF, "utf-8").split("\n");
  let lastCategory = null;
  let lastName = null;
  return lines
    .map(line => {
      const catMatch = line.match(/^#\s*category:\s*(\w+)/);
      if (catMatch) {
        lastCategory = catMatch[1];
        return null;
      }
      const nameMatch = line.match(/^#\s*name:\s*(.+)/);
      if (nameMatch) {
        lastName = nameMatch[1];
        return null;
      }
      const match = line.match(/^bind\s*=\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*)$/);
      if (match) {
        const bind = {
          mod: match[1],
          key: match[2],
          action: match[3],
          cmd: match[4],
          id: Buffer.from(`${match[1]},${match[2]},${match[3]},${match[4]}`).toString('base64'),
          shortcut: `${match[1]}, ${match[2]}`,
          command: match[4],
          name: lastName || "",
          category: lastCategory || "other"
        };
        lastCategory = null;
        lastName = null;
        return bind;
      }
      return null;
    })
    .filter(Boolean);
}

// Fonction utilitaire pour écrire les binds CRUD
function writeBinds(binds) {
  const lines = binds.map(b => {
    // Ajoute la catégorie et le nom en commentaire au-dessus du bind si présents
    let comments = [];
    if (b.category) comments.push(`# category: ${b.category}`);
    if (b.name) comments.push(`# name: ${b.name}`);
    let commentBlock = comments.length ? comments.join("\n") + "\n" : "";
    if (b.shortcut && b.command) {
      const parts = b.shortcut.split(",").map(s => s.trim());
      const mod = parts[0] || "";
      const key = parts[1] || "";
      return `${commentBlock}bind = ${mod}, ${key}, exec, ${b.command}`.trim();
    }
    return `${commentBlock}bind = ${b.mod || ""}, ${b.key || ""}, ${b.action || "exec"}, ${b.cmd || ""}`.trim();
  });
  fs.writeFileSync(GENERATED_CONF, lines.join("\n"));
}

// Lire binds du .conf original (readonly)
function readOriginalBinds() {
  if (!fs.existsSync(ORIGINAL_CONF)) return [];
  const lines = fs.readFileSync(ORIGINAL_CONF, "utf-8").split("\n");
  const binds = [];
  lines.forEach(line => {
    const match = line.match(/^bind\s*=\s*(.+?),\s*(.+?),\s*exec,\s*(.+)$/);
    if (match) {
      binds.push({
        name: match[1],
        shortcut: match[2],
        command: match[3]
      });
    }
  });
  return binds;
}

const CATEGORIES_FILE = path.resolve(__dirname, "categories.json");

function readCategories() {
  if (!fs.existsSync(CATEGORIES_FILE)) return [];
  return JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf-8"));
}

function writeCategories(categories) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// Servir fichiers statiques
function serveStatic(req, res, filepath, contentType) {
  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
}

// Créer le serveur HTTP
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsed.pathname;

  // ===== API =====
  if (pathname === "/api/binds") {
    let binds = readBinds();

    if (method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(binds));
    } else if (method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const newBind = JSON.parse(body);
        binds.push(newBind);
        writeBinds(binds);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newBind));
      });
    } else if (method === "PUT") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const updatedBind = JSON.parse(body);
        binds = binds.map(b => b.id === updatedBind.id ? updatedBind : b);
        writeBinds(binds);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedBind));
      });
    } else {
      res.writeHead(405);
      res.end();
    }
    return;
  }

  if (pathname.startsWith("/api/binds/") && method === "DELETE") {
    const id = pathname.split("/").pop();
    let binds = readBinds();
    binds = binds.filter(b => b.id !== id);
    writeBinds(binds);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === "/api/original-binds") {
    const origBinds = readOriginalBinds();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(origBinds));
    return;
  }

  // API catégories
  if (pathname === "/api/categories") {
    let categories = readCategories();
    if (method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(categories));
    } else if (method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const newCat = JSON.parse(body);
        categories.push(newCat);
        writeCategories(categories);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newCat));
      });
    } else if (method === "PUT") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const updatedCat = JSON.parse(body);
        categories = categories.map(c => c.id === updatedCat.id ? updatedCat : c);
        writeCategories(categories);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedCat));
      });
    } else {
      res.writeHead(405);
      res.end();
    }
    return;
  }
  if (pathname.startsWith("/api/categories/") && method === "DELETE") {
    const id = pathname.split("/").pop();
    let categories = readCategories();
    categories = categories.filter(c => c.id !== id);
    writeCategories(categories);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ===== Fichiers statiques =====
  if (pathname === "/" || pathname === "/index.html") {
    serveStatic(req, res, path.join(__dirname, "public/index.html"), "text/html");
    return;
  }
  if (pathname === "/style.css") {
    serveStatic(req, res, path.join(__dirname, "public/style.css"), "text/css");
    return;
  }
  if (pathname === "/script.js") {
    serveStatic(req, res, path.join(__dirname, "public/script.js"), "application/javascript");
    return;
  }
  if (pathname === "/translations.json") {
    serveStatic(req, res, path.join(__dirname, "public/translations.json"), "application/json");
    return;
  }

  // 404 fallback
  res.writeHead(404);
  res.end("Not found");
});

// Lancer le serveur
const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
