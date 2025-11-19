import { useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useMemo, useState, type SyntheticEvent } from 'react'

type LocationState = {
  title?: string
  picURL?: string
  width?: number
  height?: number
  labels?: string
  price?: number
  id?: string
  description?: string
  createAt?: string
  sellAt?: string
  item?: Record<string, unknown>
}

const Toy = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { title, picURL, width, height, labels, price, id, description, createAt, sellAt, item } =
    (location.state as LocationState | null) ?? {}
  const displayTitle = title || '玩具详情'
  const fallbackCover =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="%23c7d2fe" offset="0"/><stop stop-color="%23a5b4fc" offset="1"/></linearGradient></defs><rect width="1200" height="800" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%23474859">Toy Cover</text></svg>'
  const coverSrc =
    picURL ||
    'https://images.unsplash.com/photo-1592188657297-5c4b90c4b716?auto=format&fit=crop&w=1600&q=80'
  const ratioPercent =
    typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0
      ? (height / width) * 100
      : 56.25
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  }
  const purchaseDate = formatDate(sellAt || createAt)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const deletePayload = useMemo(() => {
    if (item && typeof item === 'object') return item
    return {
      id,
      _id: id,
      toyName: title,
      toyPicUrl: picURL,
      picWidth: width,
      picHeight: height,
      labels,
      price,
      createAt,
      sellAt,
      description,
    }
  }, [createAt, description, height, id, item, labels, picURL, price, sellAt, title, width])

  const handleDelete = async () => {
    if (!deletePayload) {
      window.alert('缺少删除所需的数据')
      return
    }
    setIsDeleting(true)
    try {
      const response = await fetch('/api/treasure/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deletePayload),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `删除失败：${response.status}`)
      }
      window.alert('删除成功')
      navigate('/toies', { replace: true })
    } catch (error) {
      console.error('删除玩具失败：', error)
      window.alert('删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f4f6fb',
      }}
    >
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            aria-label="返回"
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {displayTitle}
          </Typography>
          <Box sx={{ marginLeft: 'auto' }}>
            <Button
              color="inherit"
              variant="text"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              删除
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Box>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            pt: `${ratioPercent}%`,
          }}
        >
          <Box
            component="img"
            src={coverSrc}
            onError={(event: SyntheticEvent<HTMLImageElement>) => {
              event.currentTarget.src = fallbackCover
            }}
            alt={displayTitle}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {displayTitle}
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {typeof price === 'number' ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0f172a' }}>
                购买价格：¥{price}
              </Typography>
            ) : null}
            {purchaseDate ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0f172a' }}>
                购买时间：{purchaseDate}
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
            {labels ? (
              labels.split(',').map((label) => (
                <Chip key={label} label={label.trim()} sx={{ mb: 0.5 }} />
              ))
            ) : (
              <Chip label="暂无标签" />
            )}
          </Stack>
          <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.7 }}>
            {description && description.trim().length > 0
              ? description
              : '暂无描述。'}
          </Typography>
        </Box>
      </Box>

      <Dialog open={confirmOpen} onClose={() => (!isDeleting ? setConfirmOpen(false) : null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>删除后无法恢复，确认要删除这条玩具记录吗？</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Toy
