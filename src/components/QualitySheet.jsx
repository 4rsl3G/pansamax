import { motion } from "framer-motion"

export default function QualitySheet({ open, onClose, current, options, onPick }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[99]">
      <button className="absolute inset-0 bg-black/55" onClick={onClose} />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute left-0 right-0 bottom-0 mx-auto max-w-lg ui-panel ui-border rounded-t-3xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="font-bold flex items-center gap-2">
            <i className="ri-hd-line" /> Quality
          </div>
          <button onClick={onClose} className="ui-btn rounded-full w-10 h-10 grid place-items-center">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {options.map((it) => (
            <button
              key={it.key}
              disabled={it.key !== "auto" && !it.url}
              onClick={() => onPick(it.key)}
              className={[
                "rounded-2xl p-4 text-left ui-border ui-panel2",
                current === it.key ? "ring-2 ring-white/10" : "",
                it.key !== "auto" && !it.url ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{it.label}</div>
                {current === it.key ? <i className="ri-check-line" /> : null}
              </div>
              <div className="text-xs ui-muted mt-1">
                {it.key === "auto" ? "Prefer 720p" : it.url ? "Available" : "Not available"}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}