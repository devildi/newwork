declare global {
  interface Window {
    google?: any
  }
}

let loaderPromise: Promise<any> | null = null

const injectGoogleMapsScript = (apiKey: string) =>
  new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="true"]',
    )
    if (existingScript) {
      if (window.google) {
        resolve()
      } else {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', (event) => reject(event))
      }
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps-loader', 'true')
    script.onload = () => resolve()
    script.onerror = (event) => reject(event)
    document.head.appendChild(script)
  })

const preloadGoogleMap = (apiKey: string) => {
  if (!loaderPromise) {
    loaderPromise = injectGoogleMapsScript(apiKey).then(() => window.google)
  }
  return loaderPromise
}

const waitForGoogleMaps = (options?: { attempts?: number; intervalMs?: number }) => {
  const maxAttempts = options?.attempts ?? 60
  const intervalMs = options?.intervalMs ?? 100

  return new Promise<any>((resolve, reject) => {
    let attempts = 0
    const timer = window.setInterval(() => {
      const maps = window.google?.maps
      if (maps) {
        window.clearInterval(timer)
        resolve(maps)
        return
      }
      attempts += 1
      if (attempts >= maxAttempts) {
        window.clearInterval(timer)
        reject(new Error('Google Maps SDK 加载超时'))
      }
    }, intervalMs)
  })
}

export { preloadGoogleMap, waitForGoogleMaps }

