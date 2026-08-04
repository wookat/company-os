import { useEffect, useState } from 'react'

export function useHash(): string {
  const [hash, setHash] = useState(() => location.hash.slice(1))
  useEffect(() => {
    const fn = () => setHash(location.hash.slice(1))
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return hash
}

export function nav(h: string) {
  if (location.hash.slice(1) !== h) location.hash = h
}

export function safeDec(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
