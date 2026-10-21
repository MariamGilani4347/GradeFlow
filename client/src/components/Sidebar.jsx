import { Link, useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { LayoutDashboard, BookOpen, BarChart2, Bell, Settings, LogOut } from 'lucide-react'
const navLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Sessions', path: '/dashboard/sessions', icon: '📋' },
  { label: 'Rubrics', path: '/dashboard/rubrics', icon: '📝' },
  { label: 'Notifications', path: '/dashboard/notifications', icon: '🔔' },
  { label: 'Admin', path: '/admin', icon: '⚙️'},
  { label: 'Analytics', icon: <BarChart2 size={18} />, path: '/dashboard/analytics' },
  { label: 'Admin', icon: <Shield size={18} />, path: '/dashboard/admin' }
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="w-64 min-h-screen bg-[#1E3A5F] text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-lg font-bold">GradeFlow</h1>
        <p className="text-xs text-blue-300 mt-1">Assessment Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
              location.pathname === link.path
                ? 'bg-blue-700 text-white'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <p className="text-xs text-blue-400">Teacher Assessment CRM v1.0</p>
      </div>
    </div>
  )
}