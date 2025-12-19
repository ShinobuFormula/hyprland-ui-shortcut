document.getElementById("save").onclick = async () => {
  const name = document.getElementById("name").value;
  const shortcut = document.getElementById("shortcut").value;
  const command = document.getElementById("command").value;

  if (!shortcut || !command) {
    alert("Raccourci et commande requis");
    return;
  }

  await fetch("/add-bind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, shortcut, command })
  });

  alert("Raccourci ajouté 🎉");
};
