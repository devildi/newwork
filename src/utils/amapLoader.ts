import AMapLoader from '@amap/amap-jsapi-loader'

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode?: string }
  }
}

const MAP_STYLE_URL = 'https://webapi.amap.com/theme/v1.3/standard.css'

let loaderPromise: Promise<any> | null = null

export const ensureGaodeStylesheet = () => {
  if (document.querySelector<HTMLLinkElement>('link[data-amap-style="true"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = MAP_STYLE_URL
  link.setAttribute('data-amap-style', 'true')
  document.head.appendChild(link)
}

export const preloadGaodeMap = (apiKey: string, securityJsCode?: string) => {
  ensureGaodeStylesheet()

  if (securityJsCode) {
    window._AMapSecurityConfig = {
      ...(window._AMapSecurityConfig || {}),
      securityJsCode,
    }
  }

  if (!loaderPromise) {
    loaderPromise = AMapLoader.load({
      key: apiKey,
      version: '1.4.15',
      plugins: ['AMap.Scale', 'AMap.PlaceSearch', 'AMap.InfoWindow'],
    })
  }

  return loaderPromise
}
