import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import SvgIcon from '@mui/material/SvgIcon'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

import PageSwitcher from '../components/PageSwitcher.tsx'
import { ALL_TRIPS_FALLBACK_PAGE_SIZE } from '../constants/app.ts'

type TripRecord = {
  _id: string
  tripName?: string
  country?: string
  city?: string
  tags?: string
  cover?: string
  detail?: unknown
}

type TripResponse = {
  items?: TripRecord[]
  total?: number
  totalPages?: number
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const computeDetailCount = (detail: TripRecord['detail']) => {
  if (!Array.isArray(detail)) return 0
  return detail.reduce((sum, group) => {
    if (Array.isArray(group)) {
      return (
        sum +
        group.reduce((innerSum, item) => {
          if (item && typeof item === 'object') return innerSum + 1
          return innerSum
        }, 0)
      )
    }
    return sum
  }, 0)
}

const extractCoverFromDetail = (detail: TripRecord['detail']) => {
  if (
    Array.isArray(detail) &&
    detail.length > 0 &&
    Array.isArray(detail[0]) &&
    detail[0].length > 0
  ) {
    const firstItem = detail[0][0]
    if (
      firstItem &&
      typeof firstItem === 'object' &&
      'picURL' in firstItem &&
      typeof firstItem.picURL === 'string'
    ) {
      return firstItem.picURL
    }
  }
  return null
}

const computeTripDays = (detail: TripRecord['detail']) => {
  if (!Array.isArray(detail)) return 0
  return detail.length
}

const AllTrips = () => {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchTrips = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/trip/getAllTripByPage?page=${currentPage}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data: TripResponse = await response.json()
        const items = Array.isArray(data.items) ? data.items : []
        setTrips(items)

        const total = (() => {
          if (typeof data.totalPages === 'number') return data.totalPages
          if (typeof data.total === 'number') return data.total
          return null
        })()

        if (total !== null && Number.isFinite(total) && total > 0) {
          const pageSize = items.length || ALL_TRIPS_FALLBACK_PAGE_SIZE
          const resolvedTotal =
            total > pageSize
              ? Math.max(1, Math.ceil(total / pageSize))
              : Math.max(1, Math.ceil(total))
          setTotalPages(resolvedTotal)
          if (currentPage > resolvedTotal) {
            setCurrentPage(resolvedTotal)
          }
        } else {
          setTotalPages(null)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('获取行程列表失败：', error)
        setErrorMessage('加载行程列表失败，请稍后重试。')
        setTrips([])
        setTotalPages(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrips()

    return () => controller.abort()
  }, [currentPage])

  const hasTrips = useMemo(() => trips.length > 0, [trips])
  const disablePrev = currentPage <= 1 || isLoading || !!errorMessage
  const disableNext =
    isLoading ||
    !!errorMessage ||
    (totalPages !== null ? currentPage >= totalPages : !hasTrips)

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) =>
      totalPages ? Math.min(totalPages, prev + 1) : prev + 1,
    )
  }
  const handleTripClick = (trip: TripRecord) => {
    navigate('/edit', { state: { trip } })
  }

  const handleAvatarError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.setAttribute(
      'src',
      'https://via.placeholder.com/96x64?text=No+Image',
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f6fb',
      }}
    >
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            sx={{ fontWeight: 600, flexGrow: 1, textAlign: 'center' }}
          >
            行程列表
          </Typography>
          <Box sx={{ width: 40, height: 40 }} aria-hidden />
        </Toolbar>
      </AppBar>
      <Toolbar />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: { xs: 1, sm: 2, md: 4 },
          py: { xs: 2, md: 3 },
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CircularProgress color="primary" size={48} />
          </Box>
        ) : errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : hasTrips ? (
          <List
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            {trips.map((trip, index) => {
              const tags = trip.tags
                ? trip.tags
                    .split(/[，,|/]/)
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                : []
              const detailCount = computeDetailCount(trip.detail)
              const tripDays = computeTripDays(trip.detail)
              const coverFromDetail = extractCoverFromDetail(trip.detail) || trip.cover

              return (
                <Fragment key={trip._id || index}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: { xs: 2, md: 3 },
                      alignItems: 'flex-start',
                      gap: { xs: 2, md: 3 },
                    }}
                    secondaryAction={
                      trip._id ? (
                        <IconButton
                          edge="end"
                          color="error"
                          aria-label="删除行程"
                          onClick={() => {
                            console.log('[AllTrips] 删除行程 _id:', trip._id)
                          }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      ) : null
                    }
                  >
                    <Box
                      sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexGrow: 1, cursor: 'pointer' }}
                      onClick={() => handleTripClick(trip)}
                    >
                      <ListItemAvatar sx={{ mr: 0 }}>
                        <Avatar
                          src={coverFromDetail || undefined}
                          alt={trip.tripName || '行程封面'}
                          variant="rounded"
                          sx={{
                            width: 96,
                            height: 64,
                            borderRadius: 2,
                            backgroundColor: '#e2e8f0',
                          }}
                          imgProps={{
                            onError: handleAvatarError,
                            referrerPolicy: 'no-referrer',
                          }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {trip.tripName || '未命名行程'}
                          </Typography>
                        }
                        primaryTypographyProps={{ color: 'rgba(15, 23, 42, 0.85)' }}
                        secondary={
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              mt: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ color: 'rgba(15, 23, 42, 0.65)' }}
                              >
                                {`${trip.country || '未知国家'} · ${
                                  trip.city || '未知城市'
                                }`}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'rgba(15, 23, 42, 0.5)' }}
                              >
                                {tripDays > 0 ? `${tripDays} 日行程` : '行程天数未知'}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap',
                              }}
                            >
                              {tags.length > 0 ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: 0.75,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {tags.map((tag) => (
                                    <Chip
                                      key={tag}
                                      label={tag}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              ) : null}
                              <Typography
                                variant="caption"
                                sx={{ color: 'rgba(15, 23, 42, 0.5)' }}
                              >
                                行程点位：{detailCount}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </Box>
                  </ListItem>
                  {index < trips.length - 1 ? (
                    <Divider component="li" sx={{ borderColor: 'rgba(15, 23, 42, 0.08)' }} />
                  ) : null}
                </Fragment>
              )
            })}
          </List>
        ) : (
          <Alert severity="info">当前没有行程数据。</Alert>
        )}
      </Box>

      <PageSwitcher
        sx={{
          mt: 'auto',
          position: 'sticky',
          bottom: 0,
          left: 0,
          width: '100%',
          py: { xs: 2, md: 3 },
          px: { xs: 2, sm: 3, lg: 6 },
          backgroundColor: '#f4f6fb',
          borderTop: '1px solid rgba(15, 23, 42, 0.08)',
          zIndex: 10,
        }}
        onPrev={handlePrev}
        onNext={handleNext}
        disablePrev={disablePrev}
        disableNext={disableNext}
      />
    </Box>
  )
}

export default AllTrips
