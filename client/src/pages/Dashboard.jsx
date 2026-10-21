import DashboardHome from './DashboardHome'

console.log('Dashboard module loaded, rendering DashboardHome')

export default function Dashboard({ children }) {
  console.log('Dashboard rendering, children:', children)
  return children || <DashboardHome />
}