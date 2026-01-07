import { motion } from "framer-motion"

export default function VideoCard({ item, onClick }) {
  return (
    <motion.div onClick={onClick} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="cursor-pointer">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ui-panel ui-border">
        <img src={item.cover} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-2 right-2 text-xs ui-panel ui-border rounded-full px-2 py-1 backdrop-blur">
          <i className="ri-heart-3-fill text-red-400" /> {(item.favorites ?? 0).toLocaleString()}
        </div>
        <div className="absolute bottom-3 left-3">
          <div className="text-xs ui-panel ui-border rounded-full px-2 py-1 backdrop-blur inline-flex items-center gap-2">
            <i className="ri-film-line" /> {item.episodes} eps
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
        <div className="text-xs ui-muted mt-1 truncate">{item.tags?.[0] ? `• ${item.tags[0]}` : ""}</div>
      </div>
    </motion.div>
  )
}