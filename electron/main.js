import { app, BrowserWindow, Menu, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.join(__dirname, '..', 'dist', 'index.html');

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;

  const createWindow = () => {
    const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    const resolveIconPath = () => {
      // When packaged, icon files live next to app.asar (extraResources) or under resources/.
      const packagedCandidates = [
        path.join(process.resourcesPath, iconFile),
        path.join(process.resourcesPath, 'resources', iconFile),
      ];
      const devCandidate = path.join(__dirname, '..', 'resources', iconFile);
      const candidates = app.isPackaged ? packagedCandidates : [devCandidate];
      return candidates.find(p => fs.existsSync(p)) || devCandidate;
    };

    const iconPath = resolveIconPath();

    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 960,
      minHeight: 640,
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.loadFile(DIST_PATH);

    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow = win;
  };

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
