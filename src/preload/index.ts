import { contextBridge, ipcRenderer } from 'electron'

// contextBridge.exposeInMainWorld is the only safe way to pass values from the preload
// into the renderer. It creates a read-only property on window (here: window.api) that
// the renderer can call, but cannot modify or use to escape the sandbox.
//
// ipcRenderer.invoke(channel, ...args) sends a message to the main process and returns
// a Promise that resolves with whatever ipcMain.handle(channel) returns. It's the
// request/response pattern — equivalent to an async function call across process boundaries.
//
// Channel names (e.g. 'accounts:list') are plain strings — they must match exactly what
// ipcMain.handle() registered in the main process, or the call will hang indefinitely.

contextBridge.exposeInMainWorld('api', {
  dashboard: {
    getSummary: () => ipcRenderer.invoke('dashboard:getSummary'),
  },
  accounts: {
    list:   ()           => ipcRenderer.invoke('accounts:list'),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
  },
  assets: {
    list:   (type?: string)  => ipcRenderer.invoke('assets:list', type),
    create: (asset: unknown) => ipcRenderer.invoke('assets:create', asset),
    delete: (id: number)     => ipcRenderer.invoke('assets:delete', id),
  },
  projects: {
    list:   ()           => ipcRenderer.invoke('projects:list'),
    get:    (id: number) => ipcRenderer.invoke('projects:get', id),
    create: (p: unknown) => ipcRenderer.invoke('projects:create', p),
    delete: (id: number) => ipcRenderer.invoke('projects:delete', id),
  },
  jobs: {
    list:         (status?: string)  => ipcRenderer.invoke('jobs:list', status),
    get:          (id: number)       => ipcRenderer.invoke('jobs:get', id),
    createRender: (projectId: number) => ipcRenderer.invoke('jobs:createRender', projectId),
    retry:        (id: number)       => ipcRenderer.invoke('jobs:retry', id),
    cancel:       (id: number)       => ipcRenderer.invoke('jobs:cancel', id),
    deleteTemp:   (id: number)       => ipcRenderer.invoke('jobs:deleteTemp', id),
  },
  uploads: {
    list: () => ipcRenderer.invoke('uploads:list'),
  },
  settings: {
    getAll: ()                           => ipcRenderer.invoke('settings:getAll'),
    set:    (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
  },
  dialog: {
    openFiles:   ()                  => ipcRenderer.invoke('dialog:openFiles'),
    confirm:     (message: string)   => ipcRenderer.invoke('dialog:confirm', message),
    importFiles: (paths: string[])   => ipcRenderer.invoke('assets:import', paths),
  },
})
