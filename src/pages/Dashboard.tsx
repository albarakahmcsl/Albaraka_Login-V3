import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission } from '../utils/permissions'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  BarChart3,
  Settings,
  AlertCircle,
  Clock,
  CheckCircle2,
  Info
} from 'lucide-react'

interface DashboardStat {
  name: string
  value: string
  change: string
  changeType: 'positive' | 'negative'
  icon: React.ComponentType<any>
  description: string
  permission?: { resource: string; action: string }
}

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
  status: 'success' | 'info' | 'warning' | 'error'
  user?: string
}

const dashboardStats: DashboardStat[] = [
  {
    name: 'Total Members',
    value: '2,847',
    change: '+4.75%',
    changeType: 'positive',
    icon: Users,
    description: 'Registered members',
    permission: { resource: 'users', action: 'read' }
  },
  {
    name: 'Active Accounts',
    value: 'MUR 1,31,42,000',
    change: '+8.2%',
    changeType: 'positive',
    icon: DollarSign,
    description: 'Total account balance',
    permission: { resource: 'transactions', action: 'create' }
  },
  {
    name: 'Monthly Growth',
    value: '24.1%',
    change: '+0.7%',
    changeType: 'positive',
    icon: TrendingUp,
    description: 'Portfolio growth rate',
    permission: { resource: 'reports', action: 'view' }
  },
  {
    name: 'Reports Generated',
    value: '152',
    change: '+4.8%',
    changeType: 'positive',
    icon: FileText,
    description: 'This month',
    permission: { resource: 'reports', action: 'view' }
  }
]

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'account_opened',
    description: 'New Hajj savings account opened',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'success',
    user: 'Fatima Al-Zahra'
  },
  {
    id: '2',
    type: 'transaction_processed',
    description: 'Monthly dividend payment processed',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'info'
  },
  {
    id: '3',
    type: 'report_generated',
    description: 'Quarterly financial report generated',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'success'
  },
  {
    id: '4',
    type: 'loan_application',
    description: 'New loan application submitted',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'warning',
    user: 'Omar Khalid'
  },
  {
    id: '5',
    type: 'user_registered',
    description: 'New member registration completed',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    user: 'Aisha Rahman'
  }
]

export function Dashboard() {
  const { user } = useAuth()

  // Filter stats based on user permissions
  const visibleStats = dashboardStats.filter(stat => {
    if (!stat.permission) return true
    return hasPermission(user, stat.permission.resource, stat.permission.action)
  })

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'success':
        return CheckCircle2
      case 'warning':
        return AlertCircle
      case 'info':
        return Info
      case 'error':
        return AlertCircle
      default:
        return Activity
    }
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500 bg-green-50'
      case 'warning':
        return 'text-yellow-500 bg-yellow-50'
      case 'info':
        return 'text-blue-500 bg-blue-50'
      case 'error':
        return 'text-red-500 bg-red-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="space-y-8 pt-24">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-emerald-100 text-lg">
              Here's your Islamic finance operations overview for today
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-emerald-100 text-sm">Today's Date</p>
              <p className="text-white font-semibold">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </p>
                      <div className="flex items-center">
                        <div className={`flex items-center text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.changeType === 'positive' ? (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          )}
                          {stat.change}
                        </div>
                        <span className="text-gray-500 text-sm ml-2">
                          {stat.description}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Activity className="h-6 w-6 text-emerald-600 mr-2" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasPermission(user, 'transactions', 'create') && (
            <button className="group p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">New Transaction</h3>
              <p className="text-sm text-gray-600">
                Process Islamic finance transactions and transfers
              </p>
            </button>
          )}
          
          {hasPermission(user, 'reports', 'view') && (
            <button className="group p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Generate Report</h3>
              <p className="text-sm text-gray-600">
                Create detailed financial and compliance reports
              </p>
            </button>
          )}
          
          {hasPermission(user, 'users', 'read') && (
            <button className="group p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Manage Members</h3>
              <p className="text-sm text-gray-600">
                Add, edit, or view member accounts and profiles
              </p>
            </button>
          )}

          {hasPermission(user, 'reports', 'view') && (
            <button className="group p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">
                View performance metrics and insights
              </p>
            </button>
          )}

          <button className="group p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-sm text-gray-600">
              Configure your account and preferences
            </p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-6 w-6 text-emerald-600 mr-2" />
            Recent Activity
          </h2>
          <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            View all
          </button>
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.status)
            const colorClasses = getActivityColor(activity.status)
            
            return (
              <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-full ${colorClasses}`}>
                  <ActivityIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  {activity.user && (
                    <p className="text-sm text-gray-600">
                      by {activity.user}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'success' ? 'bg-green-100 text-green-800' :
                  activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  activity.status === 'info' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {activity.status}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 text-emerald-600 mr-2" />
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Services</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Authentication</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Backup System</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-yellow-600">Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 text-emerald-600 mr-2" />
            Your Role & Permissions
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Role</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                {user?.roles?.map(role => role.name).join(', ') || 'No role assigned'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Access Level</p>
              <div className="space-y-2">
                {hasPermission(user, 'admin', 'access') && (
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Administrative Access
                  </div>
                )}
                {hasPermission(user, 'users', 'manage') && (
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    User Management
                  </div>
                )}
                {hasPermission(user, 'transactions', 'create') && (
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Transaction Processing
                  </div>
                )}
                {hasPermission(user, 'reports', 'view') && (
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Report Generation
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getActivityIcon(status: string) {
  switch (status) {
    case 'success':
      return CheckCircle2
    case 'warning':
      return AlertCircle
    case 'info':
      return Info
    case 'error':
      return AlertCircle
    default:
      return Activity
  }
}

function getActivityColor(status: string) {
  switch (status) {
    case 'success':
      return 'text-green-500 bg-green-50'
    case 'warning':
      return 'text-yellow-500 bg-yellow-50'
    case 'info':
      return 'text-blue-500 bg-blue-50'
    case 'error':
      return 'text-red-500 bg-red-50'
    default:
      return 'text-gray-500 bg-gray-50'
  }
}

function formatTimeAgo(timestamp: string) {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}