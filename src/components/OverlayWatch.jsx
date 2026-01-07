import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../lib/api"
import HlsVideo from "./HlsVideo"
import QualitySheet from "./QualitySheet"

export default function OverlayWatch({ open, onClose, video, lang }) {
  const rootRef = useRef(null)
  const playerRef = useRef(null)

  // tap logic
  const lastTapAt = useRef(0)
  const singleTapTimer = useRef(null)

  // hold 2x logic
  const holdTimer = useRef(null)
  const holding = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [total, setTotal] = useState(video?.episodes || 1)
  const eps = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total])

  const [titleName, setTitleName] = useState(video?.name || "")
  const [videoByEp, setVideoByEp] = useState({})
  const [quality, setQuality] = useState("auto")
  const [qOpen, setQOpen] = useState(false)

  const [likedMap, setLikedMap] = useState({})
  const [burst, setBurst] = useState(null)
  const [hint, setHint] = useState(null) // "Paused" / "2x"

  const pick = (v, q) => {
    if (!v) return ""
    if (q === "1080") return v.video_1080
    if (q === "720") return v.video_720
    if (q === "480") return v.video_480
    return v.video_720 || v.video_1080 || v.video_480
  }

  useEffect(() => {
    if (!open || !video?.code) return
    setCurrentIndex(0)
    setTotal(video.episodes || 1)
    setTitleName(video.name || "")
    setVideoByEp({})
    setQuality("auto")
    setLikedMap({})
    setBurst(null)
    setHint(null)
  }, [open, video])

  // load current + prefetch next (AJAX)
  useEffect(() => {
    if (!open || !video?.code) return
    const ep = currentIndex + 1
    const next = ep + 1

    const load = async (e) => {
      if (videoByEp[e]) return
      const r = await api.play(video.code, lang, e)
      setTitleName(r.data.name)
      setTotal(r.data.total)
      setVideoByEp((m) => ({ ...m, [e]: r.data.video }))
    }

    load(ep).catch(() => {})
    if (next <= total) load(next).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIndex, total, lang])

  // intersection active slide
  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    if (!root) return
    const slides = Array.from(root.querySelectorAll("[data-slide='1']"))
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries.filter((e) => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0]
        if (!best) return
        setCurrentIndex(Number(best.target.dataset.index))
      },
      { root, threshold: [0.6] }
    )
    slides.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [open, eps.length])

  const goTo = (idx) => {
    const el = rootRef.current?.querySelector(`[data-index="${idx}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const goNext = () => goTo(Math.min(currentIndex + 1, eps.length - 1))

  const ep = currentIndex + 1
  const v = videoByEp[ep] || {}
  const src = pick(v, quality) || ""

  const options = [
    { key: "auto", label: "Auto", url: pick(v, "auto") },
    { key: "480", label: "480p", url: v.video_480 },
    { key: "720", label: "720p", url: v.video_720 },
    { key: "1080", label: "1080p", url: v.video_1080 },
  ]

  const liked = !!likedMap[ep]
  const toggleLike = () => setLikedMap((m) => ({ ...m, [ep]: !m[ep] }))

  const showHint = (text) => {
    setHint(text)
    setTimeout(() => setHint(null), 650)
  }

  const togglePausePlay = () => {
    const el = playerRef.current?.getVideo?.()
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
      showHint("Play")
    } else {
      el.pause()
      showHint("Pause")
    }
  }

  const setSpeed = (rate) => {
    const el = playerRef.current?.getVideo?.()
    if (!el) return
    el.playbackRate = rate
  }

  // Single tap = pause/play (with debounce so double tap won't trigger)
  // Double tap = like
  const onTapUp = (e) => {
    if (holding.current) return // kalau sedang hold 2x, jangan proses tap

    const now = Date.now()
    const dt = now - lastTapAt.current
    lastTapAt.current = now

    // double tap
    if (dt < 280) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current)
        singleTapTimer.current = null
      }

      toggleLike()

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX || (e.changedTouches?.[0]?.clientX ?? 0)) - rect.left
      const y = (e.clientY || (e.changedTouches?.[0]?.clientY ?? 0)) - rect.top
      setBurst({ id: now, x, y })
      setTimeout(() => setBurst(null), 520)
      return
    }

    // single tap (delay to ensure not double)
    singleTapTimer.current = setTimeout(() => {
      togglePausePlay()
      singleTapTimer.current = null
    }, 280)
  }

  // Press & hold = 2x (start after 220ms)
  const onHoldStart = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holding.current = false
    holdTimer.current = setTimeout(() => {
      holding.current = true
      setSpeed(2)
      showHint("2×")
    }, 220)
  }
  const onHoldEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (holding.current) {
      holding.current = false
      setSpeed(1)
    }
  }

  if (!open || !video) return null

  return (
    <div className="fixed inset-0 z-[95] bg-black">
      <div ref={rootRef} className="h-dvh overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {eps.map((n, idx) => {
          const vv = videoByEp[n] || {}
          const s = idx === currentIndex ? src : (pick(vv, "auto") || "")

          return (
            <div
              key={n}
              data-slide="1"
              data-index={idx}
              className="relative h-dvh snap-start bg-black select-none"
              onPointerDown={idx === currentIndex ? onHoldStart : undefined}
              onPointerUp={idx === currentIndex ? (e) => { onHoldEnd(); onTapUp(e) } : undefined}
              onPointerCancel={idx === currentIndex ? onHoldEnd : undefined}
            >
              <HlsVideo
                ref={idx === currentIndex ? playerRef : null}
                src={s}
                active={idx === currentIndex}
                onEnded={() => idx === currentIndex && goNext()}
              />

              {/* top bar */}
              {idx === currentIndex && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                  <button onClick={onClose} className="ui-btn rounded-full px-4 py-2 text-sm flex items-center gap-2">
                    <i className="ri-close-line" /> Close
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setQOpen(true) }}
                      className="ui-btn rounded-full px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <i className="ri-hd-line" /> {quality === "auto" ? "Auto" : `${quality}p`}
                    </button>
                  </div>
                </div>
              )}

              {/* right actions */}
              {idx === currentIndex && (
                <div className="absolute right-3 top-1/3 z-20 flex flex-col items-center gap-4">
                  <button
                    onClick={(ev)=>{ev.stopPropagation(); toggleLike()}}
                    className="ui-btn rounded-full w-12 h-12 grid place-items-center"
                  >
                    <i className={`${liked ? "ri-heart-3-fill text-red-400" : "ri-heart-3-line"} text-xl`} />
                  </button>
                  <button className="ui-btn rounded-full w-12 h-12 grid place-items-center">
                    <i className="ri-share-forward-line text-xl" />
                  </button>
                </div>
              )}

              {/* bottom info */}
              {idx === currentIndex && (
                <div className="absolute bottom-10 left-4 right-4 z-20 pointer-events-none">
                  <div className="text-2xl font-extrabold">{titleName || "…"}</div>
                  <div className="ui-muted mt-1">Episode {n}</div>
                  <div className="ui-muted text-xs mt-3">Single tap: pause/play • Hold: 2× • Double tap: like • Swipe up: next</div>
                </div>
              )}

              {/* hint bubble */}
              <AnimatePresence>
                {idx === currentIndex && hint && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ui-panel ui-border rounded-full px-4 py-2 text-sm backdrop-blur"
                  >
                    {hint}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* heart burst */}
              <AnimatePresence>
                {idx === currentIndex && burst && (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1.2, y: -10 }}
                    exit={{ opacity: 0, scale: 1.7, y: -40 }}
                    transition={{ duration: 0.5 }}
                    style={{ left: burst.x - 22, top: burst.y - 22 }}
                    className="absolute z-30 pointer-events-none"
                  >
                    <i className="ri-heart-3-fill text-red-400 text-5xl drop-shadow" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <QualitySheet
        open={qOpen}
        onClose={() => setQOpen(false)}
        current={quality}
        options={options}
        onPick={(q) => { setQuality(q); setQOpen(false) }}
      />
    </div>
  )
}