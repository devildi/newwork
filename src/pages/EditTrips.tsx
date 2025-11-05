import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
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
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MapIcon from '@mui/icons-material/Map'
import MenuIcon from '@mui/icons-material/Menu'
import PublicIcon from '@mui/icons-material/Public'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import SearchIcon from '@mui/icons-material/Search'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'
import Menu from '@mui/material/Menu'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import GaodeMap from '../components/GaodeMap.tsx'
import GoogleMap from '../components/GoogleMap.tsx'
import { preloadGoogleMap } from '../utils/googleMapsLoader.ts'
import type { SearchResult } from '../components/GaodeMap.tsx'
import { preloadGaodeMap } from '../utils/amapLoader.ts'
import { useAppSelector } from '../app/hooks.ts'

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
  uid: string
  designer?: string | null
  tripName?: string | null
  country?: string | null
  city?: string | null
  tags?: string | null
  domestic?: number | null
  detail?: unknown
}

const GAODE_MAP_API_KEY = 'fbe59813637de60223e3d22805a2486c'
const GOOGLE_MAP_API_KEY = 'AIzaSyB5LS2bbGE_Iw1e7Dc3_al7glDliILip_c'

const buildSortablePointId = (dayIndex: number, pointIndex: number): string =>
  `day-${dayIndex}-point-${pointIndex}`

const buildDayHeaderId = (dayIndex: number): string => `day-${dayIndex}-header`

const parseSortablePointId = (
  id: UniqueIdentifier,
): { dayIndex: number; pointIndex: number } | null => {
  if (typeof id !== 'string') return null
  const match = /^day-(\d+)-point-(\d+)$/.exec(id)
  if (!match) return null
  return {
    dayIndex: Number.parseInt(match[1], 10),
    pointIndex: Number.parseInt(match[2], 10),
  }
}

const parseDayHeaderId = (id: UniqueIdentifier): { dayIndex: number } | null => {
  if (typeof id !== 'string') return null
  const match = /^day-(\d+)-header$/.exec(id)
  if (!match) return null
  return { dayIndex: Number.parseInt(match[1], 10) }
}

type SortablePointItemProps = {
  id: string
  dayIndex: number
  pointIndex: number
  label: string
  isSelected: boolean
  disableSelection: boolean
  isDraggingSource: boolean
  onSelect: () => void
  onRemove: () => void
}

const SortablePointItem = ({
  id,
  dayIndex,
  pointIndex,
  label,
  isSelected,
  disableSelection,
  isDraggingSource,
  onSelect,
  onRemove,
}: SortablePointItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
    visibility: isDraggingSource ? 'hidden' : undefined,
  } as const

  return (
    <ListItem ref={setNodeRef} disablePadding style={style}>
      <ListItemButton
        {...attributes}
        {...listeners}
        disableRipple
        disableTouchRipple
        sx={{
          pl: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          backgroundColor: isDragging
            ? 'rgba(37, 99, 235, 0.12)'
            : isSelected
              ? 'rgba(37, 99, 235, 0.08)'
              : 'transparent',
          transition: 'background-color 0.2s ease, transform 0.2s ease',
          '&:hover': {
            backgroundColor: isDragging
              ? 'rgba(37, 99, 235, 0.16)'
              : 'rgba(148, 163, 184, 0.12)',
          },
          '&:active': {
            backgroundColor: isDragging
              ? 'rgba(37, 99, 235, 0.16)'
              : 'rgba(148, 163, 184, 0.16)',
          },
          '&.Mui-focusVisible': {
            backgroundColor: isDragging
              ? 'rgba(37, 99, 235, 0.16)'
              : isSelected
                ? 'rgba(37, 99, 235, 0.12)'
                : 'rgba(148, 163, 184, 0.12)',
          },
        }}
        selected={isSelected}
        onClick={(event) => {
          if (disableSelection || isDragging) {
            event.preventDefault()
            return
          }
          onSelect()
        }}
      >
        <ListItemText primary={label} sx={{ flexGrow: 1 }} />
        <IconButton
          edge="end"
          size="small"
          sx={{ ml: 1 }}
          color="error"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          aria-label={`删除第 ${dayIndex + 1} 天的第 ${pointIndex + 1} 个点位`}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </ListItemButton>
    </ListItem>
  )
}

