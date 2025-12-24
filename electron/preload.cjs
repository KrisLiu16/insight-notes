'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  runGit: (cwd, args) => ipcRenderer.invoke('run-git', { cwd, args }),
  proxyRequest: (url, options) => ipcRenderer.invoke('proxy-request', { url, options }),
  onNavigate: (handler) => {
    ipcRenderer.on('app:navigate', (_event, payload) => {
      try { handler && handler(payload); } catch (e) {}
    });
  },
});
