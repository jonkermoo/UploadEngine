import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    // externalizeDepsPlugin tells Vite NOT to bundle node_modules into the main process output.
    // Native modules like better-sqlite3 ship pre-compiled .node binaries that can't be bundled —
    // they must stay as real files on disk and be require()'d at runtime.
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    // Same reason as main — preload uses ipcRenderer from electron, which must stay external.
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        // Lets renderer code write `import x from '@renderer/...'` instead of long relative paths.
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
