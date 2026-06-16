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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  getDatabase()

  registerDashboardHandlers()
  registerAccountHandlers()
  registerAssetHandlers()
  registerProjectHandlers()
  registerJobHandlers()
  registerUploadHandlers()
  registerSettingsHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
