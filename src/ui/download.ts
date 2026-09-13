/** Save text as a local file. Nothing leaves the browser. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilename(base: string, ext: string): string {
  const cleaned = base.replace(/[^A-Za-z0-9一-鿿_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'workspace'
  return `${cleaned}.${ext}`
}

export function readFileAsText(file: File, maxBytes = 50 * 1024 * 1024): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error(`File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`))
  return file.text()
}
