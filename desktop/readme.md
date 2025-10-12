# CarBar Electron App

## Overview
CarBar is a simple Electron-based desktop application that opens a predefined URL (`https://carbar-pi.vercel.app`) inside a non-resizable, centered browser window. The window size dynamically adjusts based on the screen resolution.

---


## Project Structure

```
carbar-electron/
├── main.js           # Main Electron process script
├── package.json      # Project configuration & dependencies
├── icon.ico          # Windows icon file (for packaging)
├── icon.icns         # macOS icon file (for packaging)
└── ...               # Other files (optional)
```

---

## Development

### Run the app in development mode:

```bash
npm start
```

This launches the Electron app in a window loading the target URL.

---

## Building the App (Packaging)

CarBar uses [Electron Builder](https://www.electron.build/) to package the app into platform-specific executables.

### 1. Ensure your icon files are ready:

* `icon.ico` for Windows
* `icon.icns` for macOS
* `icon.png` for Linux (optional)

Place these icons in the root project folder.

---

### 2. Build commands

Use the following commands depending on your target platform:

| Platform | Command                   | Output                 |
| -------- | ------------------------- | ---------------------- |
| Windows  | `npm run dist -- --win`   | `.exe` installer & app |
| macOS    | `npm run dist -- --mac`   | `.dmg` installer       |
| Linux    | `npm run dist -- --linux` | `.deb` or `.AppImage`  |

---

### 3. Example - Build for Windows:

```bash
npm run dist -- --win
```

After building, check the `/dist` folder for your packaged app installer and executable.

---

## Scripts in `package.json`

| Script  | Description                  |
| ------- | ---------------------------- |
| `start` | Run the app in development   |
| `dist`  | Package app for distribution |

---

## Configuration (in `package.json`)

* **appId**: Unique app identifier (`com.carbar.app`)
* **productName**: App name shown in installer and menus
* **icon**: Path to app icon for different platforms
* **files**: Files included in the packaged app

---