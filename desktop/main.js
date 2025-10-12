const { app, BrowserWindow, screen } = require('electron');

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  let width, height;
  if (screenWidth <= 1366) {
    width = 390;
    height = 720;
  } else {
    width = 400;
    height = 840;
  }

  const x = Math.floor((screenWidth - width) / 2);
  const y = Math.floor((screenHeight - height) / 2);

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
    },
    title: 'CarBar',
  });

  win.loadURL('https://carbar-pi.vercel.app');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
