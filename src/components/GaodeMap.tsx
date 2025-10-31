import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

import { createInfoWindowContent } from './mapInfoWindow.ts'

declare global {
  interface Window {
    AMap?: any
    _AMapSecurityConfig?: { securityJsCode?: string }
  }
}

const DEFAULT_CENTER: [number, number] = [116.397428, 39.90923]

type GaodeMapProps = {
  apiKey: string
  securityJsCode?: string
  center?: [number, number]
  zoom?: number
  className?: string
  style?: CSSProperties
  onMapReady?: (map: any) => void
  markers?: Array<{
    position: [number, number]
    title?: string
    description?: string
    imageUrl?: string
    onDelete?: () => void
    actionType?: 'add' | 'delete'
    onInfoWindowClick?: () => void
  }>
  mapInstanceRef?: MutableRefObject<any | null>
}

const MAP_STYLE_URL = 'https://webapi.amap.com/theme/v1.3/standard.css'
let loaderPromise: Promise<any> | null = null

const ensureMapStylesheet = () => {
  if (document.querySelector<HTMLLinkElement>('link[data-amap-style="true"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = MAP_STYLE_URL
  link.setAttribute('data-amap-style', 'true')
  document.head.appendChild(link)
}

const buildSharedMapRef = (map: any) => ({
  map,
  setZoomAndCenter: (zoom: number, coord: [number, number]) => {
    if (map?.setZoomAndCenter) {
      map.setZoomAndCenter(zoom, coord)
    }
  },
  setZoom: (nextZoom: number) => {
    if (map?.setZoom) {
      map.setZoom(nextZoom)
    }
  },
})

const GaodeMap = ({
  apiKey,
  securityJsCode,
  center = DEFAULT_CENTER,
  zoom = 12,
  className,
  style,
  onMapReady,
  markers,
  mapInstanceRef,
}: GaodeMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    ensureMapStylesheet()
    setIsLoading(true)

    preloadGaodeMap(apiKey, securityJsCode)
      .then((AMap) => {
        if (!isMounted || !containerRef.current) return
        if (!window.AMap) {
          window.AMap = AMap
        }
        mapInstance.current = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom,
          center,
          animateEnable: false,
          showBuildingBlock: false,
        })
        if (mapInstanceRef) {
          mapInstanceRef.current = buildSharedMapRef(mapInstance.current)
        }
        mapInstance.current.addControl(new AMap.Scale())
        mapInstance.current.on('complete', () => {
          setIsLoading(false)
          setIsMapReady(true)
        })
        onMapReady?.(mapInstance.current)
      })
      .catch((loadError) => {
        console.error('加载高德地图失败：', loadError)
        if (isMounted) {
          setError('地图加载失败，请稍后重试。')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
      if (mapInstance.current) {
        infoWindowsRef.current.forEach((window) => window.close())
        infoWindowsRef.current = []
        markersRef.current.forEach((marker) => marker.setMap(null))
        markersRef.current = []
        mapInstance.current.destroy()
        mapInstance.current = null
        if (mapInstanceRef) {
          mapInstanceRef.current = null
        }
      }
      setIsMapReady(false)
    }
  }, [apiKey, securityJsCode, onMapReady])

  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.setZoom(zoom)
  }, [zoom])

  useEffect(() => {
    if (!mapInstance.current) return
    if (!Array.isArray(center) || center.length !== 2) return
    const [lng, lat] = center
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    mapInstance.current.setZoomAndCenter(zoom, center)
  }, [center, zoom])

  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return undefined

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    infoWindowsRef.current.forEach((window) => window.close())
    infoWindowsRef.current = []

    if (!Array.isArray(markers) || markers.length === 0) {
      return undefined
    }

    const map = mapInstance.current

    markersRef.current = markers
      .map((item) => {
        const [lng, lat] = item.position
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
        const marker = new window.AMap.Marker({
          position: [lng, lat],
          title: item.title,
          map: mapInstance.current,
        })
        const content = createInfoWindowContent(item)
        const infoWindow = new window.AMap.InfoWindow({
          isCustom: true,
          content,
          offset: new window.AMap.Pixel(0, -24),
        })
        infoWindowsRef.current.push(infoWindow)
        infoWindow.open(map, marker.getPosition())
        marker.on('click', () => {
          infoWindowsRef.current.forEach((win) => win.close())
          infoWindow.open(map, marker.getPosition())
        })
        return marker
      })
      .filter(Boolean) as any[]

    return () => {
      infoWindowsRef.current.forEach((window) => window.close())
      infoWindowsRef.current = []
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [markers, isMapReady])

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '100%',
      ...style,
    }),
    [style],
  )

  if (error) {
    return (
      <div
        className={className}
        style={{
          ...wrapperStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div className={className} style={wrapperStyle}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      {isLoading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(248, 250, 252, 0.75)',
            color: '#334155',
            fontSize: 14,
            pointerEvents: 'none',
          }}
        >
          地图加载中...
        </div>
      ) : null}
    </div>
  )
}

export default GaodeMap

export const preloadGaodeMap = (apiKey: string, securityJsCode?: string) => {
  ensureMapStylesheet()

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
      plugins: ['AMap.Scale', 'AMap.PlaceSearch'],
    })
  }

  return loaderPromise
}
