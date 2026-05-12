import { useState, useEffect } from 'react'
import { getVapidPublicKey, subscribePush, unsubscribePush } from '../services/api'

// simple event bus to sync between hook instances in same tab
const listeners = new Set<(val: boolean) => void>()
function notifyAll(val: boolean) {
  listeners.forEach(fn => fn(val))
}

function getStorageKey() {
  const user = localStorage.getItem('user')
  if (user) {
    try {
      const parsed = JSON.parse(user)
      return `push_subscribed_${parsed.id}`
    } catch (_) {}
  }
  return 'push_subscribed'
}

function urlBase64ToUint8Array(base64String: string) {
  const padding   = '='.repeat((4 - base64String.length % 4) % 4)
  const base64    = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData   = window.atob(base64)
  const outputArr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArr[i] = rawData.charCodeAt(i)
  }
  return outputArr
}

export function usePushNotifications() {
  const [isSupported, setIsSupported]   = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(
    () => localStorage.getItem(getStorageKey()) === 'true'
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (!supported) return

    const checkSub = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        const val = !!sub
        setIsSubscribed(val)
        localStorage.setItem(getStorageKey(), String(val))
      } catch (_) {}
    }
    checkSub()

    const handler = (val: boolean) => setIsSubscribed(val)
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  const subscribe = async () => {
    if (!isSupported) return
    setLoading(true)
    try {
      const reg  = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const keyRes    = await getVapidPublicKey()
      const publicKey = keyRes.data.public_key

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly     : true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      await subscribePush(subscription.toJSON())
      setIsSubscribed(true)
      localStorage.setItem(getStorageKey(), 'true')
      notifyAll(true)
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally { setLoading(false) }
  }

  const unsubscribe = async () => {
    if (!isSupported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush(sub.toJSON())
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
      localStorage.setItem(getStorageKey(), 'false')
      notifyAll(false)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    } finally { setLoading(false) }
  }

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe }
}