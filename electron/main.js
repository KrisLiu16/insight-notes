import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

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
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Ensure preload has access to necessary APIs
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
    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      return result.filePaths[0];
    });

    ipcMain.handle('run-git', async (event, { cwd, args }) => {
      try {
        const { stdout, stderr } = await execFileAsync('git', args, { 
          cwd, 
          maxBuffer: 10 * 1024 * 1024 // 10MB
        });
        return { stdout, stderr };
      } catch (error) {
        return { error: error.message };
      }
    });

    ipcMain.handle('proxy-request', async (event, { url, options }) => {
      try {
        const response = await fetch(url, options);
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        // Read body as text first to avoid stream issues
        const text = await response.text();
        
        // Try to parse as JSON if possible, but keep raw text available
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {}

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: headers,
          text: text,
          json: json
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    const template = [
      {
        label: '文件',
        submenu: [
          { label: '新建笔记', click: () => { if (mainWindow) mainWindow.webContents.send('app:navigate', { action: 'home' }); } },
          { type: 'separator' },
          { role: 'close', label: '关闭窗口' },
          { role: 'quit', label: '退出' },
        ],
      },
      {
        label: '编辑',
        submenu: [
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectAll', label: '全选' },
        ],
      },
      {
        label: '导航',
        submenu: [
          { label: '回到首页', click: () => { if (mainWindow) mainWindow.webContents.send('app:navigate', { action: 'home' }); } },
          { label: '返回上一页', click: () => { if (mainWindow) mainWindow.webContents.send('app:navigate', { action: 'back' }); } },
        ],
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '刷新' },
          { role: 'togglefullscreen', label: '切换全屏' },
          { role: 'toggleDevTools', label: '开发者工具' },
        ],
      },
      {
        label: '帮助',
        submenu: [
          { label: '官方网站', click: () => shell.openExternal('https://example.com') },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
