import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import SvgIcon from '@mui/material/SvgIcon'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type TripDetail = unknown

type TripRecord = {
  _id: string
  tripName?: string | null
  country?: string | null
  city?: string | null
  tags?: string | null
  detail?: TripDetail
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const extractFirstPoiImage = (detail: TripDetail): string | null => {
  if (!Array.isArray(detail)) return null
  for (const group of detail) {
    if (!Array.isArray(group)) continue
    for (const item of group) {
      if (item && typeof item === 'object') {
        if ('picURL' in item && typeof item.picURL === 'string' && item.picURL.trim()) {
          return item.picURL.trim()
        }
        if ('pic' in item && typeof item.pic === 'string' && item.pic.trim()) {
          return item.pic.trim()
        }
      }
    }
  }
  return null
}

const buildTripSubtitle = (trip: TripRecord) => {
  const location = [trip.country, trip.city]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' · ')
  const tagLabel =
    typeof trip.tags === 'string' && trip.tags.trim().length > 0
      ? trip.tags.trim()
      : ''

  return [location, tagLabel].filter(Boolean).join(' ｜ ')
}

const MyTrips = () => {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  const fetchTrips = useCallback(
    async (page: number, controller: AbortController) => {
      const isFirstPage = page === 1
      if (isFirstPage) {
        setIsInitialLoading(true)
        setErrorMessage(null)
      } else {
        setIsFetchingMore(true)
        setLoadMoreError(null)
      }

      try {
        const response = await fetch(`/api/trip/getAllTrip?page=${page}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data = await response.json()
        if (Array.isArray(data)) {
          const nextTrips = data.filter(
            (item): item is TripRecord =>
              item !== null && typeof item === 'object' && typeof item._id === 'string',
          )
          if (isFirstPage) {
            setTrips(nextTrips)
            setHasMore(nextTrips.length > 0)
          } else {
            let appendedLength = 0
            setTrips((prev) => {
              const existingIds = new Set(prev.map((item) => item._id))
              const appended = nextTrips.filter((item) => !existingIds.has(item._id))
              appendedLength = appended.length
              return appended.length > 0 ? [...prev, ...appended] : prev
            })
            setHasMore(appendedLength > 0)
          }
        } else {
          if (isFirstPage) {
            setTrips([])
            setErrorMessage('未能获取行程数据。')
          }
          setHasMore(false)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('加载行程数据失败：', error)
        if (page === 1) {
          setErrorMessage('加载行程数据失败，请稍后重试。')
          setTrips([])
        } else {
          setLoadMoreError('加载更多行程失败，请稍后重试。')
        }
        setHasMore(false)
      } finally {
        if (isFirstPage) {
          setIsInitialLoading(false)
        } else {
          setIsFetchingMore(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchTrips(currentPage, controller)
    return () => controller.abort()
  }, [currentPage, fetchTrips])

  const hasTrips = useMemo(() => trips.length > 0, [trips])

  useEffect(() => {
    if (!hasMore) return
    const target = loaderRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && !isFetchingMore && !isInitialLoading) {
          setCurrentPage((prev) => prev + 1)
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, isFetchingMore, isInitialLoading])

  return (
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
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="返回">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
            我的行程
          </Typography>
          <Box sx={{ width: 48, height: 48 }} />
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isInitialLoading ? 'center' : 'flex-start',
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 4 },
          gap: 3,
        }}
      >
        {isInitialLoading ? (
          <CircularProgress size={48} />
        ) : errorMessage ? (
          <Alert severity="error" sx={{ width: '100%', maxWidth: 640 }}>
            {errorMessage}
          </Alert>
        ) : hasTrips ? (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 880 }}>
            {trips.map((trip) => {
              const cover = extractFirstPoiImage(trip.detail)
              const subtitle = buildTripSubtitle(trip)
              return (
                <Box
                  key={trip._id}
                  sx={{
                    position: 'relative',
                    height: 150,
                    width: '100%',
                    borderRadius: 3,
                    overflow: 'hidden',
                    backgroundImage: cover
                      ? `url(${cover})`
                      : 'linear-gradient(135deg, #2563eb 0%, #1e293b 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 18px 32px rgba(15, 23, 42, 0.24)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.65) 100%)',
                    },
                  }}
                  onClick={() => navigate('/show', { state: { trip } })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate('/show', { state: { trip } })
                    }
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      textAlign: 'center',
                      px: 2,
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: 1,
                        textShadow: '0 2px 8px rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      {trip.tripName?.trim() || '未命名行程'}
                    </Typography>
                    {subtitle ? (
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.95,
                          textShadow: '0 1px 6px rgba(15, 23, 42, 0.45)',
                        }}
                      >
                        {subtitle}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              )
            })}
          </Stack>
        ) : (
          <Alert severity="info" sx={{ width: '100%', maxWidth: 640 }}>
            暂无行程数据。
          </Alert>
        )}
        <Box
          ref={loaderRef}
          sx={{
            width: '100%',
            maxWidth: 880,
            display: hasTrips && hasMore ? 'flex' : loadMoreError ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            py: 2,
          }}
        >
          {isFetchingMore ? (
            <CircularProgress size={32} />
          ) : loadMoreError ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {loadMoreError}
            </Alert>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

export default MyTrips
