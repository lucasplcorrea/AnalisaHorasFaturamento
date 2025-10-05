import { useState } from 'react'
import { ThemeProvider } from '@/components/ThemeProvider.jsx'
import Sidebar from '@/components/Sidebar.jsx'
import NewDashboardPage from '@/components/NewDashboardPage.jsx'
import NewAnalyticsPage from '@/components/NewAnalyticsPage.jsx'
import NewClientsPage from '@/components/NewClientsPage.jsx'
import NewAnalystsPage from '@/components/NewAnalystsPage.jsx'
import NewReportsPage from '@/components/NewReportsPage.jsx'
import NewSettingsPage from '@/components/NewSettingsPage.jsx'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <NewDashboardPage />
      case 'analytics':
        return <NewAnalyticsPage />
      case 'clients':
        return <NewClientsPage />
      case 'analysts':
        return <NewAnalystsPage />
      case 'reports':
        return <NewReportsPage />
      case 'settings':
        return <NewSettingsPage />
      default:
        return <NewDashboardPage />
    }
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-7xl">
            {renderContent()}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
