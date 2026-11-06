// components/admin/Sidebar.tsx
'use client'

import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  Users,
  FileText
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Categories', href: '/admin/categories', icon: Tag },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Content', href: '/admin/content', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white h-screen flex flex-col transition-all duration-300`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <ShoppingBag className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold">ShoeStore Admin</h1>
              <p className="text-gray-400 text-sm">Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </a>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 w-full"
        >
          <div className="h-5 w-5 flex items-center justify-center">
            {collapsed ? '→' : '←'}
          </div>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User & Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="font-bold">A</span>
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="font-medium">Admin User</p>
              <p className="text-gray-400 text-sm">admin@shoes.com</p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 w-full"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}