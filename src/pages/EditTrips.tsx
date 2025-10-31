import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import SvgIcon from '@mui/material/SvgIcon'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'

import GaodeMap, { preloadGaodeMap } from '../components/GaodeMap.tsx'
import GoogleMap from '../components/GoogleMap.tsx'
import { preloadGoogleMap } from '../utils/googleMapsLoader.ts'
import type { SearchResult } from '../components/GaodeMap.tsx'

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

type TripDetailPoint = {
  nameOfScence?: string | null
  tripName?: string | null
  des?: string | null
  title?: string | null
  poiName?: string | null
  lng?: unknown
  lon?: unknown
  lat?: unknown
  longitude?: unknown
  latitude?: unknown
  poiLng?: unknown
  poiLat?: unknown
  poiLongitude?: unknown
  poiLatitude?: unknown
  x?: unknown
  y?: unknown
  location?: unknown
  loc?: unknown
  coordinate?: unknown
  position?: unknown
  contructor?: string | null
  category?: number
  done?: boolean
  pointOrNot?: boolean
  [key: string]: unknown
}

type MapPoint = {
  coord: [number, number]
  title?: string
  description?: string
  imageUrl?: string
}

type ActivePoint = MapPoint & {
  actionType: 'add' | 'delete'
  dayIndex?: number
  pointIndex?: number
  pointData?: TripDetailPoint
}

type TripState = {
  _id: string
  tripName?: string | null
  country?: string | null
  city?: string | null
  tags?: string | null
  domestic?: number | null
  detail?: unknown
}

const GAODE_MAP_API_KEY = 'fbe59813637de60223e3d22805a2486c'
const GOOGLE_MAP_API_KEY = 'AIzaSyB5LS2bbGE_Iw1e7Dc3_al7glDliILip_c'

const mapPointFromTripPoint = (point: TripDetailPoint): MapPoint | null => {
  const coord = extractCoordinateFromPoint(point)
  if (!coord) return null

  const titleCandidate =
    typeof point.nameOfScence === 'string' && point.nameOfScence.trim()
      ? point.nameOfScence.trim()
      : typeof point.tripName === 'string' && point.tripName.trim()
        ? point.tripName.trim()
        : undefined
  const descriptionCandidate =
    typeof point.des === 'string' && point.des.trim() ? point.des.trim() : undefined

  let imageCandidate: string | undefined
  const picUrlRaw =
    typeof (point as { picURL?: unknown }).picURL === 'string'
      ? (point as { picURL?: string }).picURL!.trim()
      : undefined
  const picRaw =
    typeof (point as { pic?: unknown }).pic === 'string'
      ? (point as { pic?: string }).pic!.trim()
      : undefined
  if (picUrlRaw) imageCandidate = picUrlRaw
  else if (picRaw) imageCandidate = picRaw

  return {
    coord,
    title: titleCandidate,
    description: descriptionCandidate,
    imageUrl: imageCandidate,
  }
}

const extractNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const extractCoordinateFromPoint = (point: TripDetailPoint): [number, number] | null => {
  const coordinateKeyPairs: Array<[string, string]> = [
    ['lng', 'lat'],
    ['lon', 'lat'],
    ['longitude', 'latitude'],
    ['poiLng', 'poiLat'],
    ['poiLongitude', 'poiLatitude'],
    ['x', 'y'],
  ]

  for (const [lngKey, latKey] of coordinateKeyPairs) {
    const lngValue = extractNumber(point[lngKey])
    const latValue = extractNumber(point[latKey])
    if (lngValue !== null && latValue !== null) {
      return [lngValue, latValue]
    }
  }

  const locationCandidate = point.location ?? point.loc ?? point.coordinate ?? point.position
  if (Array.isArray(locationCandidate) && locationCandidate.length >= 2) {
    const lng = extractNumber(locationCandidate[0])
    const lat = extractNumber(locationCandidate[1])
    if (lng !== null && lat !== null) {
      return [lng, lat]
    }
  }

  if (typeof locationCandidate === 'string') {
    const parts = locationCandidate.split(/[,，\s]+/).filter(Boolean)
    if (parts.length >= 2) {
      const lng = extractNumber(parts[0])
      const lat = extractNumber(parts[1])
      if (lng !== null && lat !== null) {
        return [lng, lat]
      }
    }
  }

  return null
}

