import { useState } from 'react'
import { cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/button.jsx'
import { useTheme } from '@/components/ThemeProvider.jsx'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  UserCheck, 
  FileText, 
  Settings, 
  Menu, 
  Sun, 
  Moon,
  ChevronLeft
} from 'lucide-react'

const Sidebar = ({ activeTab, onTabChange }) => {
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'analysts', label: 'Analistas', icon: UserCheck },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ]

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Helpdesk</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Billing System</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-10",
                  collapsed ? "px-2" : "px-3",
                  isActive && "bg-blue-600 text-white hover:bg-blue-700"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-2")} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "w-full justify-start h-10",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {theme === 'light' ? (
            <Moon className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-2")} />
          ) : (
            <Sun className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-2")} />
          )}
          {!collapsed && <span>Tema {theme === 'light' ? 'Escuro' : 'Claro'}</span>}
        </Button>
      </div>
    </div>
  )
}

export default Sidebar