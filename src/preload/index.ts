import { contextBridge } from 'electron'

// Typed API surface exposed to the renderer.
// Handlers are wired to ipcMain.handle() in Phase 3.
contextBridge.exposeInMainWorld('api', {
  // Phase 3: accounts, assets, projects, jobs, settings IPC
})
