import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import LinearProgress from '@mui/material/LinearProgress'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import * as qiniu from 'qiniu-js'
import { getStoredUser } from '../utils/authStorage.ts'

const resolveOwnerId = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') return null
  const direct =
    (user as { _id?: string })._id ||
    (user as { id?: string }).id ||
    (user as { userId?: string }).userId
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const nestedSources = [
    (user as { user?: { _id?: string; id?: string; userId?: string } }).user,
    (user as { data?: { _id?: string; id?: string; userId?: string } }).data,
    (user as { result?: { _id?: string; id?: string; userId?: string } }).result,
  ]
  for (const nested of nestedSources) {
    if (!nested || typeof nested !== 'object') continue
    const nestedId =
      (nested as { _id?: string })._id ||
      (nested as { id?: string }).id ||
      (nested as { userId?: string }).userId
    if (typeof nestedId === 'string' && nestedId.trim()) {
      return nestedId.trim()
    }
  }
  return null
}

const AddToy = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadedKey, setUploadedKey] = useState<string | null>(null)
  const [uploadedDimensions, setUploadedDimensions] = useState<{ width?: number; height?: number } | null>(null)
  const [localImageDimensions, setLocalImageDimensions] = useState<{ width?: number; height?: number } | null>(null)
  const [toyName, setToyName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const generateItemId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `toy-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleSave = async () => {
    if (isUploading) return
    const trimmedName = toyName.trim()
    if (!trimmedName) {
      window.alert('请填写玩具名称')
      return
    }
    if (!selectedFile) {
      window.alert('请先选择要上传的图片')
      return
    }
    const resolvedLabels = selectedTag?.trim()
    if (!resolvedLabels) {
      window.alert('请选择或添加标签')
      return
    }
    const storedUser = getStoredUser()
    const ownerId = resolveOwnerId(storedUser)
    if (!ownerId) {
      window.alert('请先登录')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    const uploadPromise = (async () => {
      const tokenResponse = await fetch('/api/trip/getUploadToken', {
        method: 'GET',
      })
      if (!tokenResponse.ok) {
        throw new Error(`获取上传凭证失败：${tokenResponse.status}`)
      }

      const contentType = tokenResponse.headers.get('content-type')?.toLowerCase()
      const tokenPayloadText = await tokenResponse.text()
      let tokenData:
        | string
        | {
            token?: string
            uptoken?: string
            key?: string
            domain?: string
          } = tokenPayloadText
      if (contentType?.includes('application/json')) {
        try {
          tokenData = JSON.parse(tokenPayloadText)
        } catch (err) {
          console.warn('上传凭证 JSON 解析失败，原始文本：', tokenPayloadText, err)
        }
      }

      console.log('上传凭证：', tokenData)

      const uploadToken =
        typeof tokenData === 'string' ? tokenData : tokenData.token || tokenData.uptoken
      console.log('上传Token：', uploadToken)
      if (!uploadToken) {
        throw new Error('未获取到上传凭证')
      }

      let fileToUpload: File | Blob = selectedFile
      const compressed = await qiniu.compressImage(selectedFile, {
        quality: 0.92,
        maxWidth: 1600,
        maxHeight: 1600,
        noCompressIfLarger: true,
      })
      if (compressed?.dist instanceof Blob) {
        fileToUpload = compressed.dist
      }
      console.log('图片压缩后尺寸：', compressed?.width, compressed?.height)
      setUploadedDimensions({ width: compressed?.width, height: compressed?.height })

      const uploadKey =
        tokenData.key || `toy-${Date.now()}-${selectedFile.name}`
      const observable = qiniu.upload(
        fileToUpload,
        uploadKey,
        uploadToken,
        { fname: selectedFile.name },
        {
          useCdnDomain: true,
        },
      )

      const uploadResult: { key?: string; hash?: string } = await new Promise(
        (resolve, reject) => {
          observable.subscribe({
            next: (res: unknown) => {
              const percent = Math.min(
                100,
                Math.max(
                  0,
                  typeof (res as { total?: { percent?: number } }).total?.percent === 'number'
                    ? (res as { total?: { percent?: number } }).total?.percent ?? 0
                    : 0,
                ),
              )
              setUploadProgress(percent)
              console.log('七牛上传进度：', percent)
            },
            error: (err: unknown) => {
              reject(err)
            },
            complete: (res: any) => {
              setUploadProgress(100)
              resolve(res || {})
            },
          })
        },
      )

      console.log('七牛上传结果：', uploadResult)

      const finalKey = uploadResult.key || uploadKey
      setUploadedKey(finalKey)
      const normalizedDomain = tokenData.domain?.replace(/\/$/, '') || ''
      const finalUrl = normalizedDomain
        ? `${normalizedDomain}/${finalKey}`
        : finalKey
      setUploadedImageUrl(finalUrl)

      const numericPrice = (() => {
        const num = Number(price)
        return Number.isFinite(num) ? num : 0
      })()
      const resolvedWidth =
        uploadedDimensions?.width ??
        compressed?.width ??
        localImageDimensions?.width ??
        0
      const resolvedHeight =
        uploadedDimensions?.height ??
        compressed?.height ??
        localImageDimensions?.height ??
        0
      const payload = {
        id: generateItemId(),
        toyName: trimmedName,
        toyPicUrl: finalKey,
        picWidth: resolvedWidth,
        picHeight: resolvedHeight,
        labels: resolvedLabels,
        owner: ownerId,
        price: numericPrice,
        description: description.trim(),
        isSelled: false,
      }

      const saveResponse = await fetch('/api/treasure/newItem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!saveResponse.ok) {
        const text = await saveResponse.text()
        throw new Error(text || `保存失败：${saveResponse.status}`)
      }

      navigate('/toies', { replace: true })
    })()

    uploadPromise.finally(() => setIsUploading(false))
    await uploadPromise
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
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            gap: 1,
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            aria-label="返回"
            onClick={() => navigate(-1)}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              flex: 1,
              textAlign: 'center',
            }}
          >
            添加玩具
          </Typography>
          <Button
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
            disabled={isUploading}
            onClick={handleSave}
          >
            {isUploading ? '上传中...' : '保存'}
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Box
        sx={{
          flex: 1,
          px: 2,
          py: 3,
          color: '#94a3b8',
        }}
      >
        {/* TODO: form fields for adding toy */}
        <Stack spacing={2}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ alignSelf: 'flex-start' }}
          >
            选择图片
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
              }
              if (file) {
                const url = URL.createObjectURL(file)
                setPreviewUrl(url)
                setSelectedFile(file)
                setUploadedImageUrl(null)
                setUploadProgress(null)
                setLocalImageDimensions(null)

                const img = new Image()
                img.onload = () => {
                  setLocalImageDimensions({ width: img.width, height: img.height })
                  URL.revokeObjectURL(img.src)
                }
                img.onerror = () => {
                  URL.revokeObjectURL(img.src)
                }
                img.src = url
              } else {
                setPreviewUrl(null)
                setSelectedFile(null)
                setUploadedImageUrl(null)
                setUploadProgress(null)
                setLocalImageDimensions(null)
              }
            }}
          />
          {previewUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: 360,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={previewUrl}
                alt="已选择的图片"
                sx={{
                  width: '100%',
                  display: 'block',
                  borderRadius: 2,
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                }}
              />
              {uploadProgress !== null ? (
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  color="success"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: 8,
                    borderRadius: '0 0 8px 8px',
                    opacity: 0.9,
                  }}
                />
              ) : null}
            </Box>
          ) : null}
          <TextField
            fullWidth
            label="玩具名称"
            placeholder="请输入玩具名称"
            variant="outlined"
            value={toyName}
            onChange={(e) => setToyName(e.target.value)}
          />
          <TextField
            fullWidth
            label="玩具价格"
            placeholder="请输入玩具价格"
            variant="outlined"
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <TextField
            fullWidth
            label="玩具描述"
            placeholder="请输入玩具描述（可选）"
            variant="outlined"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Box
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.6)',
              borderRadius: 2,
              padding: 1.5,
              ml: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={0}
              flexWrap="wrap"
              sx={{ rowGap: 1, columnGap: 0, ml: -1 }}
            >
              {[...['泡泡玛特', 'Jellycat', '三丽鸥', '面包超人', '面包小偷'], ...customTags].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  clickable
                  color={selectedTag === tag ? 'primary' : 'default'}
                  variant={selectedTag === tag ? 'filled' : 'outlined'}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  sx={{
                    backgroundColor: selectedTag === tag ? '#1976d2' : '#ffffff',
                    color: selectedTag === tag ? '#ffffff' : '#0f172a',
                    borderColor: selectedTag === tag ? '#1976d2' : 'rgba(148, 163, 184, 0.6)',
                    transition: 'all 120ms ease',
                    ml: 1,
                  }}
                />
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{
                  height: 32,
                  borderRadius: 999,
                  ml: 1,
                  textTransform: 'none',
                  color: '#0f172a',
                  borderColor: 'rgba(148, 163, 184, 0.6)',
                  backgroundColor: '#fff',
                }}
                onClick={() => {
                  setNewTagName('')
                  setIsTagDialogOpen(true)
                }}
              >
                添加标签
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
      <Dialog open={isTagDialogOpen} onClose={() => setIsTagDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>添加标签</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="标签名称"
            placeholder="设置标签名字"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={() => {
              const trimmed = newTagName.trim()
              if (!trimmed) return
              if (!customTags.includes(trimmed)) {
                setCustomTags((prev) => [...prev, trimmed])
              }
              setSelectedTag(trimmed)
              setIsTagDialogOpen(false)
            }}
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AddToy
