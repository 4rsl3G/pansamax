import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../lib/api"
import HlsVideo from "./HlsVideo"
import QualitySheet from "./QualitySheet"

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

function Spinner() {
  return <div className="pansa-spin" />
}

function MinimalLoading({ show, text }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 grid place-items-center pointer-events-none"
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <div className="text-[13px] ui-muted">{text}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CenterIndicator({ show, mode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50 grid place-items-center pointer-events-none"
        >
          <div className="pansa-center-indicator">
            <i className={`ri-${mode === "pause" ? "pause" : "play"}-fill text-[44px]`} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function OverlayWatch({ open, onClose, video, lang }) {
  const rootRef = useRef(null)
  const playerRef = useRef(null)

  // tap logic
  const lastTapAt = useRef(0)
  const singleTapTimer = useRef(null)

  // hold 2x logic
  const holdTimer = useRef(null)
  const holding = useRef(false)

  // HUD auto-hide
  const hideHudTimer = useRef(null)
  const [hudVisible, setHudVisible] = useState(true)

  // player state
  const [isReady, setIsReady] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [centerIcon, setCenterIcon] = useState(null) // "play" | "pause"
  const [hint, setHint] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [total, setTotal] = useState(video?.episodes || 1)
  const eps = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total])

  const [videoByEp, setVideoByEp] = useState({})
  const [quality, setQuality] = useState("auto")
  const [qOpen, setQOpen] = useState(false)

  const [likedMap, setLikedMap] = useState({})
  const [burst, setBurst] = useState(null)

  const pick = (v, q) => {
    if (!v) return ""
    if (q === "1080") return v.video_1080
    if (q === "720") return v.video_720
    if (q === "480") return v.video_480
    return v.video_720 || v.video_1080 || v.video_480
  }

  const getV = () => playerRef.current?.getVideo?.()

  const scheduleHideHud = (ms = 2200) => {
    if (hideHudTimer.current) clearTimeout(hideHudTimer.current)
    hideHudTimer.current = setTimeout(() => {
      if (!isPlaying) return
      setHudVisible(false)
    }, ms)
  }

  const showHudTemporarily = (ms = 2200) => {
    setHudVisible(true)
    scheduleHideHud(ms)
  }

  const showHint = (text) => {
    setHint(text)
    setTimeout(() => setHint(null), 650)
  }

  const flashCenter = (mode) => {
    setCenterIcon(mode)
    setTimeout(() => setCenterIcon(null), 420)
  }

  // reset saat open / ganti video
  useEffect(() => {
    if (!open || !video?.code) return
    setCurrentIndex(0)
    setTotal(video.episodes || 1)
    setVideoByEp({})
    setQuality("auto")
    setLikedMap({})
    setBurst(null)

    setHudVisible(true)
    setIsReady(false)
    setIsBuffering(false)
    setIsPlaying(false)
    setCenterIcon(null)
    setHint(null)

    if (hideHudTimer.current) clearTimeout(hideHudTimer.current)
  }, [open, video])

  // load current + prefetch next (AJAX)
  useEffect(() => {
    if (!open || !video?.code) return
    const ep = currentIndex + 1
    const next = ep + 1

    const load = async (e) => {
      if (videoByEp[e]) return
      const r = await api.play(video.code, lang, e)
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
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
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
  const goNext = () => goTo(clamp(currentIndex + 1, 0, eps.length - 1))

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

  // Attach listeners to current video element
  useEffect(() => {
    if (!open) return
    const el = getV()
    if (!el) return

    const onWaiting = () => { setIsBuffering(true); showHudTemporarily(1200) }
    const onPlaying = () => { setIsBuffering(false); setIsPlaying(true); setIsReady(true); showHudTemporarily(1600) }
    const onPause = () => { setIsPlaying(false); setHudVisible(true) }
    const onCanPlay = () => { setIsReady(true); setIsBuffering(false) }

    el.addEventListener("waiting", onWaiting)
    el.addEventListener("playing", onPlaying)
    el.addEventListener("pause", onPause)
    el.addEventListener("canplay", onCanPlay)

    return () => {
      el.removeEventListener("waiting", onWaiting)
      el.removeEventListener("playing", onPlaying)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("canplay", onCanPlay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIndex, src])

  // episode/quality change => show loader again
  useEffect(() => {
    if (!open) return
    setIsReady(false)
    setIsBuffering(false)
    setHudVisible(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIndex, quality, src])

  const togglePausePlay = () => {
    const el = getV()
    if (!el) return
    showHudTemporarily(2200)

    if (el.paused) {
      el.play().catch(() => {})
      flashCenter("play")
    } else {
      el.pause()
      flashCenter("pause")
    }
  }

  const setSpeed = (rate) => {
    const el = getV()
    if (!el) return
    el.playbackRate = rate
  }

  // Single tap = pause/play (debounce)
  // Double tap = like
  const onTapUp = (e) => {
    if (holding.current) return

    const now = Date.now()
    const dt = now - lastTapAt.current
    lastTapAt.current = now

    showHudTemporarily(2400)

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

    singleTapTimer.current = setTimeout(() => {
      togglePausePlay()
      singleTapTimer.current = null
    }, 280)
  }

  // Press & hold = 2x
  const onHoldStart = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holding.current = false
    showHudTemporarily(2400)

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

  const onAnyMove = () => showHudTemporarily(2000)

  if (!open || !video) return null

  // ✅ Minimal loading conditions
  const showLoading = !src || !isReady || isBuffering
  const loadingText = !src ? "Fetching…" : (isBuffering ? "Buffering…" : "Preparing…")

  return (
    <div className="fixed inset-0 z-[95] bg-black">
      <div
        ref={rootRef}
        className="h-dvh overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        onPointerMove={onAnyMove}
        onTouchMove={onAnyMove}
      >
        {eps.map((n, idx) => {
          const isActive = idx === currentIndex
          const s = isActive ? src : ""

          return (
            <div
              key={n}
              data-slide="1"
              data-index={idx}
              className="relative h-dvh snap-start bg-black select-none overflow-hidden"
              onPointerDown={isActive ? onHoldStart : undefined}
              onPointerUp={isActive ? (e) => { onHoldEnd(); onTapUp(e) } : undefined}
              onPointerCancel={isActive ? onHoldEnd : undefined}
            >
              {/* Background cover blur */}
              <img
                src={video.cover}
                alt=""
                className="absolute inset-0 h-full w-full object-cover scale-[1.06]"
                draggable={false}
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute inset-0 backdrop-blur-[18px]" />

              {/* Player */}
              <div className="absolute inset-0">
                <HlsVideo
                  ref={isActive ? playerRef : null}
                  src={s}
                  active={isActive}
                  onEnded={() => isActive && goNext()}
                />
              </div>

              {/* ✅ ONLY minimal loading + status */}
              {isActive && <MinimalLoading show={showLoading} text={loadingText} />}

              {/* Center play/pause icon */}
              {isActive && <CenterIndicator show={!!centerIcon} mode={centerIcon} />}

              {/* HUD (auto-hide) */}
              <AnimatePresence>
                {isActive && hudVisible && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 z-60"
                  >
                    {/* top bar */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <button
                        onClick={onClose}
                        className="ui-btn rounded-full px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <i className="ri-close-line" /> Close
                      </button>

                      <button
                        onClick={(ev) => { ev.stopPropagation(); setQOpen(true); showHudTemporarily(2600) }}
                        className="ui-btn rounded-full px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <i className="ri-hd-line" /> {quality === "auto" ? "Auto" : `${quality}p`}
                      </button>
                    </div>

                    {/* right actions */}
                    <div className="absolute right-3 top-[34%] flex flex-col items-center gap-4">
                      <button
                        onClick={(ev)=>{ev.stopPropagation(); toggleLike(); showHudTemporarily(2400)}}
                        className="ui-btn rounded-full w-12 h-12 grid place-items-center"
                      >
                        <i className={`${liked ? "ri-heart-3-fill text-red-400" : "ri-heart-3-line"} text-xl`} />
                      </button>
                      <button className="ui-btn rounded-full w-12 h-12 grid place-items-center">
                        <i className="ri-share-forward-line text-xl" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* hint bubble (2×) */}
              <AnimatePresence>
                {isActive && hint && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ui-panel ui-border rounded-full px-4 py-2 text-sm backdrop-blur"
                  >
                    {hint}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* heart burst */}
              <AnimatePresence>
                {isActive && burst && (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1.2, y: -10 }}
                    exit={{ opacity: 0, scale: 1.7, y: -40 }}
                    transition={{ duration: 0.5 }}
                    style={{ left: burst.x - 22, top: burst.y - 22 }}
                    className="absolute z-[75] pointer-events-none"
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
        onPick={(q) => { setQuality(q); setQOpen(false); showHudTemporarily(2200) }}
      />
    </div>
  )
}