import { motion } from "framer-motion"

export default function LanguagePicker({ open, onClose, items, current, onPick }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full md:w-[420px] ui-panel ui-border rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[80vh]"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="font-bold flex items-center gap-2">
            <i className="ri-translate-2" /> Language
          </div>
          <button onClick={onClose} className="ui-btn rounded-full w-10 h-10 grid place-items-center">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-2 overflow-y-auto max-h-[65vh]">
          {items.map((l) => (
            <button
              key={l.code}
              onClick={() => onPick(l.code)}
              className={[
                "w-full text-left px-4 py-3 rounded-2xl mb-2 ui-border",
                current === l.code ? "bg-[color:var(--accent)] text-white border-transparent" : "ui-panel2",
              ].join(" ")}
            >
              <div className="font-semibold">{l.name}</div>
              <div className="text-xs opacity-80">{l.localName}</div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}