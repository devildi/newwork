import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import SvgIcon from '@mui/material/SvgIcon'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

const createEmptyPhotoForm = () => ({
  tags: '',
  url: '',
  description: '',
  width: '',
  height: '',
})

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const PhotosInput = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const prefillPhoto = useMemo(() => {
    const state = location.state
    if (state && typeof state === 'object' && 'photo' in state) {
      return (state as {
        photo?: {
          _id?: string | null
          tags?: string | null
          picURL?: string | null
          des?: string | null
          width?: number | null
          height?: number | null
        }
      }).photo
    }
    return undefined
  }, [location.state])
  const isEditing = Boolean(prefillPhoto)

  const [formValues, setFormValues] = useState(createEmptyPhotoForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })
  const [isFetchingDimensions, setIsFetchingDimensions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const resetForm = useCallback(() => {
    setFormValues(createEmptyPhotoForm())
    setEditingId(null)
  }, [])
  const canFetchDimensions = useMemo(
    () => formValues.url.trim().length > 0,
    [formValues.url],
  )
  const isSubmitDisabled = useMemo(() => {
    const hasBaseInfo =
      formValues.tags.trim().length > 0 && formValues.url.trim().length > 0
    const widthTrimmed = formValues.width.trim()
    const heightTrimmed = formValues.height.trim()
    const widthValue = Number(widthTrimmed)
    const heightValue = Number(heightTrimmed)
    const hasValidWidth =
      widthTrimmed.length > 0 &&
      Number.isFinite(widthValue) &&
      widthValue > 0
    const hasValidHeight =
      heightTrimmed.length > 0 &&
      Number.isFinite(heightValue) &&
      heightValue > 0
    return !(hasBaseInfo && hasValidWidth && hasValidHeight)
  }, [formValues.tags, formValues.url, formValues.width, formValues.height])

  const handleFetchDimensions = useCallback(async () => {
    if (!canFetchDimensions || isFetchingDimensions) return
    const imageUrl = formValues.url.trim()
    if (!imageUrl) return

    setIsFetchingDimensions(true)
    try {
      const params = new URLSearchParams({ url: imageUrl })
      const response = await fetch(`/api/trip/getImgWAH?${params.toString()}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      const data: { width?: number; height?: number } = await response.json()

      setFormValues((prev) => ({
        ...prev,
        width:
          typeof data.width === 'number' && Number.isFinite(data.width)
            ? String(data.width)
            : prev.width,
        height:
          typeof data.height === 'number' && Number.isFinite(data.height)
            ? String(data.height)
            : prev.height,
      }))

      setFeedback({
        open: true,
        message: '已获取图片尺寸。',
        severity: 'success',
      })
    } catch (error) {
      console.error('获取图片尺寸失败：', error)
      setFeedback({
        open: true,
        message: '获取图片尺寸失败，请检查图片地址。',
        severity: 'error',
      })
    } finally {
      setIsFetchingDimensions(false)
    }
  }, [canFetchDimensions, formValues.url, isFetchingDimensions])

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      if (isSubmitDisabled || isSubmitting) return

      const payload = {
        tags: formValues.tags.trim(),
        picURL: formValues.url.trim(),
        des: formValues.description.trim(),
        width: (() => {
          const numeric = Number(formValues.width)
          return Number.isFinite(numeric) ? numeric : 0
        })(),
        height: (() => {
          const numeric = Number(formValues.height)
          return Number.isFinite(numeric) ? numeric : 0
        })(),
      }

      setIsSubmitting(true)
      try {
        const endpoint = isEditing
          ? '/api/trip/updatePhoto'
          : '/api/trip/photoInput'
        const requestBody =
          isEditing && editingId ? { ...payload, _id: editingId } : payload
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data = await response.json()
        const successMessage = isEditing ? '更新成功。' : '提交成功。'

        setFeedback({
          open: true,
          message: successMessage,
          severity: 'success',
        })

        if (!isEditing) {
          resetForm()
        }
      } catch (error) {
        console.error('提交照片失败：', error)
        setFeedback({
          open: true,
          message: '提交失败，请稍后重试。',
          severity: 'error',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      formValues.description,
      formValues.height,
      formValues.tags,
      formValues.url,
      formValues.width,
      isSubmitDisabled,
      isSubmitting,
      editingId,
      isEditing,
      resetForm,
    ],
  )

  useEffect(() => {
    if (!prefillPhoto) {
      resetForm()
      return
    }

    setEditingId(
      typeof prefillPhoto._id === 'string' ? prefillPhoto._id : null,
    )

    setFormValues({
      tags: prefillPhoto.tags?.trim() || '',
      url: prefillPhoto.picURL?.trim() || '',
      description: prefillPhoto.des?.trim() || '',
      width:
        typeof prefillPhoto.width === 'number' && !Number.isNaN(prefillPhoto.width)
          ? String(prefillPhoto.width)
          : '',
      height:
        typeof prefillPhoto.height === 'number' && !Number.isNaN(prefillPhoto.height)
          ? String(prefillPhoto.height)
          : '',
    })
  }, [prefillPhoto, resetForm])

  const handleChange =
    (field: keyof typeof formValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setFormValues((prev) => ({ ...prev, [field]: value }))
    }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f4f6fb' }}>
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
            新增照片
          </Typography>
          <Button
            color="inherit"
            type="submit"
            disabled={isSubmitDisabled || isSubmitting}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              '&.Mui-disabled': {
                color: '#9ca3af',
              },
            }}
            onClick={() => handleSubmit()}
          >
            {isEditing ? '更新' : '提交'}
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 640,
          mx: 'auto',
          px: 2,
          pb: 6,
          pt: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <TextField
          label="给图片打标签,以|分隔"
          variant="outlined"
          fullWidth
          name="tags"
          value={formValues.tags}
          onChange={handleChange('tags')}
          sx={{ '& .MuiInputBase-root': { height: 56 } }}
        />
        <TextField
          label="图片地址"
          variant="outlined"
          fullWidth
          name="url"
          value={formValues.url}
          onChange={handleChange('url')}
          sx={{ '& .MuiInputBase-root': { height: 56 } }}
        />
        <TextField
          label="图片描述"
          variant="outlined"
          fullWidth
          name="description"
          value={formValues.description}
          onChange={handleChange('description')}
          sx={{ '& .MuiInputBase-root': { height: 56 } }}
        />
        <TextField
          label="图片宽度"
          type="number"
          variant="outlined"
          fullWidth
          name="width"
          value={formValues.width}
          onChange={handleChange('width')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="text"
                  size="small"
                  disabled={!canFetchDimensions || isFetchingDimensions}
                  onClick={handleFetchDimensions}
                  onMouseDown={(event) => event.preventDefault()}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'fit-content' }}
                >
                  获取宽度
                </Button>
              </InputAdornment>
            ),
            inputMode: 'numeric',
          }}
          sx={{
            '& .MuiInputBase-root': { height: 56, pr: 1 },
            '& .MuiInputAdornment-root button': { px: 0.5 },
          }}
        />
        <TextField
          label="图片高度"
          type="number"
          variant="outlined"
          fullWidth
          name="height"
          value={formValues.height}
          onChange={handleChange('height')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="text"
                  size="small"
                  disabled={!canFetchDimensions || isFetchingDimensions}
                  onClick={handleFetchDimensions}
                  onMouseDown={(event) => event.preventDefault()}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'fit-content' }}
                >
                  获取高度
                </Button>
              </InputAdornment>
            ),
            inputMode: 'numeric',
          }}
          sx={{
            '& .MuiInputBase-root': { height: 56, pr: 1 },
            '& .MuiInputAdornment-root button': { px: 0.5 },
          }}
        />
      </Box>
      <Snackbar
        open={feedback.open}
        autoHideDuration={3000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          severity={feedback.severity}
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default PhotosInput
