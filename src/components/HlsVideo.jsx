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
// + FIX: responseType arraybuffer utk fragment
// ============================================
class DecryptLoader extends Hls.DefaultConfig.loader {
  load(context, config, callbacks) {
    // ⭐ PENTING: pastikan frag dapat ArrayBuffer
    if (context?.type === "fragment") {
      context.responseType = "arraybuffer"
    }

    const onSuccess = callbacks.onSuccess
    callbacks.onSuccess = async (response, stats, ctx) => {
      if (ctx.frag) {
        try {
          response.data = await decryptTs(response.data)
        } catch (e) {
          console.error("decrypt segment failed:", e)
        }
      }
      onSuccess(response, stats, ctx)
    }
    super.load(context, config, callbacks)
  }
}

// ============================================
// COMPONENT
// ============================================
const HlsVideo = forwardRef(function HlsVideo(
  { src, active, onEnded, onStatus }, // onStatus optional
  ref
) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  // expose to OverlayWatch: playerRef.current.getVideo()
  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
  }))

  const emit = (s) => {
    try { onStatus?.(s) } catch {}
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // helper: reset element (anti blank)
    const resetVideoEl = () => {
      try { video.pause() } catch {}
      video.removeAttribute("src")
      video.load()
    }

    // release HLS instance
    const destroyHls = () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy() } catch {}
        hlsRef.current = null
      }
    }

    // jika slide non-aktif / src kosong: lepaskan resource
    if (!src || !active) {
      emit("idle")
      destroyHls()
      resetVideoEl()
      return
    }

    emit("loading")

    // Cleanup HLS lama & reset
    destroyHls()
    resetVideoEl()

    // iOS autoplay friendliness
    video.muted = true
    video.playsInline = true

    // video event -> status
    const onWaiting = () => emit("buffering")
    const onPlaying = () => emit("playing")
    const onCanPlay = () => emit("ready")
    const onErr = () => emit("error")
    const onStalled = () => emit("buffering")

    video.addEventListener("waiting", onWaiting)
    video.addEventListener("playing", onPlaying)
    video.addEventListener("canplay", onCanPlay)
    video.addEventListener("stalled", onStalled)
    video.addEventListener("error", onErr)

    // Safari native HLS
    // (Kalau stream kamu encrypted, native biasanya tetap tidak cukup.
    // Tapi ini kita biarkan sebagai fallback aman.)
    if (video.canPlayType("application/vnd.apple.mpegurl") && !Hls.isSupported()) {
      video.src = src
      video.play().catch(() => {})
      return () => {
        video.removeEventListener("waiting", onWaiting)
        video.removeEventListener("playing", onPlaying)
        video.removeEventListener("canplay", onCanPlay)
        video.removeEventListener("stalled", onStalled)
        video.removeEventListener("error", onErr)
      }
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
        video.play().catch(() => {
          // autoplay bisa diblokir, biarkan user tap play
          emit("ready")
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data?.fatal) return
        console.error("HLS fatal:", data.type, data.details, data)

        emit("error")

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            try { hls.startLoad() } catch {}
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            try { hls.recoverMediaError() } catch {}
            break
          default:
            try { hls.destroy() } catch {}
            hlsRef.current = null
            break
        }
      })
    } else {
      // fallback
      video.src = src
      video.play().catch(() => {})
    }

    return () => {
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("canplay", onCanPlay)
      video.removeEventListener("stalled", onStalled)
      video.removeEventListener("error", onErr)
      destroyHls()
    }
  }, [src, active]) // ⭐ penting: active ikut

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      playsInline
      controls={false}
      preload="metadata"
      muted
      onEnded={onEnded}
    />
  )
})

export default HlsVideo