const buildTripPointFromSearchResult = (result: SearchResult): TripDetailPoint => ({
  nameOfScence: result.name,
  des: result.address ?? '',
  longitude: result.location[0],
  latitude: result.location[1],
  picURL: '',
  category: 0,
  done: false,
  pointOrNot: true,
})

const INFO_FIELD_CONFIG: Array<{ key: keyof TripDetailPoint; label: string }> = [
  { key: 'nameOfScence', label: '景点名称' },
  { key: 'des', label: '描述' },
  { key: 'longitude', label: '经度' },
  { key: 'latitude', label: '纬度' },
  { key: 'category', label: '分类' },
  { key: 'picURL', label: '图片地址' },
]

const EditTrips = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const trip = useMemo(() => {
    const state = location.state
    if (state && typeof state === 'object' && 'trip' in state) {
      return (state as { trip?: TripState }).trip
    }
    return undefined
  }, [location.state])

  const detailDays = useMemo(() => {
    if (!trip || !Array.isArray(trip.detail)) return []
    return trip.detail.map((day) => {
      if (!Array.isArray(day)) return []
      return day.filter(
        (point): point is TripDetailPoint =>
          point !== null && typeof point === 'object' && !Array.isArray(point),
      )
    })
  }, [trip])

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const mapInstanceRef = useRef<any | null>(null)
  const [drawerDetail, setDrawerDetail] = useState<TripDetailPoint[][]>(detailDays)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const [infoDialogFields, setInfoDialogFields] = useState<
    Array<{ name: string; label: string; value: string }>
  >([])
  const [infoDialogSource, setInfoDialogSource] = useState<ActivePoint | null>(null)

  useEffect(() => {
    setDrawerDetail(detailDays)
  }, [detailDays])

  const firstPoi = useMemo<ActivePoint | null>(() => {
    for (let dayIndex = 0; dayIndex < drawerDetail.length; dayIndex += 1) {
      const dayPoints = drawerDetail[dayIndex]
      for (let pointIndex = 0; pointIndex < dayPoints.length; pointIndex += 1) {
        const mapped = mapPointFromTripPoint(dayPoints[pointIndex])
        if (mapped) {
          return {
            ...mapped,
            actionType: 'delete',
            dayIndex,
            pointIndex,
            pointData: dayPoints[pointIndex],
          }
        }
      }
    }
    return null
  }, [drawerDetail])

  const [selectedPoint, setSelectedPoint] = useState<ActivePoint | null>(firstPoi)

  useEffect(() => {
    if (firstPoi) {
      setSelectedPoint((prev) => prev ?? firstPoi)
    } else {
      setSelectedPoint(null)
    }
  }, [firstPoi])

  const mapCenter = useMemo<[number, number] | null>(
    () => selectedPoint?.coord ?? null,
    [selectedPoint],
  )
  const mapZoom = 15
  const isDomesticTrip = trip?.domestic !== 0
  useEffect(() => {
    if (mapCenter) {
      console.log('[EditTrips] Map center resolved:', mapCenter)
    } else {
      console.warn('[EditTrips] 未找到可用的地图坐标，使用默认中心。')
    }
  }, [mapCenter])

  useEffect(() => {
    if (drawerDetail.length > 0) {
      setExpandedDays(() => {
        const next: Record<number, boolean> = {}
        drawerDetail.forEach((_, index) => {
          next[index + 1] = true
        })
        return next
      })
    } else {
      setExpandedDays({})
    }
  }, [drawerDetail])

  const toggleDrawer = (open: boolean) => () => {
    if (open && !trip) return
    setIsDrawerOpen(open)
  }

  const toggleDay = (index: number) => () => {
    setExpandedDays((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleSearch = async () => {
    const keyword = searchValue.trim()
    if (!keyword) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      setSearchResults([])
      if (isDomesticTrip) {
        const AMap = await preloadGaodeMap(GAODE_MAP_API_KEY)
        const placeSearch = new AMap.PlaceSearch({ city: '全国', pageSize: 5 })
        placeSearch.search(keyword, (status: string, result: any) => {
          if (status !== 'complete' || !result?.poiList?.pois) {
            setSearchResults([])
            setIsSearching(false)
            return
          }
          const list: SearchResult[] = result.poiList.pois
            .slice(0, 5)
            .map((poi: any) => {
              const location = poi.location
              let lngLat: [number, number] | null = null
              if (location) {
                if (typeof location.lng === 'number' && typeof location.lat === 'number') {
                  lngLat = [location.lng, location.lat]
                } else if (typeof location === 'string') {
                  const [lng, lat] = location.split(/[,，]/).map(Number)
                  if (Number.isFinite(lng) && Number.isFinite(lat)) {
                    lngLat = [lng, lat]
                  }
                }
              }
              if (!lngLat) return null
              return {
                name: poi.name,
                location: lngLat,
                address: poi.address,
              }
            })
            .filter(Boolean) as SearchResult[]
          setSearchResults(list)
          setIsSearching(false)
        })
      } else {
        const google = await preloadGoogleMap(GOOGLE_MAP_API_KEY)
        if (!google?.maps?.importLibrary) {
          setSearchResults([])
          setIsSearching(false)
          return
        }
        const { PlacesService, PlacesServiceStatus } =
          (await google.maps.importLibrary('places')) as { PlacesService: any; PlacesServiceStatus: any }
        const placesService = new PlacesService(document.createElement('div'))
        const request = { query: keyword }
        placesService.textSearch(request, (results: any, status: string) => {
          if (status !== PlacesServiceStatus.OK || !results) {
            setSearchResults([])
            setIsSearching(false)
            return
          }
          const list: SearchResult[] = results
            .filter((place) => place.geometry?.location)
            .slice(0, 5)
            .map((place) => {
              const location = place.geometry!.location
              return {
                name: place.name ?? '未知地点',
                location: [location.lng(), location.lat()],
                address: place.formatted_address ?? place.vicinity ?? '',
              }
            })
          setSearchResults(list)
          setIsSearching(false)
        })
      }
    } catch (error) {
      console.error('搜索失败：', error)
      setIsSearching(false)
    }
  }

  const handleSearchResultSelect = (result: SearchResult) => {
    const pointData = buildTripPointFromSearchResult(result)
    setSelectedPoint({
      coord: result.location,
      title: result.name,
      description: result.address,
      imageUrl: undefined,
      actionType: 'add',
      pointData,
    })

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoomAndCenter(mapZoom, result.location)
    }
  }

  const handleClearSearch = useCallback(() => {
    setSearchResults([])
    setSearchValue('')
    setIsSearching(false)
  }, [])

  const handleAddPointFromSearch = useCallback(
    (point: ActivePoint) => {
      let newIndices: { dayIndex: number; pointIndex: number } | null = null
      let createdPoint: TripDetailPoint | null = null

      setDrawerDetail((prev) => {
        const next = prev.map((day) => [...day])
      if (next.length === 0) {
        next.push([])
      }

      const lastIndex = next.length - 1
      const newPoint: TripDetailPoint = {
        nameOfScence: point.title || '未命名地点',
        longitude: point.coord[0],
        latitude: point.coord[1],
        des: '',
        picURL: '',
          category: 0,
        done: false,
        pointOrNot: true,
      }

      next[lastIndex] = [...next[lastIndex], newPoint]

      newIndices = { dayIndex: lastIndex, pointIndex: next[lastIndex].length - 1 }
      createdPoint = newPoint

      return next
    })

    if (newIndices && createdPoint) {
      setSelectedPoint({
        ...point,
        actionType: 'delete',
        dayIndex: newIndices.dayIndex,
        pointIndex: newIndices.pointIndex,
        pointData: createdPoint,
      })
    }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setZoomAndCenter(mapZoom, point.coord)
      }

      handleClearSearch()
    },
    [handleClearSearch, mapZoom],
  )

  const resolvePointData = useCallback((point: ActivePoint): TripDetailPoint => {
    if (point.pointData) return point.pointData
    return {
      nameOfScence: point.title ?? '',
      des: point.description ?? '',
      longitude: point.coord[0],
      latitude: point.coord[1],
      category: 0,
      picURL: point.imageUrl ?? '',
    }
  }, [])

  const buildDialogFieldsFromPoint = (point: TripDetailPoint) =>
    INFO_FIELD_CONFIG.map(({ key, label }) => {
      const rawValue = point[key]
      let value = ''
      if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        value = String(rawValue ?? '')
      } else if (rawValue != null) {
        try {
          value = JSON.stringify(rawValue)
        } catch {
          value = String(rawValue)
        }
      }
      return {
        name: String(key),
        label,
        value,
      }
    })

  const handleInfoWindowClick = useCallback((point: ActivePoint) => {
    const data = resolvePointData(point)
    setInfoDialogFields(buildDialogFieldsFromPoint(data))
    setInfoDialogSource(point)
    setIsInfoDialogOpen(true)
  }, [resolvePointData])

  const handleDialogFieldChange =
    (index: number) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value
      setInfoDialogFields((prev) =>
        prev.map((field, idx) => (idx === index ? { ...field, value: nextValue } : field)),
      )
    }

  const handleInfoDialogClose = () => {
    setIsInfoDialogOpen(false)
    setInfoDialogSource(null)
  }

  const handleInfoDialogSave = () => {
    if (!infoDialogSource) {
      handleInfoDialogClose()
      return
    }

    const normalizedFields = infoDialogFields.reduce<Record<string, unknown>>((acc, field) => {
      const trimmedValue = field.value.trim()
      if (field.name === 'longitude' || field.name === 'latitude') {
        const parsed = Number.parseFloat(trimmedValue)
        acc[field.name] = Number.isFinite(parsed) ? parsed : trimmedValue
      } else if (field.name === 'category') {
        const parsed = Number.parseInt(trimmedValue, 10)
        acc[field.name] = Number.isFinite(parsed) ? parsed : trimmedValue
      } else {
        acc[field.name] = trimmedValue
      }
      return acc
    }, {})

    const basePointData: TripDetailPoint =
      infoDialogSource.pointData != null
        ? { ...infoDialogSource.pointData }
        : resolvePointData(infoDialogSource)

    const updatedPointData: TripDetailPoint = {
      ...basePointData,
      ...normalizedFields,
    }

    if (infoDialogSource.dayIndex != null && infoDialogSource.pointIndex != null) {
      setDrawerDetail((prev) =>
        prev.map((day, di) => {
          if (di !== infoDialogSource.dayIndex) return day
          return day.map((point, pi) =>
            pi === infoDialogSource.pointIndex ? { ...point, ...updatedPointData } : point,
          )
        }),
      )
    }

    const mapped = mapPointFromTripPoint(updatedPointData)
    const nextPoint: ActivePoint = {
      ...infoDialogSource,
      coord: mapped?.coord ?? infoDialogSource.coord,
      title: mapped?.title ?? infoDialogSource.title,
      description: mapped?.description ?? infoDialogSource.description,
      imageUrl: mapped?.imageUrl ?? infoDialogSource.imageUrl,
      pointData: updatedPointData,
    }

    setSelectedPoint(nextPoint)
    setInfoDialogSource(nextPoint)
    setInfoDialogFields(buildDialogFieldsFromPoint(updatedPointData))
    handleInfoDialogClose()
  }

  const handleFetchImageLink = () => {
    const index = infoDialogFields.findIndex((field) => field.name === 'picURL')
    if (index === -1) {
      console.warn('未找到图片链接字段')
      return
    }
    const targetField = infoDialogFields[index]
    console.log('获取图片链接：', targetField)
  }

  const handleFetchSpotDescription = () => {
    const index = infoDialogFields.findIndex((field) => field.name === 'des')
    if (index === -1) {
      console.warn('未找到景点描述字段')
      return
    }
    const targetField = infoDialogFields[index]
    console.log('获取景点描述：', targetField)
  }

  const handleRemoveDay = (dayIndex: number) => {
    setDrawerDetail((prev) => prev.filter((_, idx) => idx !== dayIndex))
    setSelectedPoint(null)
  }

  const handleAddDay = () => {
    setDrawerDetail((prev) => {
      const next = [...prev, []]
      setExpandedDays((expanded) => ({ ...expanded, [next.length]: true }))
      return next
    })
    setSelectedPoint(null)
  }

  const handlePointSelect = (point: TripDetailPoint, dayIndex: number, pointIndex: number) => () => {
    const mapped = mapPointFromTripPoint(point)
    if (!mapped) {
      console.warn('无法获取该点位的坐标信息。')
      return
    }
    setSelectedPoint({
      ...mapped,
      actionType: 'delete',
      dayIndex,
      pointIndex,
      pointData: point,
    })
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoomAndCenter(mapZoom, mapped.coord)
    }
    setIsDrawerOpen(false)
  }

  const handleRemovePoint = useCallback((dayIndex?: number, pointIndex?: number) => {
    if (dayIndex == null || pointIndex == null) {
      setSelectedPoint(null)
      return
    }

    setDrawerDetail((prev) => {
      const next = prev.map((day, di) =>
        di === dayIndex ? day.filter((_, idx) => idx !== pointIndex) : [...day],
      )
      const filtered = next.filter((day) => day.length > 0)
      return filtered
    })

    setSelectedPoint(null)
  }, [])

  const mapMarkers = useMemo(() => {
    if (!selectedPoint) return undefined
    return [
      {
        position: selectedPoint.coord,
        title: selectedPoint.title,
        description: selectedPoint.description,
        imageUrl: selectedPoint.imageUrl,
        actionType: selectedPoint.actionType,
        onDelete: () =>
          selectedPoint.actionType === 'add'
            ? handleAddPointFromSearch(selectedPoint)
            : handleRemovePoint(selectedPoint.dayIndex, selectedPoint.pointIndex),
        onInfoWindowClick: () => handleInfoWindowClick(selectedPoint),
      },
    ]
  }, [handleAddPointFromSearch, handleInfoWindowClick, handleRemovePoint, selectedPoint])

  const renderPointLabel = (point: TripDetailPoint, index: number) => {
    if (typeof point.nameOfScence === 'string' && point.nameOfScence.trim()) {
      return point.nameOfScence.trim()
    }
    return `POI ${index + 1}`
  }

  return (
    <>
      <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f6fb',
      }}
    >
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600 }}
          >
            地图数据编辑
          </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ position: 'relative', width: 200 }}>
                <TextField
                  value={searchValue}
                  onChange={(event) => {
                    setSearchValue(event.target.value)
                    if (!event.target.value.trim()) {
                      setSearchResults([])
                      setIsSearching(false)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSearch()
                    }
                  }}
                  placeholder="请输入关键字"
                  size="small"
                  variant="outlined"
                  fullWidth
                  sx={{
                  backgroundColor: '#ffffff',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#4b5563',
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.8)',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#9ca3af',
                  },
                }}
              />
                  {isSearching || searchResults.length > 0 ? (
                    <List
                      sx={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '100%',
                        overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    borderRadius: 1,
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.15)',
                    zIndex: 1200,
                    p: 0,
                  }}
                >
                  {isSearching ? (
                    <ListItem sx={{ px: 2, py: 1.5 }}>
                      <ListItemText
                        primary="搜索中..."
                        primaryTypographyProps={{ fontSize: 13, color: '#6b7280' }}
                      />
                    </ListItem>
                  ) : (
                    <>
                      {searchResults.map((result, index) => (
                        <ListItemButton
                          key={`${result.name}-${index}`}
                          onClick={() => handleSearchResultSelect(result)}
                          sx={{ alignItems: 'flex-start' }}
                        >
                          <ListItemText
                            primary={result.name}
                            secondary={result.address}
                            primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}
                            secondaryTypographyProps={{ fontSize: 12, color: '#6b7280' }}
                          />
                        </ListItemButton>
                      ))}
                      <ListItemButton onClick={handleClearSearch} sx={{ justifyContent: 'center' }}>
                        <ListItemText
                          primary="清除搜索结果"
                          primaryTypographyProps={{ fontSize: 13, color: '#2563eb', textAlign: 'center' }}
                        />
                      </ListItemButton>
                    </>
                  )}
                </List>
              ) : null}
            </Box>
            <Button
              variant="text"
              color="inherit"
              sx={{ textTransform: 'none', fontWeight: 600 }}
              disabled={!trip}
            >
              保存
            </Button>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="展开行程列表"
              onClick={toggleDrawer(true)}
              disabled={!trip}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{ sx: { width: 320, maxWidth: '85vw' } }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#f8fafc',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 2,
              borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {trip?.tripName || '行程详情'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(15,23,42,0.6)', mt: 0.5 }}>
                {trip?.country || '未知国家'} · {trip?.city || '未知城市'}
              </Typography>
            </Box>
            <IconButton
              edge="end"
              size="small"
              color="primary"
              aria-label="添加新的一天"
              onClick={handleAddDay}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {drawerDetail.length > 0 ? (
              <List disablePadding>
                {drawerDetail.map((dayPoints, dayIndex) => {
                  const dayKey = dayIndex + 1
                  const isOpen = expandedDays[dayKey] ?? false
                  return (
                    <Box key={dayKey}>
                      <ListItemButton
                        onClick={toggleDay(dayKey)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <ListItemText primary={`第 ${dayKey} 天`} sx={{ flexGrow: 1 }} />
                        <IconButton
                          edge="end"
                          size="small"
                          sx={{ ml: 1 }}
                          color="error"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveDay(dayIndex)
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        {isOpen ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                          {dayPoints.length > 0 ? (
                            dayPoints.map((point, pointIndex) => (
                              <ListItemButton
                                key={`${dayIndex}-${pointIndex}`}
                                sx={{ pl: 4, display: 'flex', alignItems: 'center', gap: 1 }}
                                onClick={handlePointSelect(point, dayIndex, pointIndex)}
                              >
                                <ListItemText
                                  primary={renderPointLabel(point, pointIndex)}
                                  sx={{ flexGrow: 1 }}
                                />
                                <IconButton
                                  edge="end"
                                  size="small"
                                  sx={{ ml: 1 }}
                                  color="error"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleRemovePoint(dayIndex, pointIndex)
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </ListItemButton>
                            ))
                          ) : (
                            <ListItemButton sx={{ pl: 4, cursor: 'default' }} disableTouchRipple>
                              <ListItemText primary="暂无点位" />
                            </ListItemButton>
                          )}
                        </List>
                      </Collapse>
                    </Box>
                  )
                })}
              </List>
            ) : (
              <Box sx={{ px: 2, py: 3 }}>
                <Alert severity="info">该行程暂无详细点位数据。</Alert>
                <Button
                  sx={{ mt: 2, fontWeight: 600 }}
                  variant="outlined"
                  size="small"
                  onClick={handleAddDay}
                >
                  添加新的一天
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            borderRadius: 0,
            overflow: 'hidden',
            backgroundColor: '#dbeafe',
          }}
        >
          {isDomesticTrip ? (
            <GaodeMap
              apiKey={GAODE_MAP_API_KEY}
              center={mapCenter ?? undefined}
              zoom={mapZoom}
              mapInstanceRef={mapInstanceRef}
              markers={mapMarkers}
              style={{ minHeight: '100%' }}
            />
          ) : (
            <GoogleMap
              apiKey={GOOGLE_MAP_API_KEY}
              center={mapCenter ?? undefined}
              zoom={mapZoom}
              mapInstanceRef={mapInstanceRef}
              markers={mapMarkers}
              style={{ minHeight: '100%' }}
            />
          )}
        </Box>
      </Box>
    </Box>
      <Dialog open={isInfoDialogOpen} onClose={handleInfoDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
            gap: 2,
          }}
        >
          点位详情
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              sx={{ whiteSpace: 'nowrap' }}
              onClick={handleFetchSpotDescription}
            >
              获取景点描述
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ whiteSpace: 'nowrap' }}
              onClick={handleFetchImageLink}
            >
              获取链接
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{ fontWeight: 600 }}
              onClick={handleInfoDialogSave}
            >
              保存修改
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {infoDialogFields.map((field, index) => {
              if (field.name === 'longitude' || field.name === 'latitude') return null
              const isDescriptionField = field.name === 'des'
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  fullWidth
                  margin="dense"
                  value={field.value}
                  onChange={handleDialogFieldChange(index)}
                  multiline={isDescriptionField}
                  minRows={isDescriptionField ? 2 : undefined}
                />
              )
            })}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {infoDialogFields
                .filter((field) => field.name === 'longitude' || field.name === 'latitude')
                .map((field, index) => {
                  const originalIndex = infoDialogFields.findIndex((item) => item.name === field.name)
                  return (
                    <TextField
                      key={field.name}
                      label={field.label}
                      fullWidth
                      margin="dense"
                      value={field.value}
                      onChange={handleDialogFieldChange(originalIndex)}
                    />
                  )
                })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInfoDialogClose}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default EditTrips
