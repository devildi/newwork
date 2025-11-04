import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Paper from '@mui/material/Paper'
import SvgIcon from '@mui/material/SvgIcon'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import EditIcon from '@mui/icons-material/Edit'
import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent, SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import PageSwitcher from '../components/PageSwitcher.tsx'
import { PHOTOS_FALLBACK_PAGE_SIZE } from '../constants/app.ts'

type PhotoRecord = {
  _id: string
  tags: string
  picURL: string
  des: string
  width: number
  height: number
}

type PhotosResponse = {
  items?: PhotoRecord[]
  total?: number
  totalPages?: number
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const Photos = () => {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<PhotoRecord | null>(null)
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
  const [deleteFeedback, setDeleteFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const controller = new AbortController()

    const fetchPhotos = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/trip/getPhotos?page=${currentPage}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data: PhotosResponse = await response.json()

        const items = Array.isArray(data.items) ? data.items : []
        setPhotos(items)

        const total = (() => {
          if (typeof data.totalPages === 'number') return data.totalPages
          if (typeof data.total === 'number') return data.total
          return null
        })()

        if (total !== null && Number.isFinite(total) && total > 0) {
          const pageSize = items.length || PHOTOS_FALLBACK_PAGE_SIZE
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
        console.error('获取照片失败：', error)
        setErrorMessage('加载照片失败，请稍后重试。')
        setPhotos([])
        setTotalPages(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPhotos()

    return () => controller.abort()
  }, [currentPage])

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) =>
      totalPages ? Math.min(totalPages, prev + 1) : prev + 1,
    )
  }

  const hasPhotos = useMemo(() => photos.length > 0, [photos])
  const disablePrev = currentPage <= 1 || isLoading || !!errorMessage
  const disableNext =
    isLoading ||
    !!errorMessage ||
    (totalPages !== null ? currentPage >= totalPages : !hasPhotos)

  const handleImgError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src =
      'https://via.placeholder.com/300x200?text=Image+Not+Available'
  }

  const handleCardClick = (photo: PhotoRecord) => {
    setPreviewPhoto(photo)
  }

  const handleClosePreview = () => {
    setPreviewPhoto(null)
  }

  const handleDeletePhoto = async () => {
    if (!previewPhoto || isDeletingPhoto) return
    const targetId = previewPhoto._id
    setIsDeletingPhoto(true)

    try {
      const response = await fetch('/api/trip/deletePhoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId }),
      })

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      await response.json()

      setPhotos((prev) => prev.filter((photo) => photo._id !== targetId))
      setPreviewPhoto(null)
      setDeleteFeedback({
        open: true,
        message: '删除成功。',
        severity: 'success',
      })
    } catch (error) {
      console.error('删除照片失败：', error)
      setDeleteFeedback({
        open: true,
        message: '删除失败，请稍后重试。',
        severity: 'error',
      })
    } finally {
      setIsDeletingPhoto(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f4f6fb',
        display: 'flex',
        flexDirection: 'column',
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
            全部照片
          </Typography>
          <Box sx={{ width: 40, height: 40 }} aria-hidden />
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 2, sm: 3, lg: 6 }, py: { xs: 3, md: 4 }, flexGrow: 1 }}>
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
        ) : hasPhotos ? (
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, sm: 3, lg: 4 },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                lg: 'repeat(6, minmax(0, 1fr))',
                xl: 'repeat(8, minmax(0, 1fr))',
              },
            }}
          >
            {photos.map((photo) => (
              <Paper
                key={photo._id}
                elevation={1}
                onClick={() => handleCardClick(photo)}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                  },
                }}
              >
                <IconButton
                  size="small"
                  aria-label="编辑照片"
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation()
                    navigate('/photosInput', { state: { photo } })
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(107, 114, 128, 0.85)',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: 'rgba(107, 114, 128, 1)',
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <Box
                  component="img"
                  src={photo.picURL}
                  alt={photo.des || photo.tags || '照片'}
                  onError={handleImgError}
                  sx={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    objectFit: 'cover',
                    backgroundColor: '#edf2f7',
                  }}
                />
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: 'rgba(15, 23, 42, 0.8)' }}
                  >
                    {photo.tags || '未分类'}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <Alert severity="info">当前没有可展示的照片。</Alert>
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
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        aria-labelledby="photo-preview-title"
        PaperProps={{
          sx: { overflow: 'hidden' },
        }}
      >
        <DialogTitle
          id="photo-preview-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, md: 3 },
          }}
        >
          <Typography variant="h6">
            {previewPhoto?.tags?.trim() || '照片预览'}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeletePhoto}
            disabled={isDeletingPhoto}
          >
            {isDeletingPhoto ? '删除中…' : '删除'}
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
          {previewPhoto ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                px: { xs: 2, md: 3 },
                py: { xs: 2, md: 3 },
              }}
            >
              <Box
                component="img"
                src={previewPhoto.picURL}
                alt={previewPhoto.des || previewPhoto.tags || '照片预览'}
                onError={handleImgError}
                sx={{
                  width: '100%',
                  maxHeight: { xs: '60vh', md: '70vh' },
                  objectFit: 'contain',
                  borderRadius: 2,
                  backgroundColor: '#edf2f7',
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'rgba(15, 23, 42, 0.75)' }}>
                  标签：{previewPhoto.tags?.trim() || '无标签'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(15, 23, 42, 0.75)' }}>
                  描述：{previewPhoto.des?.trim() || '无描述'}
                </Typography>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={deleteFeedback.open}
        autoHideDuration={3000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setDeleteFeedback((prev) => ({ ...prev, open: false }))
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDeleteFeedback((prev) => ({ ...prev, open: false }))}
          severity={deleteFeedback.severity}
          sx={{ width: '100%' }}
        >
          {deleteFeedback.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Photos
