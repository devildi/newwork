import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import SvgIcon from '@mui/material/SvgIcon'
import Alert from '@mui/material/Alert'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

type StoryPrefill = {
  _id?: string | null
  articleName?: string | null
  picURL?: string | null
  articleURL?: string | null
  width?: number | null
  height?: number | null
}

type StoryFormValues = {
  articleName: string
  coverUrl: string
  articleUrl: string
  width: string
  height: string
}

type StoryPayload = {
  articleName: string
  picURL: string
  articleURL: string
  width: number
  height: number
  _id?: string
}

const Story = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillStory = useMemo<StoryPrefill | undefined>(() => {
    const state = location.state
    if (state && typeof state === 'object' && 'story' in state) {
      return (state as { story?: StoryPrefill }).story
    }
    return undefined
  }, [location.state])
  const isEditMode = useMemo(() => !!prefillStory, [prefillStory])

  const createEmptyFormValues = (): StoryFormValues => ({
    articleName: '',
    coverUrl: '',
    articleUrl: '',
    width: '',
    height: '',
  })

  const [formValues, setFormValues] = useState<StoryFormValues>(createEmptyFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingDimensions, setIsFetchingDimensions] = useState(false)
  const [feedback, setFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })
  const isSubmitDisabled = useMemo(() => {
    const hasBaseInfo =
      formValues.articleName.trim().length > 0 &&
      formValues.coverUrl.trim().length > 0
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
  }, [formValues.articleName, formValues.coverUrl, formValues.width, formValues.height])
  const canFetchDimensions = useMemo(
    () => formValues.coverUrl.trim().length > 0,
    [formValues.coverUrl],
  )

  useEffect(() => {
    if (!prefillStory) return
    setFormValues({
      articleName: prefillStory.articleName?.trim() || '',
      coverUrl: prefillStory.picURL?.trim() || '',
      articleUrl: prefillStory.articleURL?.trim() || '',
      width:
        typeof prefillStory.width === 'number' && !Number.isNaN(prefillStory.width)
          ? String(prefillStory.width)
          : '',
      height:
        typeof prefillStory.height === 'number' && !Number.isNaN(prefillStory.height)
          ? String(prefillStory.height)
          : '',
    })
  }, [prefillStory])

  const handleChange =
    (field: keyof typeof formValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isSubmitDisabled || isSubmitting) return
    const payload: StoryPayload = {
      articleName: formValues.articleName.trim(),
      picURL: formValues.coverUrl.trim(),
      articleURL: formValues.articleUrl.trim(),
      width: Number(formValues.width.trim()),
      height: Number(formValues.height.trim()),
    }

    if (isEditMode && prefillStory?._id) {
      payload._id = prefillStory._id
    }

    setIsSubmitting(true)
    try {
      const endpoint = isEditMode ? 'updateItem' : 'newItem'
      const response = await fetch(`http://localhost:4000/api/trip/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      const data: StoryPrefill = await response.json()
      if (isEditMode) {
        setFormValues({
          articleName:
            typeof data.articleName === 'string' && data.articleName.trim()
              ? data.articleName.trim()
              : payload.articleName,
          coverUrl:
            typeof data.picURL === 'string' && data.picURL.trim()
              ? data.picURL.trim()
              : payload.picURL,
          articleUrl:
            typeof data.articleURL === 'string' && data.articleURL.trim()
              ? data.articleURL.trim()
              : payload.articleURL,
          width:
            typeof data.width === 'number' && Number.isFinite(data.width)
              ? String(data.width)
              : String(payload.width),
          height:
            typeof data.height === 'number' && Number.isFinite(data.height)
              ? String(data.height)
              : String(payload.height),
        })
      } else {
        setFormValues(createEmptyFormValues())
      }
      setFeedback({
        open: true,
        message: isEditMode ? '更新成功。' : '提交成功。',
        severity: 'success',
      })
    } catch (error) {
      console.error('提交失败：', error)
      setFeedback({
        open: true,
        message: '提交失败，请稍后重试。',
        severity: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFetchDimensions = async () => {
    if (!canFetchDimensions || isFetchingDimensions) return
    const imageUrl = formValues.coverUrl.trim()
    if (!imageUrl) return

    setIsFetchingDimensions(true)
    try {
      const params = new URLSearchParams({ url: imageUrl })
      const response = await fetch(
        `http://localhost:4000/api/trip/getImgWAH?${params.toString()}`,
        { method: 'GET' },
      )

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
            瀑布流新增
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
            {isEditMode ? '更新' : '提交'}
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
          label="文章名字"
          variant="outlined"
          fullWidth
          name="articleName"
          value={formValues.articleName}
          onChange={handleChange('articleName')}
          sx={{ '& .MuiInputBase-root': { height: 56 } }}
        />
        <TextField
          label="封面地址"
          variant="outlined"
          fullWidth
          name="coverUrl"
          value={formValues.coverUrl}
          onChange={handleChange('coverUrl')}
          sx={{ '& .MuiInputBase-root': { height: 56 } }}
        />
        <TextField
          label="页面地址"
          variant="outlined"
          fullWidth
          name="articleUrl"
          value={formValues.articleUrl}
          onChange={handleChange('articleUrl')}
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
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setFeedback((prev) => ({ ...prev, open: false }))
        }}
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

export default Story
