import { contextBridge, ipcRenderer } from 'electron'

// This is the only surface the renderer can use to talk to the main process.
// Every method here maps to an ipcMain.handle() channel registered on startup.
contextBridge.exposeInMainWorld('api', {
  dashboard: {
    getSummary: () => ipcRenderer.invoke('dashboard:getSummary'),
  },
  accounts: {
    list:   ()           => ipcRenderer.invoke('accounts:list'),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
  },
  assets: {
    list:   (type?: string) => ipcRenderer.invoke('assets:list', type),
    create: (asset: unknown) => ipcRenderer.invoke('assets:create', asset),
    delete: (id: number)     => ipcRenderer.invoke('assets:delete', id),
  },
  projects: {
    list:   ()               => ipcRenderer.invoke('projects:list'),
    get:    (id: number)     => ipcRenderer.invoke('projects:get', id),
    create: (p: unknown)     => ipcRenderer.invoke('projects:create', p),
    delete: (id: number)     => ipcRenderer.invoke('projects:delete', id),
  },
  jobs: {
    list: (status?: string) => ipcRenderer.invoke('jobs:list', status),
    get:  (id: number)      => ipcRenderer.invoke('jobs:get', id),
  },
  uploads: {
    list: () => ipcRenderer.invoke('uploads:list'),
  },
  settings: {
    getAll: ()                         => ipcRenderer.invoke('settings:getAll'),
    set:    (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
})
