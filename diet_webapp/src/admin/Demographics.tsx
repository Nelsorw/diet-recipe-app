import { useEffect, useState } from 'react'
import { adminDemographics } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

const COLORS      = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const AGE_COLORS  = { child: '#3b82f6', adult: '#16a34a', older: '#f59e0b', unknown: '#9ca3af' }
const AGE_LABELS: Record<string, string> = {
  child: 'Children (<18)',
  adult: 'Adults (18–59)',
  older: 'Elderly (60+)',
  unknown: 'Unknown',
}
const GEN_COLORS  = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' }
const BMI_COLORS: Record<string, string> = {
  underweight: '#3b82f6',
  normal     : '#16a34a',
  overweight : '#f59e0b',
  obese      : '#ef4444',
}
const BMI_LABELS: Record<string, string> = {
  underweight: 'Underweight  (<18.5)',
  normal     : 'Normal  (18.5–24.9)',
  overweight : 'Overweight  (25–29.9)',
  obese      : 'Obese  (≥30)',
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-gray-700 capitalize">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-gray-900">{value.toLocaleString()}</span>
    </div>
  )
}

// Build a cross-tab table: rows = conditions/diets, cols = groups
function CrossTable({ data, rowKey, groups, groupLabels, groupColors }: any) {
  if (!data || data.length === 0) return <p className="text-xs text-gray-400">No data</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">
              {rowKey === 'condition' ? 'Health Condition' : 'Dietary Restriction'}
            </th>
            {groups.map((g: string) => (
              <th key={g} className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: groupColors[g] }}>
                {groupLabels[g]}
              </th>
            ))}
            <th className="text-center py-2 px-2 font-bold text-gray-500 uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row: any, i: number) => {
            const total = groups.reduce((s: number, g: string) => s + (row[g] || 0), 0)
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-semibold text-gray-700">{row[rowKey === 'condition' ? 'condition' : 'diet']}</td>
                {groups.map((g: string) => (
                  <td key={g} className="py-2.5 px-2 text-center text-gray-600">{(row[g] || 0).toLocaleString()}</td>
                ))}
                <td className="py-2.5 px-2 text-center font-bold text-gray-800">{total.toLocaleString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Demographics() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminDemographics()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!data) return <div className="p-8 text-red-500">Failed to load demographics.</div>

  const ageData = [
    { name: 'Children (<18)',  value: data.age_groups.child,   fill: AGE_COLORS.child   },
    { name: 'Adults (18–59)', value: data.age_groups.adult,   fill: AGE_COLORS.adult   },
    { name: 'Elderly (60+)',  value: data.age_groups.older,   fill: AGE_COLORS.older   },
    { name: 'Unknown',        value: data.age_groups.unknown, fill: AGE_COLORS.unknown },
  ].filter(d => d.value > 0)

  const genderData = [
    { name: 'Male',   value: data.gender.male,   fill: GEN_COLORS.male   },
    { name: 'Female', value: data.gender.female, fill: GEN_COLORS.female },
    { name: 'Other',  value: data.gender.other,  fill: GEN_COLORS.other  },
  ].filter(d => d.value > 0)

  // Matrix: age group × gender
  const matrixRows = ['child', 'adult', 'older']
  const matrixLabels: Record<string, string> = {
    child: 'Children', adult: 'Adults', older: 'Elderly'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">User Demographics</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {data.total_profiles.toLocaleString()} total profiles across all users
        </p>
      </div>

      {/* ── Overview cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Profiles', value: data.total_profiles,       color: 'bg-primary-50 text-primary-700', icon: '👥' },
          { label: 'Male',           value: data.gender.male,          color: 'bg-blue-50 text-blue-700',       icon: '👨' },
          { label: 'Female',         value: data.gender.female,        color: 'bg-pink-50 text-pink-700',       icon: '👩' },
          { label: 'Elderly',        value: data.age_groups.older,         color: 'bg-yellow-50 text-yellow-700',   icon: '�' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mx-auto mb-2 ${s.color}`}>{s.icon}</div>
            <p className="text-xl font-extrabold text-gray-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Gender donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Gender Distribution" />
          <div className="flex items-center gap-4">
            <PieChart width={150} height={150}>
              <Pie data={genderData} cx={70} cy={70} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {genderData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {genderData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age group donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Age Group Distribution" />
          <div className="flex items-center gap-4">
            <PieChart width={150} height={150}>
              <Pie data={ageData} cx={70} cy={70} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {ageData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {ageData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age × Gender matrix */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <SectionTitle title="Age Group × Gender Matrix" sub="Number of profiles per age group and gender" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-wider">Age Group</th>
                  <th className="text-center py-2 px-3 font-bold uppercase tracking-wider" style={{ color: GEN_COLORS.male }}>Male</th>
                  <th className="text-center py-2 px-3 font-bold uppercase tracking-wider" style={{ color: GEN_COLORS.female }}>Female</th>
                  <th className="text-center py-2 px-3 font-bold uppercase tracking-wider" style={{ color: GEN_COLORS.other }}>Other</th>
                  <th className="text-center py-2 px-3 font-bold text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrixRows.map(grp => {
                  const row   = data.age_gender_matrix[grp] || {}
                  const total = (row.male || 0) + (row.female || 0) + (row.other || 0)
                  if (total === 0) return null
                  return (
                    <tr key={grp} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (AGE_COLORS as any)[grp] }} />
                          <span className="font-semibold text-gray-700">{matrixLabels[grp]}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{(row.male   || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{(row.female || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{(row.other  || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-gray-800">{total.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Health condition × Gender */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Health Condition by Gender" sub="How many male/female/other per condition" />
          {(() => {
            // pivot: condition → {male, female, other}
            const pivot: Record<string, any> = {}
            for (const r of data.health_condition_by_gender) {
              const c = r.condition || 'Unknown'
              if (!pivot[c]) pivot[c] = { condition: c, male: 0, female: 0, other: 0 }
              const g = (r.gender || '').toLowerCase()
              if (g === 'male' || g === 'female') pivot[c][g] += r.count
              else pivot[c].other += r.count
            }
            return (
              <CrossTable
                data={Object.values(pivot)}
                rowKey="condition"
                groups={['male', 'female', 'other']}
                groupLabels={{ male: 'Male', female: 'Female', other: 'Other' }}
                groupColors={GEN_COLORS}
              />
            )
          })()}
        </div>

        {/* Dietary restriction × Gender */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Dietary Restriction by Gender" sub="How many male/female/other per diet" />
          {(() => {
            const pivot: Record<string, any> = {}
            for (const r of data.diet_by_gender) {
              const d = r.diet || 'Unknown'
              if (!pivot[d]) pivot[d] = { diet: d, male: 0, female: 0, other: 0 }
              const g = (r.gender || '').toLowerCase()
              if (g === 'male' || g === 'female') pivot[d][g] += r.count
              else pivot[d].other += r.count
            }
            return (
              <CrossTable
                data={Object.values(pivot)}
                rowKey="diet"
                groups={['male', 'female', 'other']}
                groupLabels={{ male: 'Male', female: 'Female', other: 'Other' }}
                groupColors={GEN_COLORS}
              />
            )
          })()}
        </div>

        {/* Health condition × Age group */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Health Condition by Age Group" sub="Children, adults, and elderly per condition" />
          <CrossTable
            data={data.health_condition_by_age}
            rowKey="condition"
            groups={['child', 'adult', 'older']}
            groupLabels={{ child: 'Child', adult: 'Adult', older: 'Elderly' }}
            groupColors={AGE_COLORS}
          />
        </div>

        {/* Dietary restriction × Age group */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle title="Dietary Restriction by Age Group" sub="Children, adults, and elderly per diet" />
          <CrossTable
            data={data.diet_by_age}
            rowKey="diet"
            groups={['child', 'adult', 'older']}
            groupLabels={{ child: 'Child', adult: 'Adult', older: 'Elderly' }}
            groupColors={AGE_COLORS}
          />
        </div>

        {/* ── BMI Distribution ── */}
        {data.bmi && (
          <>
            {/* BMI overview cards */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center sm:col-span-1">
                <p className="text-xl font-extrabold text-gray-900">{data.bmi.average_bmi}</p>
                <p className="text-xs text-gray-400 mt-0.5">Avg BMI</p>
              </div>
              {(['underweight','normal','overweight','obese'] as const).map(cat => (
                <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-xl font-extrabold" style={{ color: BMI_COLORS[cat] }}>
                    {data.bmi.categories[cat].total}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{cat}</p>
                </div>
              ))}
            </div>

            {/* BMI donut + breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle title="BMI Distribution" />
              <div className="flex items-center gap-4">
                <PieChart width={150} height={150}>
                  <Pie
                    data={(['underweight','normal','overweight','obese'] as const).map(cat => ({
                      name : BMI_LABELS[cat],
                      value: data.bmi.categories[cat].total,
                    })).filter(d => d.value > 0)}
                    cx={70} cy={70} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value"
                  >
                    {(['underweight','normal','overweight','obese'] as const)
                      .filter(cat => data.bmi.categories[cat].total > 0)
                      .map((cat, i) => <Cell key={i} fill={BMI_COLORS[cat]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-2 flex-1">
                  {(['underweight','normal','overweight','obese'] as const).map(cat => (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BMI_COLORS[cat] }} />
                        <span className="text-xs text-gray-600 capitalize">{cat}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800">{data.bmi.categories[cat].total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BMI × Gender + Age breakdown table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle title="BMI by Gender & Age Group" sub="Breakdown of each BMI category" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: GEN_COLORS.male }}>Male</th>
                      <th className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: GEN_COLORS.female }}>Female</th>
                      <th className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: AGE_COLORS.child }}>Child</th>
                      <th className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: AGE_COLORS.adult }}>Adult</th>
                      <th className="text-center py-2 px-2 font-bold uppercase tracking-wider" style={{ color: AGE_COLORS.older }}>Elderly</th>
                      <th className="text-center py-2 px-2 font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(['underweight','normal','overweight','obese'] as const).map(cat => {
                      const r = data.bmi.categories[cat]
                      return (
                        <tr key={cat} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BMI_COLORS[cat] }} />
                              <span className="font-semibold text-gray-700 capitalize">{cat}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{r.male}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{r.female}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{r.child}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{r.adult}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{r.elderly}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-gray-800">{r.total}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Based on {data.bmi.total_with_data} profiles with weight & height data.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
