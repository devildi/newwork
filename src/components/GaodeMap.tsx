import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import { createInfoWindowContent } from './mapInfoWindow.ts'
import { ensureGaodeStylesheet, preloadGaodeMap } from '../utils/amapLoader.ts'

declare global {
  interface Window {
    AMap?: any
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
  const onMapReadyRef = useRef(onMapReady)

  useEffect(() => {
    onMapReadyRef.current = onMapReady
  }, [onMapReady])

  useEffect(() => {
    let isMounted = true
    ensureGaodeStylesheet()
    setIsLoading(true)

    const loadMap = async () => {
      try {
        const AMap = await preloadGaodeMap(apiKey, securityJsCode)
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
        containerRef.current.style.border = 'none'
        containerRef.current.style.height = '100%'
        if (mapInstanceRef) {
          mapInstanceRef.current = buildSharedMapRef(mapInstance.current)
        }
        const attachScaleControl = () => {
          try {
            if (typeof AMap.plugin === 'function') {
              AMap.plugin('AMap.Scale', () => {
                if (mapInstance.current) {
                  mapInstance.current.addControl(new AMap.Scale())
                }
              })
            } else if (AMap.Scale) {
              mapInstance.current.addControl(new AMap.Scale())
            }
          } catch (controlError) {
            console.warn('添加比例尺控件失败：', controlError)
          }
        }

        attachScaleControl()

        setIsLoading(false)
        setIsMapReady(true)
        onMapReadyRef.current?.(mapInstance.current)

        let hasCompleted = false
        const handleComplete = () => {
          if (!isMounted) return
          hasCompleted = true
          setIsLoading(false)
          setIsMapReady(true)
          onMapReadyRef.current?.(mapInstance.current)
          mapInstance.current?.off?.('complete', handleComplete)
        }

        mapInstance.current?.on?.('complete', handleComplete)

        window.setTimeout(() => {
          if (!isMounted || hasCompleted) return
          setIsLoading(false)
          setIsMapReady(true)
          onMapReadyRef.current?.(mapInstance.current)
        }, 1500)
      } catch (loadError) {
        console.error('加载高德地图失败：', loadError)
        if (isMounted) {
          setError('地图加载失败，请稍后重试。')
          setIsLoading(false)
        }
      }
    }

    void loadMap()

    return () => {
      isMounted = false
      if (mapInstance.current) {
        infoWindowsRef.current.forEach((window) => window.close())
        infoWindowsRef.current = []
        markersRef.current.forEach((marker) => marker.setMap(null))
        markersRef.current = []
        if (typeof mapInstance.current.destroy === 'function') {
          mapInstance.current.destroy()
        }
        mapInstance.current = null
        if (mapInstanceRef) {
          mapInstanceRef.current = null
        }
      }
      setIsMapReady(false)
    }
  }, [apiKey, securityJsCode])

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
