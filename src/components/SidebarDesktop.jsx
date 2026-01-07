export default function SidebarDesktop({ tab, setTab, onOpenLang, onToggleTheme }) {
  return (
    <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-[260px] ui-panel ui-border border-l-0 border-t-0 border-b-0">
      <div className="w-full p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <i className="ri-play-large-fill text-[color:var(--accent)] text-2xl" />
          <div className="font-extrabold tracking-tight text-lg">PANSA</div>
        </div>

        <div className="mt-2 grid gap-2">
          <button
            onClick={() => setTab("home")}
            className={`ui-btn ui-border rounded-2xl px-4 py-3 flex items-center gap-3 ${tab==="home" ? "ring-2 ring-white/10" : ""}`}
          >
            <i className="ri-home-5-line text-xl" />
            <span className="font-semibold">Home</span>
          </button>

          <button
            onClick={() => setTab("search")}
            className={`ui-btn ui-border rounded-2xl px-4 py-3 flex items-center gap-3 ${tab==="search" ? "ring-2 ring-white/10" : ""}`}
          >
            <i className="ri-search-line text-xl" />
            <span className="font-semibold">Search</span>
          </button>
        </div>

        <div className="mt-auto grid gap-2">
          <button onClick={onOpenLang} className="ui-btn ui-border rounded-2xl px-4 py-3 flex items-center gap-3">
            <i className="ri-translate-2 text-xl" />
            <span className="font-semibold">Language</span>
          </button>

          <button onClick={onToggleTheme} className="ui-btn ui-border rounded-2xl px-4 py-3 flex items-center gap-3">
            <i className="ri-sun-line text-xl" />
            <span className="font-semibold">Theme</span>
          </button>

          <div className="text-xs ui-muted mt-2">
            Elegant UI • No reload • TikTok-like player
          </div>
        </div>
      </div>
    </div>
  )
}