function Item({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition ${
        active ? "text-[color:var(--accent)]" : "ui-muted hover:text-white"
      }`}
    >
      <i className={`${icon} text-2xl`} />
      <div className="text-[11px] mt-1">{label}</div>
    </button>
  )
}

export default function BottomNavMobile({ tab, setTab, onOpenLang, onToggleTheme }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[70] px-4 pb-4">
      <div className="max-w-3xl mx-auto ui-panel ui-border rounded-3xl p-2 flex justify-around backdrop-blur">
        <Item icon="ri-home-5-line" label="Home" active={tab==="home"} onClick={() => setTab("home")} />
        <Item icon="ri-search-line" label="Search" active={tab==="search"} onClick={() => setTab("search")} />
        <Item icon="ri-translate-2" label="Lang" active={false} onClick={onOpenLang} />
        <Item icon="ri-settings-3-line" label="Theme" active={false} onClick={onToggleTheme} />
      </div>
    </div>
  )
}