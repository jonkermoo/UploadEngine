// Typed wrappers around window.api, which is injected by the preload script via contextBridge.
// All pages import `api` from here — never call window.api directly.
// This centralises the type definitions so there's one place to update when IPC channels change.

// `declare global { interface Window` is TypeScript module augmentation — it adds our
// custom `api` property to the built-in Window interface. Without this, TypeScript would
// error on every `window.api` access because it doesn't know the property exists.
declare global {
  interface Window {
    api: {
      dashboard: {
        getSummary: () => Promise<{
          accountCount: number
          pendingJobs: number
          runningJobs: number
          failedJobs: number
          uploadsToday: number
          uploadsWeek: number
          recentJobs: unknown[]
          recentUploads: unknown[]
        }>
      }
      accounts: {
        list:   () => Promise<unknown[]>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      assets: {
        list:   (type?: string) => Promise<unknown[]>
        create: (asset: unknown) => Promise<unknown>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      projects: {
        list:   () => Promise<unknown[]>
        get:    (id: number) => Promise<unknown>
        create: (p: unknown) => Promise<unknown>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      jobs: {
        list:         (status?: string)   => Promise<unknown[]>
        get:          (id: number)        => Promise<unknown>
        createRender: (projectId: number) => Promise<unknown>
        retry:        (id: number)        => Promise<unknown>
        cancel:       (id: number)        => Promise<{ success: boolean }>
        deleteTemp:   (id: number)        => Promise<{ success: boolean }>
      }
      uploads: {
        list: () => Promise<unknown[]>
      }
      settings: {
        getAll: () => Promise<Record<string, string>>
        set:    (key: string, value: string) => Promise<{ success: boolean }>
      }
      presets: {
        list: () => Promise<unknown[]>
      }
      templates: {
        list: () => Promise<unknown[]>
      }
      dialog: {
        openFiles:   () => Promise<string[]>
        confirm:     (message: string) => Promise<boolean>
        importFiles: (paths: string[]) => Promise<unknown[]>
      }
    }
  }
}

// Shorthand export — pages write `api.accounts.list()` instead of `window.api.accounts.list()`.
export const api = window.api
