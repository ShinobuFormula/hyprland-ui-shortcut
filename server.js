const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Stockage simple des binds CRUD en mémoire (ou JSON sur disque)
const BINDS_FILE = path.resolve(__dirname, "binds.json");

// Chemin du Hyprland conf original
const ORIGINAL_CONF = path.resolve(process.env.HOME, ".config/hypr/hyprland.conf");

// Fonction utilitaire pour lire les binds CRUD
function readBinds() {
  if (!fs.existsSync(BINDS_FILE)) return [];
  return JSON.parse(fs.readFileSync(BINDS_FILE, "utf-8"));
}

// Fonction utilitaire pour écrire les binds CRUD
function writeBinds(binds) {
  fs.writeFileSync(BINDS_FILE, JSON.stringify(binds, null, 2));
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
