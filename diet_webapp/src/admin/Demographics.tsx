import { useEffect, useState } from 'react'
import { adminDemographics } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import { UsersIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

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

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Overview
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Diet & Recipe — Demographics Report'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Total Profiles', data.total_profiles],
      [],
      ['GENDER DISTRIBUTION'],
      ['Gender', 'Count'],
      ['Male',   data.gender.male],
      ['Female', data.gender.female],
      ['Other',  data.gender.other],
      [],
      ['AGE GROUP DISTRIBUTION'],
      ['Age Group', 'Count'],
      ['Children (<18)', data.age_groups.child],
      ['Adults (18–59)', data.age_groups.adult],
      ['Elderly (60+)',  data.age_groups.older],
    ]), 'Overview')

    // Sheet 2: Age × Gender Matrix
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Age Group', 'Male', 'Female', 'Other', 'Total'],
      ...(['child', 'adult', 'older'] as const).map(grp => {
        const r = data.age_gender_matrix[grp] || {}
        const total = (r.male||0)+(r.female||0)+(r.other||0)
        const label = grp === 'child' ? 'Children' : grp === 'adult' ? 'Adults' : 'Elderly'
        return [label, r.male||0, r.female||0, r.other||0, total]
      })
    ]), 'Age x Gender')

    // Sheet 3: Health Condition × Gender
    const hcGenderPivot: Record<string, any> = {}
    for (const r of data.health_condition_by_gender) {
      const c = r.condition || 'Unknown'
      if (!hcGenderPivot[c]) hcGenderPivot[c] = { condition: c, male: 0, female: 0, other: 0 }
      const g = (r.gender||'').toLowerCase()
      if (g === 'male' || g === 'female') hcGenderPivot[c][g] += r.count
      else hcGenderPivot[c].other += r.count
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Health Condition', 'Male', 'Female', 'Other', 'Total'],
      ...Object.values(hcGenderPivot).map((r: any) => [
        r.condition, r.male, r.female, r.other, r.male+r.female+r.other
      ])
    ]), 'Condition x Gender')

    // Sheet 4: Health Condition × Age
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Health Condition', 'Children', 'Adults', 'Elderly', 'Total'],
      ...data.health_condition_by_age.map((r: any) => [
        r.condition, r.child||0, r.adult||0, r.older||0,
        (r.child||0)+(r.adult||0)+(r.older||0)
      ])
    ]), 'Condition x Age')

    // Sheet 5: Diet × Gender
    const dietGenderPivot: Record<string, any> = {}
    for (const r of data.diet_by_gender) {
      const d = r.diet || 'Unknown'
      if (!dietGenderPivot[d]) dietGenderPivot[d] = { diet: d, male: 0, female: 0, other: 0 }
      const g = (r.gender||'').toLowerCase()
      if (g === 'male' || g === 'female') dietGenderPivot[d][g] += r.count
      else dietGenderPivot[d].other += r.count
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Dietary Restriction', 'Male', 'Female', 'Other', 'Total'],
      ...Object.values(dietGenderPivot).map((r: any) => [
        r.diet, r.male, r.female, r.other, r.male+r.female+r.other
      ])
    ]), 'Diet x Gender')

    // Sheet 6: Diet × Age
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Dietary Restriction', 'Children', 'Adults', 'Elderly', 'Total'],
      ...data.diet_by_age.map((r: any) => [
        r.diet, r.child||0, r.adult||0, r.older||0,
        (r.child||0)+(r.adult||0)+(r.older||0)
      ])
    ]), 'Diet x Age')

    // Sheet 7: BMI
    if (data.bmi) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['BMI Category', 'Male', 'Female', 'Children', 'Adults', 'Elderly', 'Total'],
        ...(['underweight','normal','overweight','obese'] as const).map(cat => {
          const r = data.bmi.categories[cat]
          return [cat.charAt(0).toUpperCase()+cat.slice(1), r.male, r.female, r.child, r.adult, r.elderly, r.total]
        }),
        [],
        ['Average BMI', data.bmi.average_bmi],
        ['Profiles with data', data.bmi.total_with_data],
      ]), 'BMI Distribution')
    }

    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `demographics_report_${today}.xlsx`)
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">User Demographics</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {data.total_profiles.toLocaleString()} total profiles across all users
          </p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4" /> Download Excel Report
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-primary-50 text-primary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">{data.total_profiles.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Profiles</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-blue-50 text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">{data.gender.male.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Male</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-pink-50 text-pink-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">{data.gender.female.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Female</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-yellow-50 text-yellow-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">{data.age_groups.older.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Elderly</p>
        </div>
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
