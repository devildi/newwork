import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Snackbar from '@mui/material/Snackbar'
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
  uid?: string
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
  const [confirmingTrip, setConfirmingTrip] = useState<TripRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    severity: 'success' | 'error'
  } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [currentPage, reloadKey])

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

  const handleDeleteClick = (trip: TripRecord) => {
    setConfirmingTrip(trip)
  }

  const handleCloseDialog = () => {
    if (isDeleting) return
    setConfirmingTrip(null)
  }

  const handleConfirmDelete = async () => {
    const targetTrip = confirmingTrip
    if (!targetTrip?.uid) {
      setFeedback({
        message: '无法删除：该行程缺少唯一标识。',
        severity: 'error',
      })
      setConfirmingTrip(null)
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/trip/deleteTrip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetTrip.uid }),
      })

      const rawText = await response.text()
      let payload: unknown = null
      if (rawText) {
        try {
          payload = JSON.parse(rawText)
        } catch {
          payload = rawText
        }
      }

      if (!response.ok) {
        const message =
          typeof payload === 'string' && payload.trim().length > 0
            ? payload
            : `删除失败：${response.status}`
        throw new Error(message)
      }

      if (!payload || typeof payload === 'string') {
        const message =
          typeof payload === 'string' && payload.trim().length > 0
            ? payload
            : '删除失败：服务返回异常数据。'
        throw new Error(message)
      }

      setFeedback({
        message: `已删除${
          targetTrip.tripName ? `「${targetTrip.tripName}」` : '该行程'
        }。`,
        severity: 'success',
      })
      setConfirmingTrip(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '删除失败，请稍后重试。'
      setFeedback({ message, severity: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSnackbarClose = (
    _?: Event | SyntheticEvent,
    reason?: string,
  ) => {
    if (reason === 'clickaway') return
    setFeedback(null)
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
                      position: 'relative',
                      '& .MuiListItemSecondaryAction-root': {
                        top: '16px',
                        right: { xs: '16px', md: '24px' },
                        transform: 'none',
                      },
                    }}
                    secondaryAction={
                      trip._id ? (
                        <IconButton
                          edge="end"
                          color="error"
                          aria-label="删除行程"
                          onClick={() => handleDeleteClick(trip)}
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

      <Dialog open={Boolean(confirmingTrip)} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle>确认删除行程</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning">
            删除后将无法恢复，是否删除
            {confirmingTrip?.tripName ? `「${confirmingTrip.tripName}」` : '该行程'}？
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isDeleting}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '删除中…' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {feedback ? (
          <Alert
            onClose={handleSnackbarClose}
            severity={feedback.severity}
            sx={{ width: '100%' }}
          >
            {feedback.message}
          </Alert>
        ) : null}
      </Snackbar>

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
