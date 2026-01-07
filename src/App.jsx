import { useEffect, useMemo, useState } from "react"
import { api } from "./lib/api"
import ShimmerGrid from "./components/ShimmerGrid"
import VideoCard from "./components/VideoCard"
import LanguagePicker from "./components/LanguagePicker"
import OverlayDetail from "./components/OverlayDetail"
import OverlayWatch from "./components/OverlayWatch"
import BottomNavMobile from "./components/BottomNavMobile"
import SidebarDesktop from "./components/SidebarDesktop"

const DEFAULT_LANG = import.meta.env.VITE_DEFAULT_LANG || "en"

export default function App() {
  const [tab, setTab] = useState("home")
  const [lang, setLang] = useState(DEFAULT_LANG)
  const [langs, setLangs] = useState([])
  const [openLang, setOpenLang] = useState(false)

  const [loading, setLoading] = useState(true)
  const [all, setAll] = useState([])
  const [q, setQ] = useState("")
  const [result, setResult] = useState([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // pseudo infinite
  const [page, setPage] = useState(1)
  const pageSize = 20
  const visible = useMemo(() => all.slice(0, page * pageSize), [all, page])

  const toggleTheme = () => {
    const curr = document.documentElement.getAttribute("data-theme") || "dark"
    document.documentElement.setAttribute("data-theme", curr === "dark" ? "light" : "dark")
  }

  useEffect(() => {
    api.languages().then(r => setLangs(r.data || [])).catch(()=>setLangs([]))
  }, [])

  useEffect(() => {
    let ok = true
    setLoading(true)
    setPage(1)

    api.home(lang)
      .then(r => ok && setAll(r.data || []))
      .catch(() => ok && setAll([]))
      .finally(() => ok && setLoading(false))

    return () => (ok = false)
  }, [lang])

  // infinite observer (home only)
  useEffect(() => {
    if (tab !== "home") return
    const el = document.getElementById("sentinel")
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setPage(p => p + 1)
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [visible.length, tab])

  const openDetail = (v) => {
    setSelected(v)
    setDetailOpen(true)
  }

  const runSearch = async () => {
    if (!q.trim()) return
    setTab("search")
    setLoading(true)
    try {
      const r = await api.search(q, lang)
      setResult(r.data || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <SidebarDesktop
        tab={tab}
        setTab={setTab}
        onOpenLang={() => setOpenLang(true)}
        onToggleTheme={toggleTheme}
      />

      {/* content wrapper with desktop sidebar offset */}
      <div className="md:ml-[260px]">
        {/* Topbar */}
        <div className="sticky top-0 z-[60] ui-panel ui-border border-x-0 border-t-0">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="md:hidden flex items-center gap-2">
              <i className="ri-play-large-fill text-[color:var(--accent)] text-2xl" />
              <div className="font-extrabold tracking-tight">PANSA</div>
            </div>

            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 ui-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Search dramas…"
                  className="w-full ui-panel ui-border rounded-2xl pl-11 pr-4 py-2 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => setOpenLang(true)}
              className="ui-btn rounded-full px-4 py-2 text-sm flex items-center gap-2"
            >
              <i className="ri-translate-2" />
              {langs.find(x=>x.code===lang)?.localName || lang.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <ShimmerGrid count={10} />
          ) : tab === "home" ? (
            <>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-2xl font-extrabold">Discover</div>
                  <div className="ui-muted text-sm mt-1">Elegant streaming UI • PANSA overlay experience</div>
                </div>
                <button onClick={() => { setTab("home"); setQ(""); }} className="hidden md:inline ui-btn rounded-full px-4 py-2 text-sm">
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visible.map(v => <VideoCard key={v.id} item={v} onClick={() => openDetail(v)} />)}
              </div>

              <div id="sentinel" className="h-10" />
            </>
          ) : (
            <>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-2xl font-extrabold">Search</div>
                  <div className="ui-muted text-sm mt-1">Results for: {q || "…"}</div>
                </div>
                <button onClick={() => setTab("home")} className="ui-btn rounded-full px-4 py-2 text-sm">
                  Back to Home
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {result.map(v => <VideoCard key={v.id} item={v} onClick={() => openDetail(v)} />)}
              </div>

              {result.length === 0 && <div className="text-center ui-muted py-16">No results</div>}
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav only */}
      <BottomNavMobile
        tab={tab}
        setTab={setTab}
        onOpenLang={() => setOpenLang(true)}
        onToggleTheme={toggleTheme}
      />

      {/* Overlays */}
      <LanguagePicker
        open={openLang}
        onClose={() => setOpenLang(false)}
        items={langs}
        current={lang}
        onPick={(c) => { setLang(c); setOpenLang(false) }}
      />

      <OverlayDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        video={selected}
        onWatch={() => { setDetailOpen(false); setWatchOpen(true) }}
      />

      <OverlayWatch
        open={watchOpen}
        onClose={() => setWatchOpen(false)}
        video={selected}
        lang={lang}
      />
    </div>
  )
}