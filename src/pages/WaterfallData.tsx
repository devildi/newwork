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
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent, SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import PageSwitcher from '../components/PageSwitcher.tsx'
import { WATERFALL_FALLBACK_PAGE_SIZE } from '../constants/app.ts'

type StoryRecord = {
  _id: string
  articleName: string
  picURL: string
  articleURL?: string
  width?: number
  height?: number
}

type StoryResponse = {
  items?: StoryRecord[]
  total?: number
  totalPages?: number
}

const ArrowBackIcon = () => (
  <SvgIcon>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </SvgIcon>
)

const WaterfallData = () => {
  const navigate = useNavigate()
  const [stories, setStories] = useState<StoryRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null)
  const [deleteFeedback, setDeleteFeedback] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const controller = new AbortController()

    const fetchStories = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(
          `http://localhost:4000/api/trip/getStoryByPage?page=${currentPage}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data: StoryResponse = await response.json()
        const items = Array.isArray(data.items) ? data.items : []

        setStories(items)

        const total = (() => {
          if (typeof data.totalPages === 'number') return data.totalPages
          if (typeof data.total === 'number') return data.total
          return null
        })()

        if (total !== null && Number.isFinite(total) && total > 0) {
          const pageSize = items.length || WATERFALL_FALLBACK_PAGE_SIZE
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
        console.error('获取瀑布流数据失败：', error)
        setErrorMessage('加载瀑布流数据失败，请稍后重试。')
        setStories([])
        setTotalPages(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStories()

    return () => controller.abort()
  }, [currentPage])

  const hasStories = useMemo(() => stories.length > 0, [stories])
  const disablePrev = currentPage <= 1 || isLoading || !!errorMessage
  const disableNext =
    isLoading ||
    !!errorMessage ||
    (totalPages !== null ? currentPage >= totalPages : !hasStories)

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) =>
      totalPages ? Math.min(totalPages, prev + 1) : prev + 1,
    )
  }

  const handleAvatarError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.setAttribute(
      'src',
      'https://via.placeholder.com/80x80?text=No+Image',
    )
  }

  const handleItemClick = (url?: string) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleEditClick =
    (story: StoryRecord) => (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      navigate('/story', { state: { story } })
    }
  const handleDeleteClick =
    (story: StoryRecord) => async (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (deletingStoryId) return

      setDeletingStoryId(story._id)
      try {
        const response = await fetch(
          'http://localhost:4000/api/trip/deleteStoryById',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: story._id }),
          },
        )

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`)
        }

        const data: unknown = await response.json()
        const deletedId =
          data &&
          typeof data === 'object' &&
          '_id' in data &&
          typeof (data as { _id?: unknown })._id === 'string'
            ? ((data as { _id?: string })._id as string)
            : story._id

        setStories((prev) => prev.filter((item) => item._id !== deletedId))
        setDeleteFeedback({
          open: true,
          message: '删除成功。',
          severity: 'success',
        })
      } catch (error) {
        console.error('删除瀑布流数据失败：', error)
        setDeleteFeedback({
          open: true,
          message: '删除失败，请稍后重试。',
          severity: 'error',
        })
      } finally {
        setDeletingStoryId(null)
      }
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
            瀑布流数据
          </Typography>
          <Box sx={{ width: 40, height: 40 }} aria-hidden />
        </Toolbar>
      </AppBar>

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
        ) : hasStories ? (
          <List
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            {stories.map((story, index) => (
              <Box key={story._id} component="li" sx={{ listStyle: 'none' }}>
                <ListItem
                  sx={{
                    py: 2,
                    px: { xs: 2, md: 3 },
                    cursor: story.articleURL ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 2, md: 3 },
                  }}
                  onClick={() => handleItemClick(story.articleURL)}
                >
                  <ListItemAvatar sx={{ mr: { xs: 1.5, md: 2 } }}>
                    <Avatar
                      src={story.picURL}
                      alt={story.articleName}
                      variant="rounded"
                      sx={{
                        width: 64,
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
                        {story.articleName || '未命名文章'}
                      </Typography>
                    }
                    primaryTypographyProps={{ color: 'rgba(15, 23, 42, 0.85)' }}
                  />
                  <IconButton
                    edge="end"
                    aria-label="编辑文章"
                    color="primary"
                    onClick={handleEditClick(story)}
                    sx={{ flexShrink: 0 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="删除文章"
                    color="error"
                    onClick={handleDeleteClick(story)}
                    disabled={deletingStoryId === story._id}
                    sx={{ flexShrink: 0 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItem>
                {index < stories.length - 1 ? <Divider component="div" /> : null}
              </Box>
            ))}
          </List>
        ) : (
          <Alert severity="info">当前没有瀑布流数据。</Alert>
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

export default WaterfallData
