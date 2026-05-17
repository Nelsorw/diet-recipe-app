import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const FEATURES = [
  {
    icon : '🧠',
    title: 'AI-Powered Recommendations',
    desc : 'Our machine learning model analyzes your health profile and suggests the most suitable recipes tailored just for you.'
  },
  {
    icon : '🥗',
    title: 'Personalized Meal Plans',
    desc : 'Get a full weekly meal plan generated automatically based on your nutrition targets, health conditions, and dietary restrictions.'
  },
  {
    icon : '📊',
    title: 'Track Your Progress',
    desc : 'Log every meal and watch your daily nutrition progress. Streaks, achievements, and weekly summaries keep you motivated.'
  },
  {
    icon : '👨‍👩‍👧',
    title: 'Multiple Profiles',
    desc : 'Manage nutrition for your whole family. Switch between profiles for yourself, your children, or elderly relatives.'
  },
  {
    icon : '🔔',
    title: 'Smart Reminders',
    desc : 'Receive meal reminders, streak notifications, and achievement alerts directly in the app and via email.'
  },
  {
    icon : '🌿',
    title: 'Health Condition Aware',
    desc : 'The system understands conditions like diabetes, hypertension, and heart disease to recommend truly safe meals.'
  },
]

const STATS = [
  { value: '247K+', label: 'Recipes' },
  { value: '6',     label: 'Health Conditions' },
  { value: '10+',   label: 'Dietary Options' },
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="logo" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-extrabold text-gray-900 text-lg">Diet & Recipe</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors px-3 py-1.5"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
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
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              Start for Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-8 py-4 rounded-2xl text-base transition-all border border-gray-200 hover:border-primary-300"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-2xl mx-auto mt-16 grid grid-cols-4 gap-4">
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
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-4">
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

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <p className="text-gray-400 text-sm">© 2026 Diet & Recipe Recommendation App. All rights reserved.</p>
      </footer>
    </div>
  )
}