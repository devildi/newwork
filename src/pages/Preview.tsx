import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import SvgIcon from '@mui/material/SvgIcon'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import PageSwitcher from '../components/PageSwitcher.tsx'
import { PREVIEW_PAGE_SIZE } from '../constants/app.ts'

type PreviewImage = {
  url: string
  tripName?: string | null
  nameOfScence?: string | null
  cover?: boolean
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const Preview = () => {
  const navigate = useNavigate()
  const [images, setImages] = useState<PreviewImage[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [isFetchingNewImage, setIsFetchingNewImage] = useState(false)
  const canFetchNewImage = useMemo(() => {
    if (!previewImage) return false
    const point =
      previewImage.nameOfScence?.trim() || previewImage.tripName?.trim() || ''
    return point.length > 0
  }, [previewImage])
  const [isImageUpdating, setIsImageUpdating] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const controller = new AbortController()

    const fetchImages = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(
          'http://localhost:4000/api/trip/previewImgs',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data: unknown = await response.json()
        if (Array.isArray(data)) {
          setImages(
            data.filter((item): item is PreviewImage => {
              return item && typeof item === 'object' && 'url' in item
            }),
          )
          setCurrentPage(1)
        } else {
          setImages([])
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('获取图片预览数据失败：', error)
        setErrorMessage('加载图片预览数据失败，请稍后重试。')
        setImages([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()

    return () => controller.abort()
  }, [])

  const totalPages = useMemo(() => {
    if (!images.length) return 1
    return Math.max(1, Math.ceil(images.length / PREVIEW_PAGE_SIZE))
  }, [images.length])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    setEditUrl(previewImage?.url ?? '')
  }, [previewImage])
  useEffect(() => {
    if (previewImage?.url) {
      setIsImageUpdating(true)
    } else {
      setIsImageUpdating(false)
    }
  }, [previewImage?.url])

  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * PREVIEW_PAGE_SIZE
    return images.slice(start, start + PREVIEW_PAGE_SIZE)
  }, [images, currentPage])

  const pageStartIndex = (currentPage - 1) * PREVIEW_PAGE_SIZE

  const hasImages = pageSlice.length > 0

  const disablePrev = currentPage <= 1 || isLoading || !!errorMessage
  const disableNext =
    isLoading || !!errorMessage || currentPage >= totalPages || !hasImages

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handleImgError = (event: SyntheticEvent<HTMLImageElement>) => {
    setIsImageUpdating(false)
    event.currentTarget.src =
      'https://res.cloudinary.com/dnfhsjz8u/image/upload/v1620372687/u_4168080911_4188088242_fm_15_gp_0_qfgrpg.jpg'
  }
  const handleImageLoad = () => {
    setIsImageUpdating(false)
  }

  const handleCardClick = (image: PreviewImage, index: number) => {
    setPreviewImage(image)
    setSelectedIndex(index)
  }

  const handleClosePreview = () => {
    setPreviewImage(null)
    setSelectedIndex(null)
    setIsImageUpdating(false)
    setIsSavingImage(false)
  }

  const handleSaveUrl = async () => {
    const trimmed = editUrl.trim()
    if (!previewImage || !trimmed || selectedIndex === null) {
      setSaveFeedback({
        open: true,
        message: '请先选择图片并填写有效链接。',
        severity: 'error',
      })
      return
    }
    if (isSavingImage) return

    const payload = {
      url: trimmed,
      nameOfScence: previewImage.nameOfScence ?? '',
      tripName: previewImage.tripName ?? '',
      cover: Boolean(previewImage.cover),
    }

    setIsSavingImage(true)
    try {
      const response = await fetch('http://localhost:4000/api/trip/updatePointImg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      const result: unknown = await response.json()
      const isSuccess =
        !!result &&
        typeof result === 'object' &&
        'success' in result &&
        Boolean((result as { success?: unknown }).success)

      if (!isSuccess) {
        throw new Error('接口返回失败')
      }

      setImages((prev) => {
        if (!prev[selectedIndex]) return prev
        if (prev[selectedIndex].url === trimmed) return prev
        const next = [...prev]
        next[selectedIndex] = { ...next[selectedIndex], url: trimmed }
        return next
      })
      setPreviewImage((prev) => (prev ? { ...prev, url: trimmed } : prev))
      setEditUrl(trimmed)
      setSaveFeedback({
        open: true,
        message: '更新成功。',
        severity: 'success',
      })
      handleClosePreview()
    } catch (error) {
      console.error('更新图片失败：', error)
      setSaveFeedback({
        open: true,
        message: '更新失败，请稍后重试。',
        severity: 'error',
      })
    } finally {
      setIsSavingImage(false)
    }
  }

  const handleFetchNewImage = async () => {
    if (!previewImage || isFetchingNewImage) return
    const point =
      previewImage.nameOfScence?.trim() || previewImage.tripName?.trim() || ''
    if (!point) return
    const extractImageUrl = (source: unknown): string => {
      if (typeof source === 'string') return source.trim()
      if (!source) return ''
      if (Array.isArray(source)) {
        for (const item of source) {
          const candidate = extractImageUrl(item)
          if (candidate) return candidate
        }
        return ''
      }
      if (typeof source === 'object') {
        const record = source as Record<string, unknown>
        const keysToCheck = [
          'url',
          'imageUrl',
          'imgUrl',
          'picURL',
          'picUrl',
          'link',
          'href',
          'image',
          'result',
          'data',
        ]
        for (const key of keysToCheck) {
          if (key in record) {
            const candidate = extractImageUrl(record[key])
            if (candidate) return candidate
          }
        }
      }
      return ''
    }

    try {
      setIsFetchingNewImage(true)
      const params = new URLSearchParams({ point })
      const response = await fetch(
        `http://localhost:4000/api/trip/getBingImg?${params.toString()}`,
        { method: 'GET' },
      )

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      const raw = await response.text()
      let parsed: unknown = raw
      try {
        parsed = JSON.parse(raw)
      } catch {
        // response is plain text; keep original string
      }
      const nextUrl = extractImageUrl(parsed)

      if (!nextUrl) return

      setPreviewImage((prev) => {
        if (!prev || prev.url === nextUrl) return prev
        return { ...prev, url: nextUrl }
      })
      if (selectedIndex !== null) {
        setImages((prev) => {
          if (!prev[selectedIndex]) return prev
          if (prev[selectedIndex].url === nextUrl) return prev
          const next = [...prev]
          next[selectedIndex] = { ...next[selectedIndex], url: nextUrl }
          return next
        })
      }
      setEditUrl(nextUrl)
    } catch (error) {
      console.error('获取新图片失败：', error)
    } finally {
      setIsFetchingNewImage(false)
    }
  }

  const renderGrid = () => {
    if (isLoading) {
      return (
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
      )
    }

    if (errorMessage) {
      return <Alert severity="error">{errorMessage}</Alert>
    }

    if (!hasImages) {
      return <Alert severity="info">当前没有可展示的图片。</Alert>
    }

    return (
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
        {pageSlice.map((image, index) => (
          <Paper
            key={`${image.url}-${index}`}
            elevation={1}
            onClick={() => handleCardClick(image, pageStartIndex + index)}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
              },
            }}
          >
            <Box
              component="img"
              src={image.url}
              alt={image.nameOfScence || image.tripName || '图片'}
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
                px: { xs: 2, md: 4 },
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
                {image.nameOfScence?.trim() ||
                  image.tripName?.trim() ||
                  '未命名地点'}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    )
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
            图片预览
          </Typography>
          <Box sx={{ width: 40, height: 40 }} aria-hidden />
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 2, sm: 3, lg: 6 }, py: { xs: 3, md: 4 }, flexGrow: 1 }}>
        {renderGrid()}
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
        open={Boolean(previewImage)}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        aria-labelledby="preview-dialog-title"
        PaperProps={{ sx: { overflow: 'hidden' } }}
      >
        <DialogTitle
          id="preview-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          <Typography variant="h6">
            {previewImage?.nameOfScence?.trim() ||
              previewImage?.tripName?.trim() ||
              '图片预览'}
          </Typography>
          <IconButton edge="end" aria-label="关闭预览" onClick={handleClosePreview}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {previewImage ? (
            <Box sx={{ width: '100%', maxWidth: '100%' }}>
              <Box
                sx={{
                  px: { xs: 2, md: 4 },
                  py: { xs: 2, md: 3 },
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      maxHeight: { xs: '60vh', md: '70vh' },
                      borderRadius: 2,
                      backgroundColor: '#edf2f7',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src={previewImage.url}
                      alt={
                        previewImage.nameOfScence || previewImage.tripName || '图片预览'
                      }
                      onError={handleImgError}
                      onLoad={handleImageLoad}
                      sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                      }}
                    />
                    {isImageUpdating ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(244, 246, 251, 0.65)',
                          pointerEvents: 'none',
                        }}
                      >
                        <CircularProgress color="primary" />
                      </Box>
                    ) : null}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    alignItems: { xs: 'stretch', sm: 'center' },
                  }}
                >
                  <TextField
                    label="图片链接"
                    fullWidth
                    value={editUrl}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setEditUrl(nextValue)
                      const normalized = nextValue.trim()
                      setPreviewImage((prev) => {
                        if (!prev) return prev
                        const nextUrl =
                          normalized.length > 0 ? normalized : prev.url
                        if (nextUrl === prev.url) return prev
                        return { ...prev, url: nextUrl }
                      })
                      if (selectedIndex !== null && normalized.length > 0) {
                        setImages((prev) => {
                          if (!prev[selectedIndex]) return prev
                          if (prev[selectedIndex].url === normalized) return prev
                          const next = [...prev]
                          next[selectedIndex] = {
                            ...next[selectedIndex],
                            url: normalized,
                          }
                          return next
                        })
                      }
                    }}
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: 40,
                      },
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      '& .MuiButton-root': {
                        height: 40,
                        minWidth: 96,
                        whiteSpace: 'nowrap',
                        px: 2,
                      },
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={handleSaveUrl}
                      disabled={isSavingImage}
                    >
                      {isSavingImage ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        '保存'
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleFetchNewImage}
                      disabled={isFetchingNewImage || !canFetchNewImage}
                    >
                      {isFetchingNewImage ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        '获取新图片'
                      )}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
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
          onClose={() =>
            setSaveFeedback((prev) => ({
              ...prev,
              open: false,
            }))
          }
          severity={saveFeedback.severity}
          sx={{ width: '100%' }}
        >
          {saveFeedback.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Preview
