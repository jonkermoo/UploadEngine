import { spawn } from 'child_process'

export interface FFprobeResult {
  duration_seconds: number | null
  width: number | null
  height: number | null
  fps: number | null
}

export async function inspectFile(ffprobePath: string, filePath: string): Promise<FFprobeResult | null> {
  return new Promise((resolve) => {
    // spawn() with an args array is required — never use exec() with a concatenated string.
    // exec() passes the command to a shell, so a filePath containing spaces or special
    // characters could break the command or allow injection. spawn() passes each argument
    // directly to the process without any shell interpretation.
    const proc = spawn(ffprobePath, [
      '-v', 'quiet',          // suppress log output so stdout is clean JSON only
      '-print_format', 'json',
      '-show_streams',        // include per-stream info (video width, height, fps, codec)
      '-show_format',         // include container info (duration, bitrate)
      filePath
    ])

    // ffprobe writes its output in chunks as it processes the file.
    // We accumulate all chunks into a single string before parsing.
    let output = ''
    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })

    // If the binary doesn't exist or can't be launched, resolve null instead of throwing.
    // The caller treats null as "metadata unavailable" and still saves the asset without it.
    proc.on('error', () => resolve(null))

    proc.on('close', (code) => {
      // A non-zero exit code means ffprobe couldn't read the file (unsupported format, etc.)
      if (code !== 0) { resolve(null); return }
      try {
        const data = JSON.parse(output)

        // Find the first video stream — audio-only files will have no video stream, so
        // videoStream will be undefined and width/height/fps will resolve to null.
        const videoStream = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === 'video')

        // Duration lives on the container format object, not individual streams.
        // parseFloat returns NaN for missing/invalid values; `|| null` converts NaN to null.
        const duration = parseFloat(data.format?.duration ?? '0') || null

        let fps: number | null = null
        if (videoStream?.r_frame_rate) {
          // r_frame_rate is a rational fraction string like "30/1" or "30000/1001" (29.97fps).
          // We split and divide to get the actual decimal FPS value.
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number)
          fps = den > 0 ? Math.round((num / den) * 100) / 100 : null
        }

        resolve({
          duration_seconds: duration,
          width:  videoStream?.width  ?? null,
          height: videoStream?.height ?? null,
          fps,
        })
      } catch {
        // JSON.parse failed — ffprobe output was malformed. Treat as unavailable.
        resolve(null)
      }
    })
  })
}
