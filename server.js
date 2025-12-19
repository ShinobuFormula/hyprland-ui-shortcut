import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

// Répertoire public (UI)
const ROOT = path.resolve("./public");

// Fichier généré pour les binds créés depuis l’UI
const GENERATED_CONF = path.resolve("../binds.generated.conf");

// Crée le fichier généré s’il n’existe pas
if (!fs.existsSync(GENERATED_CONF)) {
  fs.writeFileSync(GENERATED_CONF, "", "utf8");
  console.log(`✔ Fichier créé : ${GENERATED_CONF}`);
}

// Serveur HTTP
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // API : ajout de raccourci
  if (req.method === "POST" && parsed.pathname === "/add-bind") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      const { name, shortcut, command } = JSON.parse(body);

      if (!shortcut || !command) {
        res.writeHead(400);
        return res.end("Shortcut and command required");
      }

      // Commentaire machine-readable pour generate.js
      const entry =
`\n#@bind${name ? ` name="${name}"` : ""}
bind = ${shortcut}, exec, ${command}
`;

      // Ajout sécurisé dans le fichier généré
      fs.appendFileSync(GENERATED_CONF, entry, { encoding: "utf8" });

      res.writeHead(200);
      res.end("OK");
    });
    return;
  }

  // Fichiers statiques
  const filePath =
    parsed.pathname === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, parsed.pathname);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end("Not Found");
  }

  res.writeHead(200);
  fs.createReadStream(filePath).pipe(res);
});

// Écoute sur localhost:3333
server.listen(3333, () => {
  console.log("✔ UI Hyprland sur http://localhost:3333");
  console.log(`✔ Les raccourcis ajoutés seront stockés dans : ${GENERATED_CONF}`);
});
