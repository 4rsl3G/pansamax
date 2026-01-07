const BASE = import.meta.env.VITE_API_BASE

async function get(path) {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export const api = {
  languages: () => get(`/api/languages`),
  home: (lang) => get(`/api/home?lang=${encodeURIComponent(lang)}`),
  search: (q, lang) => get(`/api/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`),
  episodes: (code, lang) => get(`/api/episodes?code=${encodeURIComponent(code)}&lang=${encodeURIComponent(lang)}`),
  play: (code, lang, ep) => get(`/api/play?code=${encodeURIComponent(code)}&lang=${encodeURIComponent(lang)}&ep=${encodeURIComponent(ep)}`),
}