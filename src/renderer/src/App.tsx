import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Clapperboard,
  FolderOpen,
  LayoutTemplate,
  Activity,
  CloudUpload,
  BarChart2,
  Settings
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Create from './pages/Create'
import MediaLibrary from './pages/MediaLibrary'
import Templates from './pages/Templates'
import Jobs from './pages/Jobs'
import Uploads from './pages/Uploads'
import Analytics from './pages/Analytics'
import SettingsPage from './pages/Settings'

// QueryClient is the shared cache store for all async data fetched via useQuery.
// Created once at the module level so it persists across re-renders and is shared
// across every page via QueryClientProvider below.
const queryClient = new QueryClient()

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/create', icon: Clapperboard, label: 'Create' },
  { to: '/media', icon: FolderOpen, label: 'Media Library' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/jobs', icon: Activity, label: 'Jobs' },
  { to: '/uploads', icon: CloudUpload, label: 'Uploads' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar() {
  return (
    <aside className="w-56 bg-gray-950 flex flex-col shrink-0 border-r border-gray-800">
      <div className="px-5 h-14 flex items-center border-b border-gray-800">
        <span className="text-white font-semibold text-sm tracking-wide">UploadEngine</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            // `end` is only applied to the "/" route. Without it, NavLink considers "/"
            // active on every page because every path starts with "/". `end` makes it
            // only match when the path is exactly "/", not a prefix.
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`
            }
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default function App() {
  return (
    // QueryClientProvider makes the queryClient available to every component in the tree
    // via React context. useQuery() hooks in any page can access the shared cache.
    <QueryClientProvider client={queryClient}>
      {/*
        HashRouter is used instead of BrowserRouter because Electron loads the app from
        a local file:// URL, not a web server. BrowserRouter uses real URL paths (e.g.
        /accounts) which would require a server to handle — navigating to /accounts would
        just get a 404. HashRouter puts routes after a # (e.g. /#/accounts), which is
        handled entirely in the browser/renderer and never sent to a server.
      */}
      <HashRouter>
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/create" element={<Create />} />
              <Route path="/media" element={<MediaLibrary />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/uploads" element={<Uploads />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}
