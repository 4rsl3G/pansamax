import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import Hls from "hls.js"

// ============================================
// ASLI: DECRYPT FUNCTION (JANGAN UBAH LOGIKA)
// ============================================
async function decryptTs(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer)
  const header = new TextDecoder().decode(buf.slice(0, 24))
  if (!header.startsWith("shortmax")) return arrayBuffer

  const keyOffset = parseInt(header.slice(16, 20))
  const dataOffset = parseInt(header.slice(20, 24))
  const key = buf.slice(keyOffset, keyOffset + 16)
  const iv = new TextEncoder().encode("shortmax00000000")

  const encData = buf.slice(1024, dataOffset + 1024)
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-CBC", false, ["decrypt"])
  const dec = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, encData)

  const result = new Uint8Array(dec.byteLength + (buf.length - dataOffset - 1024))
  result.set(new Uint8Array(dec), 0)
  result.set(buf.slice(dataOffset + 1024), dec.byteLength)
  return result.buffer
}

// ============================================
// ASLI: CUSTOM HLS LOADER (JANGAN UBAH LOGIKA)
// ============================================
class DecryptLoader extends Hls.DefaultConfig.loader {
  load(context, config, callbacks) {
    const onSuccess = callbacks.onSuccess
    callbacks.onSuccess = async (response, stats, ctx) => {
      if (ctx.frag) response.data = await decryptTs(response.data)
      onSuccess(response, stats, ctx)
    }
    super.load(context, config, callbacks)
  }
}

// ============================================
// COMPONENT
// ============================================
const HlsVideo = forwardRef(function HlsVideo(
  { src, active, onEnded },
  ref
) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  // expose to OverlayWatch: playerRef.current.getVideo()
  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // jika src kosong (slide non-aktif), jangan attach HLS
    if (!src) {
      video.pause()
      video.removeAttribute("src")
      video.load()
      return
    }

    // cleanup HLS lama
    if (hlsRef.current) {
      try { hlsRef.current.destroy() } catch {}
      hlsRef.current = null
    }

    // reset video element (anti blank)
    video.pause()
    video.removeAttribute("src")
    video.load()

    // Safari native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
      if (active) video.play().catch(() => {})
      return
    }

    // HLS.js with decrypt loader
    if (Hls.isSupported()) {
      const hls = new Hls({
        loader: DecryptLoader, // ⭐ aslimu
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })

      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (active) video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data?.fatal) return
        console.error("HLS fatal:", data.type, data.details)

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
            hls.destroy()
            hlsRef.current = null
            break
        }
      })
    } else {
      // fallback
      video.src = src
      if (active) video.play().catch(() => {})
    }

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy() } catch {}
        hlsRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active && src) v.play().catch(() => {})
    else v.pause()
  }, [active, src])

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      playsInline
      controls={false}
      preload="metadata"
      onEnded={onEnded}
    />
  )
})

export default HlsVideo