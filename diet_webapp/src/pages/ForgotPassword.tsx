import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, verifyOtp, resetPassword } from '../services/api'
import { LockClosedIcon, EnvelopeIcon, KeyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

type Step = 'email' | 'otp' | 'password' | 'done'

const STEP_ICONS: Record<string, React.ReactNode> = {
  email   : <LockClosedIcon    className="w-9 h-9 text-white" />,
  otp     : <EnvelopeIcon      className="w-9 h-9 text-white" />,
  password: <KeyIcon           className="w-9 h-9 text-white" />,
  done    : <CheckCircleIcon   className="w-9 h-9 text-white" />,
}

export default function ForgotPassword() {
  const navigate          = useNavigate()
  const [step, setStep]   = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp]     = useState('')
  const [newPass, setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required.'); return }
    setLoading(true); setError('')
    try {
      await forgotPassword(email.trim())
      setStep('otp')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP.')
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) { setError('Please enter the OTP.'); return }
    setLoading(true); setError('')
    try {
      await verifyOtp(email.trim(), otp.trim())
      setStep('password')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP.')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPass || !confirmPass) { setError('All fields are required.'); return }
    if (newPass !== confirmPass)  { setError('Passwords do not match.'); return }
    if (newPass.length < 6)       { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(email.trim(), newPass)
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.')
    } finally { setLoading(false) }
  }

  const stepTitles = {
    email   : { title: 'Forgot Password',    sub: 'Enter your email to receive an OTP' },
    otp     : { title: 'Check Your Email',   sub: `We sent a 6-digit OTP to ${email}` },
    password: { title: 'Set New Password',   sub: 'Choose a strong new password' },
    done    : { title: 'Password Reset!',    sub: 'Your password has been updated successfully' },
  }

  const { title, sub } = stepTitles[step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${step === 'done' ? 'bg-green-500' : 'bg-primary-600'}`}>
            {STEP_ICONS[step]}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">{title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{sub}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
              <XCircleIcon className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Step 1 — Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                📧 Check your inbox at <strong>{email}</strong> for the 6-digit OTP.
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enter OTP</label>
                <input
                  type="text" value={otp} onChange={e => setOtp(e.target.value)}
                  placeholder="123456" maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button" disabled={loading}
                onClick={async () => {
                  setError(''); setOtp('')
                  try {
                    await forgotPassword(email.trim())
                    setError('')
                  } catch (err: any) {
                    setError(err.response?.data?.error || 'Failed to resend OTP.')
                  }
                }}
                className="w-full text-primary-600 text-sm font-semibold hover:underline transition-colors"
              >
                🔄 Resend OTP
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* Step 3 — New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input
                  type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Step 4 — Done */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <p className="text-gray-500 text-sm">You can now log in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {step === 'email' && (
          <p className="text-center mt-6 text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign In</Link>
          </p>
        )}
      </div>
    </div>
  )
}