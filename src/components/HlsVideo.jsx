import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

async function decryptTs(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer)
  const header = new TextDecoder().decode(buf.slice(0, 24))
  if (!header.startsWith("shortmax")) return arrayBuffer

  try {
    const keyOffset = parseInt(header.slice(16, 20))
    const dataOffset = parseInt(header.slice(20, 24))
    const key = buf.slice(keyOffset, keyOffset + 16)
    const iv = new TextEncoder().encode("shortmax00000000")
    const encData = buf.slice(1024, dataOffset + 1024)

    const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-CBC", false, ["decrypt"])
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, encData)

    const result = new Uint8Array(decrypted.byteLength + (buf.length - dataOffset - 1024))
    result.set(new Uint8Array(decrypted), 0)
    result.set(buf.slice(dataOffset + 1024), decrypted.byteLength)
    return result.buffer
  } catch (e) {
    console.error("Decryption error:", e)
    return arrayBuffer
  }
}

const HlsVideo = forwardRef(function HlsVideo({ src, active, onEnded }, ref) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    const prevTime = video.currentTime || 0

    const destroy = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const init = async () => {
      destroy()

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src
      } else {
        await new Promise((resolve) => {
          if (window.Hls) return resolve()
          const s = document.createElement("script")
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js"
          s.async = true
          s.onload = resolve
          document.body.appendChild(s)
        })

        if (window.Hls?.isSupported()) {
          class DecryptLoader extends window.Hls.DefaultConfig.loader {
            load(context, config, callbacks) {
              const original = callbacks.onSuccess
              callbacks.onSuccess = async (response, stats, ctx) => {
                if (ctx.frag) {
                  try { response.data = await decryptTs(response.data) } catch {}
                }
                original(response, stats, ctx)
              }
              super.load(context, config, callbacks)
            }
          }

          const hls = new window.Hls({
            loader: DecryptLoader,
            enableWorker: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          })

          hlsRef.current = hls
          hls.loadSource(src)
          hls.attachMedia(video)
        } else {
          video.src = src
        }
      }

      setTimeout(() => {
        try { video.currentTime = prevTime } catch {}
      }, 250)
    }

    init()
    return destroy
  }, [src])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active])

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