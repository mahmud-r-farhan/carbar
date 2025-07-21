# CarBar - Desktop App

A lightweight desktop wrapper for the [CarBar web app](https://carbar-pi.vercel.app/) using Python and PyWebview.

## Features

* Automatically adjusts window size based on screen resolution.
* Opens centered on the screen.
* Non-resizable window for consistent UX.
* Private browsing mode enabled.
* Cross-platform support (Windows-specific screen resolution logic).

---

## Requirements

* Python 3.x
* [pywebview](https://pywebview.flowrl.com/)
* pyinstaller

---

## Install Dependencies

```bash
pip install pywebview pyinstaller
```

> On Windows, you may also need the `pywin32` package:

```bash
pip install pywin32
```

---

## Building the Executable

Make sure your script is named `main.py` and the icon file `logo-512.ico` is in the same directory.

### Build Command

```bash
pyinstaller --onefile --windowed --name CARBAR --icon=logo-512.ico main.py
```

* `--onefile`: Bundle everything into a single executable.
* `--windowed`: Hide the terminal window (GUI mode).
* `--name`: Name of the output executable (`CARBAR.exe` on Windows).
* `--icon`: Path to the icon file for the app.

---

## Running the App

After building, you can find the executable in the `dist/` directory:

```bash
cd dist
./CARBAR  # On Windows: CARBAR.exe
```

---

## Notes

* Screen resolution detection currently only supports Windows for DPI-aware scaling.
* On non-Windows systems, a default resolution of 1920×1080 is assumed.

---