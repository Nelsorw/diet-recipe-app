import { useEffect, useState } from 'react'
import { adminDashboard } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import {
  UsersIcon, UserPlusIcon, BookOpenIcon, ClipboardDocumentListIcon,
  BellIcon, ChatBubbleLeftRightIcon, BookmarkIcon, PhotoIcon
} from '@heroicons/react/24/outline'

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function StatCard({ icon, label, value, sub, color = 'bg-primary-50 text-primary-700' }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-xl md:text-2xl font-extrabold text-gray-900">{value?.toLocaleString()}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminDashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  if (!data) return <div className="p-8 text-red-500">Failed to load dashboard.</div>

  const goalData = (data.health_goals || []).map((g: any) => ({
    name : g.goal?.replace('_', ' ') || 'unknown',
    value: g.count
  }))

  const dietData = (data.dietary_restrictions || []).map((d: any) => ({
    name : d.diet || 'unknown',
    value: d.count
  }))

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Overview of your NutriGuide platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<UsersIcon className="w-5 h-5" />}                  label="Total Users"     value={data.users?.total}        sub={`${data.users?.active_7d} active this week`}  color="bg-blue-50 text-blue-700" />
        <StatCard icon={<UserPlusIcon className="w-5 h-5" />}               label="New This Month"  value={data.users?.new_30d}       sub={`${data.users?.total_profiles} profiles · ${data.users?.suspended_profiles || 0} suspended`} color="bg-green-50 text-green-700" />
        <StatCard icon={<BookOpenIcon className="w-5 h-5" />}               label="Total Recipes"   value={data.recipes?.total}       sub={`${data.recipes?.image_pct}% have images`}     color="bg-orange-50 text-orange-700" />
        <StatCard icon={<ClipboardDocumentListIcon className="w-5 h-5" />}  label="Logs Today"      value={data.activity?.logs_today} sub={`${data.activity?.logs_7d} this week`}          color="bg-purple-50 text-purple-700" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<BellIcon className="w-5 h-5" />}                   label="Notifications"    value={data.activity?.notifications} color="bg-yellow-50 text-yellow-700" />
        <StatCard icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}    label="Chat Messages"    value={data.activity?.chat_messages} color="bg-indigo-50 text-indigo-700" />
        <StatCard icon={<BookmarkIcon className="w-5 h-5" />}               label="Saved Recipes"    value={data.activity?.saved_recipes} color="bg-pink-50 text-pink-700" />
        <StatCard icon={<PhotoIcon className="w-5 h-5" />}                  label="Recipes w/ Image" value={data.recipes?.with_image}    sub={`${data.recipes?.without_image} missing`}   color="bg-teal-50 text-teal-700" />
      </div>

      {/* Charts — stack on mobile, 2-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* User Activity — daily logs last 7 days */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Daily Meal Logs (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily_logs} barSize={28}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Logs" radius={[4, 4, 0, 0]}>
                {(data.daily_logs || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health Conditions Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Profiles by Health Condition</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.health_conditions} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="condition" tick={{ fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Profiles" radius={[0, 4, 4, 0]}>
                {(data.health_conditions || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health goals donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Users by Health Goal</h2>
          <div className="flex items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie data={goalData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {goalData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2">
              {goalData.map((g: any, i: number) => (
                <div key={g.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600 capitalize">{g.name}</span>
                  <span className="text-xs font-bold text-gray-800 ml-auto">{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dietary restrictions donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Users by Dietary Restriction</h2>
          <div className="flex items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie data={dietData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {dietData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2">
              {dietData.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600">{d.name}</span>
                  <span className="text-xs font-bold text-gray-800 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
