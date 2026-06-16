import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { getDatabase, closeDatabase } from './db/database'
import { registerDashboardHandlers } from './ipc/dashboard.ipc'
import { registerAccountHandlers } from './ipc/accounts.ipc'
import { registerAssetHandlers } from './ipc/assets.ipc'
import { registerProjectHandlers } from './ipc/projects.ipc'
import { registerJobHandlers } from './ipc/jobs.ipc'
import { registerUploadHandlers } from './ipc/uploads.ipc'
import { registerSettingsHandlers } from './ipc/settings.ipc'
import { registerDialogHandlers } from './ipc/dialog.ipc'
import { registerPresetHandlers } from './ipc/presets.ipc'
import { registerTemplateHandlers } from './ipc/templates.ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    // Start hidden — we show the window only after it's fully ready (see 'ready-to-show' below).
    // This prevents a blank white flash while the renderer is loading.
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // contextIsolation: true means the preload script and the renderer run in separate
      // JavaScript contexts. The renderer cannot access Node.js APIs or preload variables
      // directly — it can only use what contextBridge explicitly exposes as window.api.
      contextIsolation: true,
      // nodeIntegration: false means the renderer cannot call require() or use any Node.js
      // built-ins. This is the secure default for any Electron app that loads web content.
      nodeIntegration: false,
      // sandbox: false is required so the preload script can call require('electron') to
      // access ipcRenderer. With sandbox: true, require() is blocked even in preload.
      // This is safe because our preload only exposes a narrow, typed API via contextBridge.
      sandbox: false
    }
  })

  // Show the window only once the DOM is fully painted to avoid a visual flash.
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // If the renderer tries to open a link in a new window (e.g. <a target="_blank">),
  // open it in the user's system browser instead of spawning a new Electron window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev, electron-vite sets ELECTRON_RENDERER_URL to the Vite dev server URL so we
  // get hot module replacement. In production, we load the built static HTML file.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Open the database and run schema + seeds before anything else.
  getDatabase()

  // Register all IPC channels so they're ready before the renderer loads and tries to call them.
  registerDashboardHandlers()
  registerAccountHandlers()
  registerAssetHandlers()
  registerProjectHandlers()
  registerJobHandlers()
  registerUploadHandlers()
  registerSettingsHandlers()
  registerDialogHandlers()
  registerPresetHandlers()
  registerTemplateHandlers()

  createWindow()

  // macOS: re-create the window when the dock icon is clicked and no windows are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Close the SQLite connection cleanly before the process exits.
  closeDatabase()
  // macOS convention: apps stay running after all windows close until the user explicitly
  // quits (Cmd+Q). On Windows/Linux, closing the last window quits the app.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
