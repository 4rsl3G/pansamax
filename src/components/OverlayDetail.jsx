import { motion } from "framer-motion"

export default function OverlayDetail({ open, onClose, video, onWatch }) {
  if (!open || !video) return null
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative mx-auto mt-10 max-w-4xl ui-panel ui-border rounded-3xl overflow-hidden"
      >
        <div className="relative">
          <img src={video.cover} alt={video.name} className="w-full h-[280px] object-cover" />
          <div className="absolute inset-0 bg-black/35" />
          <button onClick={onClose} className="absolute top-4 right-4 ui-btn rounded-full w-11 h-11 grid place-items-center">
            <i className="ri-close-line text-xl" />
          </button>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold">{video.name}</div>
              <div className="ui-muted text-sm mt-1">{video.episodes} episodes</div>
            </div>

            <button
              onClick={onWatch}
              className="px-5 py-3 rounded-2xl bg-[color:var(--accent)] text-white font-semibold inline-flex items-center gap-2"
            >
              <i className="ri-play-fill text-xl" /> Watch
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="font-bold mb-2">Summary</div>
          <p className="text-sm ui-muted leading-relaxed">{video.summary}</p>
        </div>
      </motion.div>
    </div>
  )
}