type DaySectionProps = {
  dayIndex: number
  dayKey: number
  dayPoints: TripDetailPoint[]
  isOpen: boolean
  activeDragId: UniqueIdentifier | null
  selectedPoint: ActivePoint | null
  toggleDay: () => void
  onRemoveDay: () => void
  onSelectPoint: (point: TripDetailPoint, dayIndex: number, pointIndex: number) => () => void
  onRemovePoint: (dayIndex: number, pointIndex: number) => void
  renderPointLabel: (point: TripDetailPoint, index: number) => string
}

const DaySection = ({
  dayIndex,
  dayKey,
  dayPoints,
  isOpen,
  activeDragId,
  selectedPoint,
  toggleDay,
  onRemoveDay,
  onSelectPoint,
  onRemovePoint,
  renderPointLabel,
}: DaySectionProps) => {
  const headerId = buildDayHeaderId(dayIndex)
  const { setNodeRef: setDayHeaderRef, isOver: isDayHeaderOver } = useDroppable({
    id: headerId,
    disabled: isOpen,
  })

  return (
    <Box>
      <ListItemButton
        ref={setDayHeaderRef}
        onClick={toggleDay}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          transition: 'background-color 0.2s ease',
          backgroundColor: isDayHeaderOver ? 'rgba(37, 99, 235, 0.12)' : undefined,
        }}
      >
        <ListItemText primary={`第 ${dayKey} 天`} sx={{ flexGrow: 1 }} />
        <IconButton
          edge="end"
          size="small"
          sx={{ ml: 1 }}
          color="error"
          onClick={(event) => {
            event.stopPropagation()
            onRemoveDay()
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {dayPoints.length > 0 ? (
            <SortableContext
              items={dayPoints.map((_, pointIndex) => buildSortablePointId(dayIndex, pointIndex))}
              strategy={verticalListSortingStrategy}
            >
              {dayPoints.map((point, pointIndex) => {
                const sortableId = buildSortablePointId(dayIndex, pointIndex)
                const isSelected =
                  selectedPoint?.dayIndex === dayIndex && selectedPoint?.pointIndex === pointIndex
                return (
                  <SortablePointItem
                    key={sortableId}
                    id={sortableId}
                    dayIndex={dayIndex}
                    pointIndex={pointIndex}
                    label={renderPointLabel(point, pointIndex)}
                    isSelected={Boolean(isSelected)}
                    disableSelection={Boolean(activeDragId)}
                    isDraggingSource={activeDragId === sortableId}
                    onSelect={onSelectPoint(point, dayIndex, pointIndex)}
                    onRemove={() => onRemovePoint(dayIndex, pointIndex)}
                  />
                )
              })}
            </SortableContext>
          ) : (
            <ListItemButton sx={{ pl: 4, cursor: 'default' }} disableTouchRipple>
              <ListItemText primary="暂无点位" />
            </ListItemButton>
          )}
        </List>
      </Collapse>
    </Box>
  )
}

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
  const userName = useAppSelector((state) => state.auth.userName)
  const navigate = useNavigate()
  const location = useLocation()
  const initialTripFromLocation = useMemo<TripState | undefined>(() => {
    const state = location.state
    if (state && typeof state === 'object' && 'trip' in state) {
      return (state as { trip?: TripState }).trip
    }
    return undefined
  }, [location.state])
  const [trip, setTrip] = useState<TripState | undefined>(initialTripFromLocation)

  useEffect(() => {
    if (initialTripFromLocation) {
      setTrip(() => {
        const next = { ...initialTripFromLocation } as TripState
        if (!('uid' in next) || typeof next.uid !== 'string') {
          next.uid = ''
        }
        if (!next.designer && userName) {
          next.designer = userName
        }
        return next
      })
    }
  }, [initialTripFromLocation, userName])

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
  const [expandedDayKey, setExpandedDayKey] = useState<number | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearchAttempt, setHasSearchAttempt] = useState(false)
  const mapInstanceRef = useRef<any | null>(null)
  const [drawerDetail, setDrawerDetail] = useState<TripDetailPoint[][]>(detailDays)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const [infoDialogFields, setInfoDialogFields] = useState<
    Array<{ name: string; label: string; value: string }>
  >([])
  const [infoDialogSource, setInfoDialogSource] = useState<ActivePoint | null>(null)
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [pendingTripName, setPendingTripName] = useState('')
  const [nameDialogError, setNameDialogError] = useState<string | null>(null)
  const [isFetchingDescription, setIsFetchingDescription] = useState(false)
  const [isFetchingImage, setIsFetchingImage] = useState(false)
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 8,
    },
  })
  const sensors = useSensors(pointerSensor)
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null)
  const [activeDragData, setActiveDragData] = useState<{
    id: string
    dayIndex: number
    pointIndex: number
    point: TripDetailPoint | null
  } | null>(null)
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<HTMLElement | null>(null)
  const preferredMap = useMemo<'gaode' | 'google'>(() => {
    if (trip?.domestic === 0) return 'google'
    if (trip?.domestic === 1) return 'gaode'
    return 'gaode'
  }, [trip?.domestic])
  const [mapProvider, setMapProvider] = useState<'gaode' | 'google' | null>(() =>
    trip ? preferredMap : null,
  )
  const mapSelectionOptions = useMemo(
    () => [
      {
        key: 'gaode' as const,
        label: '高德地图',
        helper: '覆盖全国主要城市与 POI',
        Icon: MapIcon,
      },
      {
        key: 'google' as const,
        label: '谷歌地图',
        helper: '适合国际线路与海外地点',
        Icon: PublicIcon,
      },
    ],
    [],
  )
  const tripMetaParts = useMemo(() => {
    const countryLabel =
      typeof trip?.country === 'string' ? trip.country.trim() : ''
    const cityLabel = typeof trip?.city === 'string' ? trip.city.trim() : ''
    const tagLabel = typeof trip?.tags === 'string' ? trip.tags.trim() : ''
    return [countryLabel, cityLabel, tagLabel].filter(Boolean)
  }, [trip?.city, trip?.country, trip?.tags])

  const createEmptyTrip = useCallback(
    (domesticFlag: 0 | 1): TripState => ({
      uid: '',
      designer: userName ?? '',
      tripName: '',
      country: '',
      city: '',
      tags: '',
      domestic: domesticFlag,
      detail: '',
    }),
    [userName],
  )
  const syncTripDetail = useCallback(
    (detailMatrix: TripDetailPoint[][]) => {
      setTrip((prev) => {
        if (!prev) return prev
        const nextDetail = detailMatrix.length > 0 ? detailMatrix : ''
        if (prev.detail === nextDetail) return prev
        return { ...prev, detail: nextDetail }
      })
    },
    [],
  )
  const handleNameDialogClose = useCallback(() => {
    setIsNameDialogOpen(false)
    setNameDialogError(null)
  }, [])
  const handlePendingTripNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setPendingTripName(event.target.value)
      if (nameDialogError) {
        setNameDialogError(null)
      }
    },
    [nameDialogError],
  )
  const [isSavingTrip, setIsSavingTrip] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    setDrawerDetail(detailDays)
  }, [detailDays])

  useEffect(() => {
    if (trip) {
      setMapProvider((prev) => prev ?? preferredMap)
    } else {
      setMapProvider(null)
    }
  }, [preferredMap, trip])

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
  useEffect(() => {
    if (mapCenter) {
      console.log('[EditTrips] Map center resolved:', mapCenter)
    } else {
      console.warn('[EditTrips] 未找到可用的地图坐标，使用默认中心。')
    }
  }, [mapCenter])

  useEffect(() => {
    if (drawerDetail.length === 0) {
      setExpandedDayKey(null)
      return
    }
    setExpandedDayKey((prev) => {
      if (prev && prev <= drawerDetail.length) {
        return prev
      }
      return 1
    })
  }, [drawerDetail])

  useEffect(() => {
    if (mapProvider) return
    setSearchResults([])
    setIsSearching(false)
    setSearchValue('')
    setHasSearchAttempt(false)
    mapInstanceRef.current = null
    setSearchMenuAnchor(null)
  }, [mapProvider])

  useEffect(() => {
    if (mapProvider === 'gaode') {
      void preloadGaodeMap(GAODE_MAP_API_KEY)
    } else if (mapProvider === 'google') {
      void preloadGoogleMap(GOOGLE_MAP_API_KEY)
    }
  }, [mapProvider])

  useEffect(() => {
    if (!isSmallScreen) {
      setSearchMenuAnchor(null)
    }
  }, [isSmallScreen])

  const toggleDrawer = (open: boolean) => () => {
    if (open && drawerDetail.length === 0) return
    setIsDrawerOpen(open)
  }

  const toggleDay = (dayKey: number) => () => {
    setExpandedDayKey((prev) => (prev === dayKey ? null : dayKey))
  }

  const handleSearch = async () => {
    const keyword = searchValue.trim()
    if (!keyword) {
      setSearchResults([])
      setIsSearching(false)
      setHasSearchAttempt(false)
      return
    }

    if (!mapProvider) {
      console.warn('请先选择要使用的地图服务。')
      setSearchResults([])
      setIsSearching(false)
      setHasSearchAttempt(false)
      return
    }

    setHasSearchAttempt(true)
    setIsSearching(true)
    try {
      setSearchResults([])
      if (mapProvider === 'gaode') {
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
      setHasSearchAttempt(false)
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
  setSearchMenuAnchor(null)
}

  const handleClearSearch = useCallback(() => {
    setSearchResults([])
    setSearchValue('')
    setIsSearching(false)
    setHasSearchAttempt(false)
  }, [])

  const handleAddPointFromSearch = useCallback(
    (point: ActivePoint) => {
      let newIndices: { dayIndex: number; pointIndex: number } | null = null
      let createdPoint: TripDetailPoint | null = null
      let nextExpandedDayKey: number | null = null

      setDrawerDetail((prev) => {
        const next = prev.map((day) => [...day])
        let targetDayIndex =
          expandedDayKey != null && expandedDayKey > 0 ? expandedDayKey - 1 : 0

        if (next.length === 0) {
          next.push([])
          targetDayIndex = 0
        } else if (targetDayIndex >= next.length) {
          targetDayIndex = 0
        }

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

        next[targetDayIndex] = [...next[targetDayIndex], newPoint]

        newIndices = {
          dayIndex: targetDayIndex,
          pointIndex: next[targetDayIndex].length - 1,
        }
        createdPoint = newPoint
        nextExpandedDayKey = targetDayIndex + 1
        syncTripDetail(next)

        return next
      })

      if (nextExpandedDayKey != null) {
        setExpandedDayKey(nextExpandedDayKey)
      }

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
    [expandedDayKey, handleClearSearch, mapZoom, setExpandedDayKey, syncTripDetail],
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
    setIsDrawerOpen(false)
  }

  const handleFetchImageLink = useCallback(async () => {
    if (isFetchingImage) return
    const nameFieldIndex = infoDialogFields.findIndex((field) => field.name === 'nameOfScence')
    const picIndex = infoDialogFields.findIndex((field) => field.name === 'picURL')
    if (nameFieldIndex === -1 || picIndex === -1) {
      console.warn('未找到景点名称或图片链接字段')
      return
    }
    const sceneName = infoDialogFields[nameFieldIndex].value.trim()
    if (!sceneName) {
      console.warn('请先填写景点名称再尝试获取链接')
      return
    }
    setIsFetchingImage(true)
    try {
      const response = await fetch(`/api/trip/getBingImg?point=${encodeURIComponent(sceneName)}`)
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`)
      }
      const rawText = await response.text()
      setInfoDialogFields((prev) =>
        prev.map((field, idx) => (idx === picIndex ? { ...field, value: rawText } : field)),
      )
    } catch (error) {
      console.error('获取链接失败：', error)
    } finally {
      setIsFetchingImage(false)
    }
  }, [infoDialogFields, isFetchingImage])

  const handleFetchSpotDescription = useCallback(async () => {
    if (isFetchingDescription) return
    const nameFieldIndex = infoDialogFields.findIndex((field) => field.name === 'nameOfScence')
    const descriptionIndex = infoDialogFields.findIndex((field) => field.name === 'des')
    if (nameFieldIndex === -1 || descriptionIndex === -1) {
      console.warn('未找到景点名称或描述字段')
      return
    }
    const sceneName = infoDialogFields[nameFieldIndex].value.trim()
    if (!sceneName) {
      console.warn('请先填写景点名称再尝试获取描述')
      return
    }
    setIsFetchingDescription(true)
    try {
      const response = await fetch(`/api/chat/getDes?chat=${encodeURIComponent(sceneName)}`)
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`)
      }
      const rawText = await response.text()
      let descriptionText = rawText
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText)
          if (typeof parsed === 'string') descriptionText = parsed
          else if (parsed && typeof parsed === 'object') {
            descriptionText = parsed.data ?? parsed.des ?? parsed.result ?? rawText
          }
        } catch {
          // 原始文本即可
        }
      }
      setInfoDialogFields((prev) =>
        prev.map((field, idx) =>
          idx === descriptionIndex ? { ...field, value: descriptionText } : field,
        ),
      )
    } catch (error) {
      console.error('获取景点描述失败：', error)
    } finally {
      setIsFetchingDescription(false)
    }
  }, [infoDialogFields, isFetchingDescription])

  const handleRemoveDay = (dayIndex: number) => {
    setDrawerDetail((prev) => {
      const next = prev.filter((_, idx) => idx !== dayIndex)
      syncTripDetail(next)
      return next
    })
    setSelectedPoint(null)
  }

  const performTripSave = useCallback(
    async (normalizedTripName: string): Promise<boolean> => {
      if (!trip || isSavingTrip) return false

      const detailPayload = drawerDetail.length > 0 ? drawerDetail : ''
      const payload = {
        ...trip,
        tripName: normalizedTripName,
        detail: detailPayload,
      }

      console.log('[EditTrips] 当前 trip 对象：', payload)

      setIsSavingTrip(true)
      let success = false
      try {
        const response = await fetch('/api/trip/new', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`请求失败 (${response.status})`)
        }

        const responseText = await response.text()
        let responseBody: unknown = responseText
        if (responseText) {
          try {
            responseBody = JSON.parse(responseText)
          } catch {
            responseBody = responseText
          }
        }

        console.log('行程保存成功，返回数据：', responseBody)
        setSaveFeedback({ open: true, message: '行程保存成功', severity: 'success' })
        setTrip((prev) =>
          prev ? { ...prev, tripName: normalizedTripName, detail: detailPayload } : prev,
        )
        success = true
      } catch (error) {
        console.error('行程保存失败', error)
        const message =
          error instanceof Error && error.message ? error.message : '行程保存失败'
        setSaveFeedback({ open: true, message, severity: 'error' })
      } finally {
        setIsSavingTrip(false)
      }

      return success
    },
    [drawerDetail, isSavingTrip, setSaveFeedback, setTrip, trip],
  )

  const handleAppBarSave = useCallback(() => {
    if (!trip) {
      console.warn('当前无行程数据，无法保存。')
      return
    }
    if (isSavingTrip) return

    const normalizedTripName =
      typeof trip.tripName === 'string' ? trip.tripName.trim() : ''

    if (normalizedTripName) {
      void performTripSave(normalizedTripName)
      return
    }

    setPendingTripName(typeof trip.tripName === 'string' ? trip.tripName : '')
    setNameDialogError(null)
    setIsNameDialogOpen(true)
  }, [isSavingTrip, performTripSave, trip])
  const handleNameDialogConfirm = useCallback(async () => {
    const trimmedName = pendingTripName.trim()
    if (!trimmedName) {
      setNameDialogError('请先填写行程名称')
      return
    }
    setPendingTripName(trimmedName)
    setTrip((prev) => (prev ? { ...prev, tripName: trimmedName } : prev))
    setNameDialogError(null)
    const result = await performTripSave(trimmedName)
    if (result) {
      setIsNameDialogOpen(false)
    } else {
      setNameDialogError('保存失败，请稍后再试')
    }
  }, [pendingTripName, performTripSave, setTrip])

  const handleAddDay = () => {
    setDrawerDetail((prev) => {
      const next = [...prev, []]
      syncTripDetail(next)
      setExpandedDayKey(next.length)
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
      syncTripDetail(filtered)
      return filtered
    })

    setSelectedPoint(null)
  }, [syncTripDetail])

  const handlePointDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(event.active.id)
      const meta = parseSortablePointId(event.active.id)
      if (!meta) {
        setActiveDragData(null)
        return
      }
      const point =
        drawerDetail[meta.dayIndex] && drawerDetail[meta.dayIndex][meta.pointIndex]
          ? drawerDetail[meta.dayIndex][meta.pointIndex]
          : null
      setActiveDragData({
        id: String(event.active.id),
        dayIndex: meta.dayIndex,
        pointIndex: meta.pointIndex,
        point,
      })
    },
    [drawerDetail],
  )

  const handlePointDragCancel = useCallback(() => {
    window.setTimeout(() => {
      setActiveDragId(null)
      setActiveDragData(null)
    }, 0)
  }, [])

  const handlePointDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      window.setTimeout(() => {
        setActiveDragId(null)
        setActiveDragData(null)
      }, 0)
      if (!over || active.id === over.id) return
      const activeMeta = parseSortablePointId(active.id)
      if (!activeMeta) return

      const headerMeta = parseDayHeaderId(over.id)
      if (headerMeta) {
        const targetDayIndex = headerMeta.dayIndex
        if (targetDayIndex < 0 || targetDayIndex === activeMeta.dayIndex) return
        let movedPoint: TripDetailPoint | null = null
        let targetPointIndex: number | null = null

        setDrawerDetail((prev) => {
          if (
            activeMeta.dayIndex < 0 ||
            activeMeta.dayIndex >= prev.length ||
            targetDayIndex >= prev.length
          ) {
            return prev
          }

          const next = prev.map((day) => [...day])
          const sourceDay = next[activeMeta.dayIndex]
          const targetDay = next[targetDayIndex]
          const [extracted] = sourceDay.splice(activeMeta.pointIndex, 1)
          if (!extracted) return prev
          next[targetDayIndex] = [...targetDay, extracted]
          movedPoint = extracted
          targetPointIndex = next[targetDayIndex].length - 1
          syncTripDetail(next)
          return next
        })

        if (movedPoint != null && targetPointIndex != null) {
          setExpandedDayKey(targetDayIndex + 1)
          const mapped = mapPointFromTripPoint(movedPoint)
          if (mapped && mapInstanceRef.current) {
            mapInstanceRef.current.setZoomAndCenter(mapZoom, mapped.coord)
          }
          setSelectedPoint((prevSelected) => {
            if (mapped) {
              return {
                ...mapped,
                actionType: 'delete',
                dayIndex: headerMeta.dayIndex,
                pointIndex: targetPointIndex!,
                pointData: movedPoint!,
              }
            }
            if (prevSelected && prevSelected.pointData === movedPoint) {
              return {
                ...prevSelected,
                dayIndex: headerMeta.dayIndex,
                pointIndex: targetPointIndex!,
              }
            }
            return prevSelected
          })
        }

        return
      }

      const overMeta = parseSortablePointId(over.id)
      if (!overMeta) return
      if (activeMeta.dayIndex !== overMeta.dayIndex) return
      const targetDayIndex = activeMeta.dayIndex
      let reorderedDay: TripDetailPoint[] | null = null

      setDrawerDetail((prev) => {
        const next = prev.map((day, di) => {
          if (di !== targetDayIndex) return day
          reorderedDay = arrayMove(day, activeMeta.pointIndex, overMeta.pointIndex)
          return reorderedDay
        })

        if (reorderedDay) {
          syncTripDetail(next)
        }

        return next
      })

      if (reorderedDay) {
        setSelectedPoint((prevSelected) => {
          if (!prevSelected) return prevSelected
          if (prevSelected.dayIndex !== targetDayIndex) return prevSelected
          if (!prevSelected.pointData) return prevSelected
          const nextIndex = reorderedDay!.findIndex((item) => item === prevSelected.pointData)
          if (nextIndex === -1 || nextIndex === prevSelected.pointIndex) return prevSelected
          return { ...prevSelected, pointIndex: nextIndex }
        })
      }
    },
    [mapInstanceRef, mapZoom, setExpandedDayKey, setSelectedPoint, syncTripDetail],
  )

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

  const handleSearchMenuOpen = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!mapProvider) return
      setSearchMenuAnchor(event.currentTarget)
    },
    [mapProvider],
  )

  const handleSearchMenuClose = useCallback(() => {
    setSearchMenuAnchor(null)
  }, [])

  const renderSearchField = (autoFocus = false) => (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        value={searchValue}
        onChange={(event) => {
          const nextValue = event.target.value
          setSearchValue(nextValue)
          setHasSearchAttempt(false)
          if (!nextValue.trim()) {
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
        placeholder={mapProvider ? '请输入关键字' : '请先选择地图服务'}
        size="small"
        variant="outlined"
        fullWidth
        disabled={!mapProvider}
        autoFocus={autoFocus}
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
      {isSearching || searchResults.length > 0 || hasSearchAttempt ? (
        <List
          sx={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '100%',
            maxHeight: 240,
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
          ) : searchResults.length > 0 ? (
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
          ) : hasSearchAttempt ? (
            <ListItem sx={{ px: 2, py: 1.5 }}>
              <ListItemText
                primary={mapProvider ? '未找到相关地点，请尝试其他关键字' : '请先选择地图服务再进行搜索'}
                primaryTypographyProps={{ fontSize: 13, color: '#6b7280' }}
              />
            </ListItem>
          ) : null}
        </List>
      ) : null}
    </Box>
  )

  const mapProviderButtonLabel = mapProvider
    ? mapProvider === 'gaode'
      ? '切换谷歌地图'
      : '切换高德地图'
    : '选择地图'
  const mapProviderButtonIcon =
    mapProvider === 'gaode'
      ? <PublicIcon fontSize="small" />
      : mapProvider === 'google'
        ? <MapIcon fontSize="small" />
        : undefined
  const handleMapProviderButtonClick = useCallback(() => {
    if (!mapProvider) return
    const nextProvider = mapProvider === 'gaode' ? 'google' : 'gaode'
    mapInstanceRef.current = null
    setSearchResults([])
    setIsSearching(false)
    const domesticFlag: 0 | 1 = nextProvider === 'gaode' ? 1 : 0
    setTrip((prev) => {
      if (prev) {
        return { ...prev, domestic: domesticFlag }
      }
      return createEmptyTrip(domesticFlag)
    })
    setMapProvider(nextProvider)
  }, [
    createEmptyTrip,
    mapInstanceRef,
    mapProvider,
    setIsSearching,
    setMapProvider,
    setSearchResults,
    setTrip,
  ])
  const mapProviderControl = (
    <Button
      variant="outlined"
      color="inherit"
      size="small"
      startIcon={mapProviderButtonIcon}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        '&.Mui-disabled': {
          borderColor: 'rgba(255, 255, 255, 0.4)',
          color: 'rgba(255, 255, 255, 0.4)',
        },
      }}
      onClick={handleMapProviderButtonClick}
      disabled={!mapProvider}
    >
      {mapProviderButtonLabel}
    </Button>
  )

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
            position: 'relative',
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
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontWeight: 600,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            设计
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {mapProviderControl}
            {isSmallScreen ? (
              <>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleSearchMenuOpen}
                  disabled={!mapProvider}
                  aria-label="打开搜索"
                >
                  <SearchIcon />
                </IconButton>
                <Menu
                  anchorEl={searchMenuAnchor}
                  open={Boolean(searchMenuAnchor)}
                  onClose={handleSearchMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{ sx: { width: 260, p: 1 } }}
                >
                  {renderSearchField(true)}
                </Menu>
              </>
            ) : (
              <Box sx={{ width: 200 }}>{renderSearchField()}</Box>
            )}
            <Button
              variant="text"
              color="inherit"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.5)',
                },
              }}
              disabled={!trip || isSavingTrip}
              onClick={handleAppBarSave}
            >
              {isSavingTrip ? <CircularProgress size={16} color="inherit" /> : '保存'}
            </Button>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            aria-label="展开行程列表"
            onClick={toggleDrawer(true)}
            disabled={drawerDetail.length === 0}
            sx={{
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.4)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
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
              {tripMetaParts.length > 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(15,23,42,0.6)', mt: 0.5 }}>
                  {tripMetaParts.join(' · ')}
                </Typography>
              ) : null}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handlePointDragStart}
                onDragEnd={handlePointDragEnd}
                onDragCancel={handlePointDragCancel}
              >
                <List disablePadding>
                  {drawerDetail.map((dayPoints, dayIndex) => {
                    const dayKey = dayIndex + 1
                    const isOpen = expandedDayKey === dayKey
                    return (
                      <DaySection
                        key={dayKey}
                        dayIndex={dayIndex}
                        dayKey={dayKey}
                        dayPoints={dayPoints}
                        isOpen={Boolean(isOpen)}
                        activeDragId={activeDragId}
                        selectedPoint={selectedPoint}
                        toggleDay={toggleDay(dayKey)}
                        onRemoveDay={() => handleRemoveDay(dayIndex)}
                        onSelectPoint={handlePointSelect}
                        onRemovePoint={handleRemovePoint}
                        renderPointLabel={renderPointLabel}
                      />
                    )
                  })}
                </List>
                <DragOverlay dropAnimation={null}>
                  {activeDragData ? (
                    <Paper
                      elevation={8}
                      sx={{
                        px: 2.5,
                        py: 1,
                        borderRadius: 1.5,
                        backgroundColor: 'rgba(37, 99, 235, 0.92)',
                        color: '#ffffff',
                        minWidth: 180,
                        maxWidth: 260,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {activeDragData.point
                          ? renderPointLabel(activeDragData.point, activeDragData.pointIndex)
                          : `POI ${activeDragData.pointIndex + 1}`}
                      </Typography>
                    </Paper>
                  ) : null}
                </DragOverlay>
              </DndContext>
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
            position: 'relative',
          }}
        >
          {mapProvider ? (
            mapProvider === 'gaode' ? (
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
            )
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                p: { xs: 3, sm: 4 },
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                请选择要使用的地图服务
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                alignItems="stretch"
                justifyContent="center"
              >
                {mapSelectionOptions.map(({ key, label, helper, Icon }) => {
                  const isPreferred = preferredMap === key
                  return (
                    <ButtonBase
                      key={key}
                      onClick={() => {
                        const domesticFlag: 0 | 1 = key === 'gaode' ? 1 : 0
                        setTrip((prev) => {
                          if (prev) {
                            return { ...prev, domestic: domesticFlag }
                          }
                          return createEmptyTrip(domesticFlag)
                        })
                        setMapProvider(key)
                      }}
                      sx={{
                        borderRadius: 3,
                        display: 'flex',
                      }}
                    >
                      <Paper
                        elevation={isPreferred ? 8 : 4}
                        sx={{
                          width: { xs: 240, sm: 260 },
                          height: { xs: 200, sm: 220 },
                          px: 4,
                          py: 3,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          borderRadius: 3,
                          border: '2px solid',
                          borderColor: isPreferred ? 'primary.main' : 'transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                          },
                        }}
                      >
                        <Icon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {helper}
                        </Typography>
                      </Paper>
                    </ButtonBase>
                  )
                })}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
      <Dialog open={isNameDialogOpen} onClose={handleNameDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>完善行程信息</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              placeholder="为你的旅程写个名字"
              value={pendingTripName}
              onChange={handlePendingTripNameChange}
              disabled={isSavingTrip}
              error={Boolean(nameDialogError)}
              helperText={nameDialogError ?? ' '}
            />
            <Box
              sx={{
                borderRadius: 1,
                border: '1px solid rgba(15, 23, 42, 0.1)',
                backgroundColor: '#f8fafc',
                p: 2,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {drawerDetail.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(15,23,42,0.6)' }}>
                  暂无行程点位
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {drawerDetail.map((dayPoints, dayIndex) => (
                    <Box key={dayIndex} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        第 {dayIndex + 1} 天
                      </Typography>
                      {dayPoints.length > 0 ? (
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          {dayPoints.map((point, pointIndex) => (
                            <Chip
                              key={`${dayIndex}-${pointIndex}`}
                              size="small"
                              label={renderPointLabel(point, pointIndex)}
                              sx={{
                                maxWidth: '100%',
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                '& .MuiChip-label': {
                                  color: 'inherit',
                                  fontWeight: 500,
                                },
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'rgba(15,23,42,0.6)' }}>
                          暂无点位
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNameDialogClose} disabled={isSavingTrip}>
            取消
          </Button>
          <Button
            variant="contained"
            sx={{ fontWeight: 600 }}
            onClick={handleNameDialogConfirm}
            disabled={isSavingTrip}
          >
            提交
          </Button>
        </DialogActions>
      </Dialog>
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
              sx={{ whiteSpace: 'nowrap', minWidth: 96, display: 'flex', justifyContent: 'center' }}
              onClick={handleFetchSpotDescription}
              disabled={isFetchingDescription}
            >
              {isFetchingDescription ? (
                <CircularProgress size={14} color="inherit" sx={{ my: 0.5 }} />
              ) : (
                '获取景点描述'
              )}
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ whiteSpace: 'nowrap', minWidth: 96, display: 'flex', justifyContent: 'center' }}
              onClick={handleFetchImageLink}
              disabled={isFetchingImage}
            >
              {isFetchingImage ? (
                <CircularProgress size={14} color="inherit" sx={{ my: 0.5 }} />
              ) : (
                '获取链接'
              )}
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
      <Snackbar
        open={saveFeedback.open}
        autoHideDuration={3000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setSaveFeedback((prev) => ({ ...prev, open: false }))
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSaveFeedback((prev) => ({ ...prev, open: false }))}
          severity={saveFeedback.severity}
          sx={{ width: '100%' }}
        >
          {saveFeedback.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default EditTrips
