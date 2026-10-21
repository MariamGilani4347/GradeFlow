import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}