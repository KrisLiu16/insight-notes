import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  runGit: (cwd, args) => ipcRenderer.invoke('run-git', { cwd, args }),
});
