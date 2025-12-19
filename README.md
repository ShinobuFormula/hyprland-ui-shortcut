# Hyprland Shortcut Manager

A web interface to easily manage your Hyprland shortcuts with:

- Full CRUD (Create, Read, Update, Delete)
- Multi-language support: English / French
- Modern dark mode and responsive design
- Generates `binds.generated.conf` compatible with Hyprland for `source = ...`
- Displays readonly binds from your original `.conf` file

---

## Installation

1. Clone the repository:

git clone <repo_url>
cd <repo_name>

2. Make sure Node.js is installed:

node -v

3. Create the generated file for Hyprland if it doesn't exist:

touch ../binds.generated.conf

4. Start the server:

node server.js

5. Open the UI in your browser:

http://localhost:3333

---

## Usage

- **Add a shortcut**: fill in the form and click "Save / Enregistrer"
- **Edit**: click "Edit / Modifier" in the table, change values, then "Save"
- **Delete**: click "Delete / Supprimer"
- **Readonly binds**: any shortcuts from your original `hyprland.conf` are displayed with an ℹ️ info icon.
  - These are **readonly**: you cannot edit them from the UI
  - Hover the ℹ️ icon to see a tooltip explaining that to modify or delete them, you need to edit your `.conf` manually
  - The recommended workflow is to remove the original bind from your `.conf` and re-add it via the Shortcut Manager if you want to manage it through the UI
- **Change language**: use the dropdown at the top right

All changes are automatically written to:

../binds.generated.conf

and can be used by Hyprland with:

source = /path/to/binds.generated.conf

---

## Multi-language

The `public/translations.json` file contains the translations:

{
  "fr": { ... },
  "en": { ... }
}

You can add more languages following the same structure.

---

## Design

- Form and table centered and wide (70% of page width)
- Modern dark mode
- Responsive for tablet and mobile devices
- Language selector with flags in top-right corner

---

## Reload Hyprland

After modifying shortcuts, reload Hyprland to apply changes:

hyprctl reload

---

## Project Structure

hypr-cheatsheet/
├── server.js              # Node.js CRUD server
├── generate.js            # HTML cheat sheet generator
├── public/
│   ├── index.html         # CRUD UI
│   ├── style.css          # dark mode styles
│   ├── script.js          # CRUD + multi-language logic
│   └── translations.json  # translations file
└── ../binds.generated.conf # generated Hyprland config file

---

## License

MIT – free to use and modify.
