import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'

import { createInfoWindowContent } from './mapInfoWindow.ts'
import { preloadGoogleMap, waitForGoogleMaps } from '../utils/googleMapsLoader.ts'

type MarkerConfig = {
  position: [number, number]
  title?: string
  description?: string
  imageUrl?: string
  onDelete?: () => void
  actionType?: 'add' | 'delete'
  onInfoWindowClick?: () => void
}

type GoogleMapProps = {
  apiKey: string
  center?: [number, number]
  zoom?: number
  className?: string
  style?: CSSProperties
  onMapReady?: (map: any) => void
  markers?: MarkerConfig[]
  mapInstanceRef?: MutableRefObject<any | null>
}

const DEFAULT_CENTER: [number, number] = [116.397428, 39.90923]
const buildSharedMapRef = (map: any) => ({
  map,
  setZoomAndCenter: (zoom: number, coord: [number, number]) => {
    if (!map) return
    map.setZoom(zoom)
    map.setCenter({ lng: coord[0], lat: coord[1] })
  },
  setZoom: (zoom: number) => {
    if (!map) return
    map.setZoom(zoom)
  },
})

const GoogleMap = ({
  apiKey,
  center = DEFAULT_CENTER,
  zoom = 12,
  className,
  style,
  onMapReady,
  markers,
  mapInstanceRef,
}: GoogleMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMapInitialized, setIsMapInitialized] = useState(false)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    preloadGoogleMap(apiKey)
      .then(async () => {
        if (!isMounted || !containerRef.current) return
        const maps = await waitForGoogleMaps().catch((loadError) => {
          console.error('等待 Google Maps SDK 超时：', loadError)
          return null
        })
        if (!maps) {
          setError('地图加载失败，请稍后重试。')
          setIsLoading(false)
          return
        }
        const google = window.google
        let MapCtor: any | null = null
        if (typeof maps.importLibrary === 'function') {
          try {
            const module = (await maps.importLibrary('maps')) as { Map?: any }
            MapCtor = module?.Map ?? maps.Map ?? null
          } catch (error) {
            console.warn('加载 maps 模块失败，回退到旧版 Map 构造器。', error)
            MapCtor = maps.Map ?? null
          }
        }
        if (!MapCtor) {
          MapCtor = maps.Map ?? null
        }

        if (!MapCtor) {
          setError('地图加载失败，请稍后重试。')
          setIsLoading(false)
          return
        }

        mapInstance.current = new MapCtor(containerRef.current, {
          center: { lng: center[0], lat: center[1] },
          zoom,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        })

        if (mapInstanceRef && mapInstance.current) {
          mapInstanceRef.current = buildSharedMapRef(mapInstance.current)
        }

        setIsMapInitialized(true)
        setIsLoading(false)
        onMapReady?.(mapInstance.current)
      })
      .catch((loadError) => {
        console.error('加载谷歌地图失败：', loadError)
        if (isMounted) {
          setError('地图加载失败，请稍后重试。')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
      infoWindowsRef.current.forEach((window) => window.close())
      infoWindowsRef.current = []
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
      if (mapInstanceRef) {
        mapInstanceRef.current = null
      }
      mapInstance.current = null
      setIsMapInitialized(false)
    }
  }, [apiKey, onMapReady])

  useEffect(() => {
    if (!isMapInitialized || !mapInstance.current) return
    mapInstance.current.setZoom(zoom)
    if (mapInstanceRef) {
      mapInstanceRef.current = buildSharedMapRef(mapInstance.current)
    }
  }, [zoom, mapInstanceRef, isMapInitialized])

  useEffect(() => {
    if (!isMapInitialized || !mapInstance.current) return
    if (!Array.isArray(center) || center.length !== 2) return
    const [lng, lat] = center
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    mapInstance.current.setCenter({ lng, lat })
    if (mapInstanceRef) {
      mapInstanceRef.current = buildSharedMapRef(mapInstance.current)
    }
  }, [center, mapInstanceRef, isMapInitialized])

  useEffect(() => {
    if (!isMapInitialized || !mapInstance.current) return undefined
    const google = window.google
    if (!google?.maps) return undefined

    infoWindowsRef.current.forEach((window) => window.close())
    infoWindowsRef.current = []
    markersRef.current.forEach((marker) => {
      if (!marker) return
      if (typeof marker.setMap === 'function') {
        marker.setMap(null)
      } else {
        marker.map = null
      }
    })
    markersRef.current = []

    if (!Array.isArray(markers) || markers.length === 0) {
      return undefined
    }

    const createdMarkers: any[] = []
    const createdWindows: any[] = []
    let isActive = true

    const mapSupportsAdvancedMarkers = (() => {
      if (!mapInstance.current) return false
      const map = mapInstance.current
      if (typeof map.get === 'function') {
        const id = map.get('mapId')
        if (typeof id === 'string' && id.trim()) return true
      }
      if (typeof map.mapId === 'string' && map.mapId.trim()) return true
      return false
    })()

    ;(async () => {
      const maps = window.google?.maps
      if (!maps) return

      let MarkerCtor: any | null = null
      let usingAdvancedMarker = false

      if (mapSupportsAdvancedMarkers && typeof maps.importLibrary === 'function') {
        try {
          const module = (await maps.importLibrary('marker')) as {
            AdvancedMarkerElement?: any
          }
          if (module?.AdvancedMarkerElement) {
            MarkerCtor = module.AdvancedMarkerElement
            usingAdvancedMarker = true
          }
        } catch (error) {
          console.warn('加载 AdvancedMarkerElement 失败，回退到传统 Marker。', error)
        }
      }

      if (!MarkerCtor && maps.Marker) {
        MarkerCtor = maps.Marker
        usingAdvancedMarker = false
      }

      if (!MarkerCtor) {
        console.error('未找到可用的 Marker 构造函数。')
        return
      }

      markers.forEach((item) => {
        const [lng, lat] = item.position
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
        if (!mapInstance.current) return

        const marker = new MarkerCtor({
          position: { lng, lat },
          title: item.title,
          map: mapInstance.current,
        })

        const infoWindow = new maps.InfoWindow({
          content: createInfoWindowContent(item),
          pixelOffset: new maps.Size(0, 0),
        })

        createdMarkers.push(marker)
        createdWindows.push(infoWindow)

        infoWindow.open({ anchor: marker, map: mapInstance.current, shouldFocus: false })

        maps.event.addListener(infoWindow, 'domready', () => {
          const content = infoWindow.getContent() as HTMLElement | null
          const container = content?.parentElement?.parentElement
          const closeButton =
            container?.querySelector<HTMLButtonElement>('button[aria-label="Close"]') ??
            container?.querySelector<HTMLButtonElement>('.gm-ui-hover-effect')
          if (closeButton) {
            closeButton.style.display = 'none'
          }
        })

        const clickEvents = usingAdvancedMarker ? ['gmp-click', 'click'] : ['click']
        clickEvents.forEach((eventName) => {
          const handler = () => {
            infoWindowsRef.current.forEach((win) => win.close())
            infoWindow.open({ anchor: marker, map: mapInstance.current, shouldFocus: false })
          }
          if (typeof marker.addListener === 'function') {
            marker.addListener(eventName, handler)
          } else {
            maps.event.addListener(marker, eventName, handler)
          }
        })
      })

      if (!isActive) {
        createdWindows.forEach((window) => window.close())
        createdMarkers.forEach((marker) => {
          if (!marker) return
          if (typeof marker.setMap === 'function') {
            marker.setMap(null)
          } else {
            marker.map = null
          }
        })
        return
      }

      markersRef.current = createdMarkers
      infoWindowsRef.current = createdWindows
    })()

    return () => {
      isActive = false
      infoWindowsRef.current.forEach((window) => window.close())
      infoWindowsRef.current = []
      markersRef.current.forEach((marker) => {
        if (!marker) return
        if (typeof marker.setMap === 'function') {
          marker.setMap(null)
        } else {
          marker.map = null
        }
      })
      markersRef.current = []
    }
  }, [markers, isMapInitialized])

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

export default GoogleMap
