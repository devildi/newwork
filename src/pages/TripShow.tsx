import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Snackbar from '@mui/material/Snackbar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import SvgIcon from '@mui/material/SvgIcon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import GaodeMap from '../components/GaodeMap.tsx'
import GoogleMap from '../components/GoogleMap.tsx'

type TripDetailPoint = {
  nameOfScence?: string | null
  des?: string | null
  longitude?: number | string | null
  latitude?: number | string | null
  poiLng?: number | string | null
  poiLat?: number | string | null
  lng?: number | string | null
  lat?: number | string | null
  picURL?: string | null
  pic?: string | null
}

type TripState = {
  _id: string
  tripName?: string | null
  country?: string | null
  city?: string | null
  tags?: string | null
  detail?: unknown
  domestic?: number | null
}

type MapMarker = {
  position: [number, number]
  title?: string
  description?: string
  imageUrl?: string
  onInfoWindowClick?: () => void
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const MenuIcon = () => (
  <SvgIcon>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </SvgIcon>
)

const ExpandMoreIcon = () => (
  <SvgIcon>
    <path d="M12 15.5 6 9.5 7.41 8.09 12 12.67 16.59 8.09 18 9.5z" />
  </SvgIcon>
)

const extractNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const extractCoordFromPoint = (point: TripDetailPoint): [number, number] | null => {
  const pairs: Array<[keyof TripDetailPoint, keyof TripDetailPoint]> = [
    ['longitude', 'latitude'],
    ['poiLng', 'poiLat'],
    ['lng', 'lat'],
  ]
  for (const [lngKey, latKey] of pairs) {
    const lngVal = extractNumber(point[lngKey])
    const latVal = extractNumber(point[latKey])
    if (lngVal !== null && latVal !== null) {
      return [lngVal, latVal]
    }
  }
  return null
}

const normalizeTripDetail = (detail: TripState['detail']) => {
  if (!Array.isArray(detail)) return []
  return detail.map((day) => {
    if (!Array.isArray(day)) return []
    return day.filter(
      (point): point is TripDetailPoint => point && typeof point === 'object' && !Array.isArray(point),
    )
  })
}

const buildTransferLinks = (
  coord: [number, number],
  title: string,
  isDomestic: boolean,
) => {
  const [lng, lat] = coord
  const encodedName = encodeURIComponent(title || '目的地')
  if (isDomestic) {
    const scheme = `amapuri://route/plan/?dlat=${lat}&dlon=${lng}&dname=${encodedName}&dev=0&t=0`
    return { scheme }
  }
  const scheme = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=transit`
  return { scheme }
}

const openTransferApp = (
  coord: [number, number],
  title: string,
  isDomestic: boolean,
  handleUnavailable: () => void,
) => {
  const { scheme } = buildTransferLinks(coord, title, isDomestic)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)

  if (!isMobile) {
    handleUnavailable()
    return
  }
  window.location.href = scheme
}

const resolveMarker = (
  point: TripDetailPoint,
  isDomestic: boolean,
  handleUnavailable: () => void,
): MapMarker | null => {
  const coord = extractCoordFromPoint(point)
  if (!coord) return null
  const title =
    typeof point.nameOfScence === 'string' && point.nameOfScence.trim()
      ? point.nameOfScence.trim()
      : undefined
  const description =
    typeof point.des === 'string' && point.des.trim() ? point.des.trim() : undefined
  const image =
    typeof point.picURL === 'string' && point.picURL.trim()
      ? point.picURL.trim()
      : typeof point.pic === 'string' && point.pic.trim()
        ? point.pic.trim()
        : undefined
  return {
    position: coord,
    title,
    description,
    imageUrl: image,
    onInfoWindowClick: () => openTransferApp(coord, title ?? '目的地', isDomestic, handleUnavailable),
  }
}

const TripShow = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedDay, setExpandedDay] = useState(0)
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null)
  const mapInstanceRef = useRef<any | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  const trip: TripState | undefined = useMemo(() => {
    const state = location.state
    if (state && typeof state === 'object' && 'trip' in state) {
      return (state as { trip?: TripState }).trip
    }
    return undefined
  }, [location.state])

  const normalizedDetail = useMemo(() => normalizeTripDetail(trip?.detail), [trip?.detail])

  const isDomesticTrip = trip?.domestic !== 0

  useEffect(() => {
    if (!trip) {
      setSnackbar({ open: true, message: '未找到行程信息，返回上一页。' })
      return
    }
    const firstDay = normalizedDetail[0]
    if (firstDay && firstDay.length > 0) {
      const marker = resolveMarker(firstDay[0], isDomesticTrip, () =>
        setSnackbar({ open: true, message: '请在手机端使用地图导航功能。' }),
      )
      if (marker) {
        setActiveMarker(marker)
      }
    }
  }, [isDomesticTrip, normalizedDetail, trip])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  const handleDayClick = (dayIndex: number) => () => {
    setExpandedDay(dayIndex)
    const dayPoints = normalizedDetail[dayIndex]
    if (dayPoints && dayPoints.length > 0) {
      const marker = resolveMarker(dayPoints[0], isDomesticTrip, () =>
        setSnackbar({ open: true, message: '请在手机端使用地图导航功能。' }),
      )
      if (marker) {
        setActiveMarker(marker)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoomAndCenter(15, marker.position)
        }
      }
    }
  }

  const handlePoiClick = (point: TripDetailPoint) => () => {
    const marker = resolveMarker(point, isDomesticTrip, () =>
      setSnackbar({ open: true, message: '请在手机端使用地图导航功能。' }),
    )
    if (!marker) {
      setSnackbar({ open: true, message: '该点位缺少坐标信息，无法定位。' })
      return
    }
    setActiveMarker(marker)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoomAndCenter(15, marker.position)
    }
    setDrawerOpen(false)
  }

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev)

  if (!trip) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f4f6fb',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f6fb',
      }}
    >
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="返回">
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600, px: 2 }}
            noWrap
          >
            {trip.tripName?.trim() || '我的行程'}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={handleDrawerToggle} aria-label="展开行程">
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          display: 'flex',
          borderRadius: 0,
          overflow: 'hidden',
          backgroundColor: '#dbeafe',
          position: 'relative',
        }}
      >
        {isDomesticTrip ? (
          <GaodeMap
            key="trip-show-gaode"
            apiKey="fbe59813637de60223e3d22805a2486c"
            center={activeMarker?.position}
            zoom={15}
            markers={activeMarker ? [activeMarker] : []}
            mapInstanceRef={mapInstanceRef}
            style={{ flex: '1 1 auto', width: '100%', minHeight: '100%' }}
            className="trip-show-map"
          />
        ) : (
          <GoogleMap
            key="trip-show-google"
            apiKey="AIzaSyB5LS2bbGE_Iw1e7Dc3_al7glDliILip_c"
            center={activeMarker?.position}
            zoom={15}
            markers={activeMarker ? [activeMarker] : []}
            mapInstanceRef={mapInstanceRef}
            style={{ flex: '1 1 auto', width: '100%', minHeight: '100%' }}
            className="trip-show-map"
          />
        )}
      </Box>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: { width: { xs: 300, sm: 360 } },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#f8fafc',
          }}
        >
          <DialogTitle>行程概览</DialogTitle>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, pb: 2 }}>
            {normalizedDetail.length > 0 ? (
              normalizedDetail.map((dayPoints, dayIndex) => {
                const dayLabel = `第 ${dayIndex + 1} 天`
                const expanded = expandedDay === dayIndex
                return (
                  <Accordion
                    key={dayIndex}
                    expanded={expanded}
                    onChange={(_, isExpanded) => {
                      if (isExpanded) setExpandedDay(dayIndex)
                    }}
                    disableGutters
                    elevation={0}
                    square={false}
                    sx={{
                      mb: 1.5,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`day-${dayIndex}-content`}
                      id={`day-${dayIndex}-header`}
                      onClick={handleDayClick(dayIndex)}
                    >
                      <Typography sx={{ fontWeight: 600 }}>{dayLabel}</Typography>
                      <Typography sx={{ ml: 2, color: '#64748b' }}>
                        {dayPoints.length} 个点位
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {dayPoints.length > 0 ? (
                        <List disablePadding>
                          {dayPoints.map((point, poiIndex) => {
                            const label =
                              (typeof point.nameOfScence === 'string' && point.nameOfScence.trim()) ||
                              `POI ${poiIndex + 1}`
                            return (
                              <ListItem key={`${dayIndex}-${poiIndex}`} disablePadding>
                                <ListItemButton
                                  onClick={handlePoiClick(point)}
                                  sx={{
                                    alignItems: 'flex-start',
                                    py: 1.5,
                                    px: 2,
                                  }}
                                >
                                  <ListItemText
                                    primary={
                                      <Typography sx={{ fontWeight: 600, color: '#1f2937' }}>
                                        {label}
                                      </Typography>
                                    }
                                    secondary={
                                      typeof point.des === 'string' && point.des.trim()
                                        ? point.des.trim()
                                        : undefined
                                    }
                                    secondaryTypographyProps={{ sx: { color: '#64748b', mt: 0.5 } }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            )
                          })}
                        </List>
                      ) : (
                        <Box sx={{ px: 2, py: 2, color: '#94a3b8' }}>当天暂无点位。</Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )
              })
            ) : (
              <Alert severity="info">该行程暂无详细点位数据。</Alert>
            )}
          </Box>
        </Box>
      </Drawer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity="warning"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TripShow
