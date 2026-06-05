import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  CpuChipIcon, CalendarDaysIcon, ChartBarIcon, UserGroupIcon,
  BellIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline'

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
      >
        <span className="font-semibold text-gray-800 text-sm">{q}</span>
        <span className={`text-primary-600 text-lg flex-shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

const FEATURES = [
  {
    icon : <CpuChipIcon className="w-6 h-6 text-primary-600" />,
    title: 'AI-Powered Recommendations',
    desc : 'Our machine learning model analyzes your health profile and suggests the most suitable recipes tailored just for you.'
  },
  {
    icon : <CalendarDaysIcon className="w-6 h-6 text-primary-600" />,
    title: 'Personalized Meal Plans',
    desc : 'Get a full weekly meal plan generated automatically based on your nutrition targets, health conditions, and dietary restrictions.'
  },
  {
    icon : <ChartBarIcon className="w-6 h-6 text-primary-600" />,
    title: 'Track Your Progress',
    desc : 'Log every meal and watch your daily nutrition progress. Streaks, achievements, and weekly summaries keep you motivated.'
  },
  {
    icon : <UserGroupIcon className="w-6 h-6 text-primary-600" />,
    title: 'Multiple Profiles',
    desc : 'Manage nutrition for your whole family. Switch between profiles for yourself, your children, or elderly relatives.'
  },
  {
    icon : <BellIcon className="w-6 h-6 text-primary-600" />,
    title: 'Smart Reminders',
    desc : 'Receive meal reminders, streak notifications, and achievement alerts directly in the app and via email.'
  },
  {
    icon : <ShieldCheckIcon className="w-6 h-6 text-primary-600" />,
    title: 'Health Condition Aware',
    desc : 'The system understands conditions like diabetes, hypertension, and heart disease to recommend truly safe meals.'
  },
]

const STATS = [
  { value: '247K+', label: 'Recipes' },
  { value: '4',     label: 'Health Conditions' },
  { value: '5',   label: 'Dietary Options' },
  { value: '100%',  label: 'Personalized' },
]

export default function Landing() {
  const navigate            = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo-icon.png" alt="logo" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          <span className="font-extrabold text-gray-900 text-base sm:text-lg truncate">Diet & Recipe</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors px-3 py-2 min-h-[40px] min-w-[60px]"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors min-h-[40px] whitespace-nowrap"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-primary-50 via-white to-emerald-50">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            AI-Powered Nutrition Assistant
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Eat Smarter.<br />
            <span className="text-primary-600">Live Healthier.</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Diet & Recipe uses advanced AI to recommend personalized meals based on your health profile, dietary restrictions, and nutrition goals. Your journey to better health starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:-translate-y-0.5 min-h-[52px]"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-8 py-4 rounded-2xl text-base transition-all border border-gray-200 hover:border-primary-300 min-h-[52px]"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-2xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-primary-600">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Everything you need to eat well</h2>
            <p className="text-gray-400 text-base">Built for individuals, families, and anyone managing a health condition.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-gray-50 hover:bg-primary-50 border border-gray-100 hover:border-primary-200 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-600 to-emerald-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">How it works</h2>
          <p className="text-primary-200 text-base mb-14">Get started in minutes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account',   desc: 'Sign up with your email. No password needed — we generate one and send it to you.' },
              { step: '02', title: 'Set Up Profile',   desc: 'Tell us about your health, goals, and dietary needs. Add profiles for family members too.' },
              { step: '03', title: 'Get Personalized', desc: 'Receive AI-powered recipe recommendations, weekly meal plans, and nutrition tracking.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{s.title}</h3>
                <p className="text-primary-200 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/register')}
            className="mt-12 bg-white hover:bg-gray-50 text-primary-600 font-extrabold px-8 py-4 rounded-2xl text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Supported Health Conditions */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Built for your health condition</h2>
            <p className="text-gray-400 text-base">The AI understands these conditions and adapts every recommendation accordingly.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon : <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" /></svg>,
                title: 'No Specific Condition',
                desc : 'General healthy eating and balanced nutrition for anyone looking to improve their diet and lifestyle.',
                color: 'bg-green-50 border-green-100',
                badge: 'bg-green-100 text-green-700',
              },
              {
                icon : <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
                title: 'Type 2 Diabetes',
                desc : 'Low-glycemic, carb-controlled recipes that help manage blood sugar levels safely.',
                color: 'bg-blue-50 border-blue-100',
                badge: 'bg-blue-100 text-blue-700',
              },
              {
                icon : <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
                title: 'High Blood Pressure',
                desc : 'Low-sodium, potassium-rich meals specifically chosen to support healthy blood pressure.',
                color: 'bg-red-50 border-red-100',
                badge: 'bg-red-100 text-red-700',
              },
              {
                icon : <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
                title: 'Heart Disease',
                desc : 'Low saturated fat, low cholesterol recipes that protect cardiovascular health.',
                color: 'bg-orange-50 border-orange-100',
                badge: 'bg-orange-100 text-orange-700',
              },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl border p-6 ${c.color} transition-all hover:-translate-y-1 hover:shadow-md`}>
                <div className="mb-4">{c.icon}</div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.badge}`}>{c.title}</span>
                <p className="text-gray-500 text-sm leading-relaxed mt-3">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Frequently asked questions</h2>
            <p className="text-gray-400 text-base">Everything you need to know before getting started.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'Is it free to use?',
                a: 'Yes, completely free. Create an account, set up your profile, and start getting personalized meal recommendations immediately — no credit card required.'
              },
              {
                q: 'Do I need to see a doctor or nutritionist first?',
                a: 'No. The system uses your self-reported health information to tailor recommendations. However, if you have a serious medical condition, we always recommend consulting your doctor alongside using the app.'
              },
              {
                q: 'Can I use it for my child or elderly parent?',
                a: 'Yes. You can create multiple profiles under one account — one for yourself, one for your child, one for an elderly family member — each with their own health profile and recommendations.'
              },
              {
                q: 'Is my personal health data private?',
                a: 'Your data is stored securely and never shared with third parties. Only you can see your health profile, meal logs, and recommendations.'
              },
              {
                q: 'How does the AI know what recipes suit me?',
                a: 'Our machine learning model analyzes your health condition, dietary restrictions, health goal, age, weight, and activity level to score and rank recipes by suitability — just for you.'
              },
            ].map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-600 to-emerald-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to eat smarter?
          </h2>
          <p className="text-primary-200 text-base mb-10 max-w-lg mx-auto">
            Join users who are already getting personalized meal plans and recipe recommendations tailored to their health needs.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-white hover:bg-gray-50 text-primary-600 font-extrabold px-10 py-4 rounded-2xl text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[52px]"
          >
            Get Started Free →
          </button>
          <p className="text-primary-300 text-xs mt-4">No credit card. No subscription. Free forever.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <p className="text-gray-400 text-sm">© 2026 Diet & Recipe Recommendation App. All rights reserved.</p>
      </footer>
    </div>
  )
}