// Typed wrappers around window.api (injected by the preload).
// Pages import from here — never call window.api directly.

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
        list: (status?: string) => Promise<unknown[]>
        get:  (id: number) => Promise<unknown>
      }
      uploads: {
        list: () => Promise<unknown[]>
      }
      settings: {
        getAll: () => Promise<Record<string, string>>
        set:    (key: string, value: string) => Promise<{ success: boolean }>
      }
    }
  }
}

export const api = window.api
