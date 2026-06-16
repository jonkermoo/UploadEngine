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
  )
}
