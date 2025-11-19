import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'

type ToyStory = {
  _id?: string
  id?: string
  toyName?: string
  toyPicUrl?: string
  picWidth?: number
  picHeight?: number
  description?: string
  labels?: string
  price?: number
  createAt?: string
  sellAt?: string
}

const mapStory = (raw: unknown): ToyStory => {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  return {
    _id:
      (source._id as string | undefined) ||
      (source.id as string | undefined) ||
      (typeof source.toString === 'function' ? undefined : undefined),
    id: source.id as string | undefined,
    toyName: source.toyName as string | undefined,
    toyPicUrl: (source.toyPicUrl as string | undefined) || (source.picURL as string | undefined),
    picWidth: (source.picWidth as number | undefined) ?? (source.width as number | undefined),
    picHeight: (source.picHeight as number | undefined) ?? (source.height as number | undefined),
    description: (source.description as string | undefined) || (source.des as string | undefined),
    labels: source.labels as string | undefined,
    price: source.price as number | undefined,
    createAt: source.createAt as string | undefined,
    sellAt: source.sellAt as string | undefined,
  }
}

const normalizeStories = (payload: unknown): ToyStory[] => {
  const resolveList = (): unknown[] => {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object') {
      if (Array.isArray((payload as { items?: unknown[] }).items)) {
        return (payload as { items: unknown[] }).items
      }
      if (Array.isArray((payload as { data?: unknown[] }).data)) {
        return (payload as { data: unknown[] }).data
      }
      if (Array.isArray((payload as { list?: unknown[] }).list)) {
        return (payload as { list: unknown[] }).list
      }
    }
    return []
  }

  return resolveList()
    .map(mapStory)
    .filter((item) => Boolean(item.toyPicUrl || item.toyName || item._id || item.id))
}

const Toies = () => {
  const navigate = useNavigate()
  const [stories, setStories] = useState<ToyStory[]>([])
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const isLoadingPageRef = useRef(false)
  const observerStateRef = useRef({
    hasMore: true,
    isFetchingMore: false,
    isInitialLoading: true,
  })

  const fetchStories = useCallback(async (pageToLoad: number, controller: AbortController) => {
    const isFirstPage = pageToLoad === 1

    if (isFirstPage) {
      setIsInitialLoading(true)
      setErrorMessage(null)
      setLoadMoreError(null)
    } else {
      setIsFetchingMore(true)
      setLoadMoreError(null)
    }
    isLoadingPageRef.current = true

    try {
      const response = await fetch(
        `/api/treasure/getAllTreasures?page=${pageToLoad}`,
        {
          signal: controller.signal,
        },
      )

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }

      const payload = await response.json()
      const incoming = normalizeStories(payload)

      setStories((prev) => {
        if (incoming.length <= prev.length) {
          setHasMore(false)
          return prev
        }
        const appended = incoming.slice(prev.length)
        setHasMore(appended.length > 0)
        return appended.length ? [...prev, ...appended] : prev
      })
      if (isFirstPage) {
        setIsInitialLoading(false)
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('获取玩具数据失败：', error)
      if (isFirstPage) {
        setErrorMessage('加载玩具数据失败，请稍后再试。')
        setStories([])
        setHasMore(false)
        setIsInitialLoading(false)
      } else {
        setLoadMoreError('加载更多玩具失败，请稍后再试。')
      }
    } finally {
      if (!isFirstPage) {
        setIsFetchingMore(false)
      }
      isLoadingPageRef.current = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchStories(page, controller)
    return () => controller.abort()
  }, [fetchStories, page])

  const hasStories = useMemo(() => stories.length > 0, [stories])

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      } else {
        setContainerWidth(Math.max(320, window.innerWidth - 32))
      }
    }
    measure()
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(containerRef.current)
    }
    window.addEventListener('resize', measure)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const columnLayout = useMemo(() => {
    const gap = 14
    const resolvedWidth =
      containerWidth || Math.max(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 360)
    const columnWidth = (resolvedWidth - gap) / 2
    const metaHeight = 60 // approximate title block height
    const columns: Array<{ items: ToyStory[]; accHeight: number }> = [
      { items: [], accHeight: 0 },
      { items: [], accHeight: 0 },
    ]
    stories.forEach((story, index) => {
      const numericWidth = Number(story.picWidth) || 0
      const numericHeight = Number(story.picHeight) || 0
      const hasDimensions = numericWidth > 0 && numericHeight > 0
      const ratio = hasDimensions ? numericHeight / numericWidth : 4 / 5
      const imageHeight = columnWidth * ratio
      const cardHeight = imageHeight + metaHeight + gap
      let target = 0
      if (index === 0) target = 0
      else if (index === 1) target = 1
      else target = columns[0].accHeight <= columns[1].accHeight ? 0 : 1
      columns[target].items.push(story)
      columns[target].accHeight += cardHeight
    })
    return { left: columns[0].items, right: columns[1].items, columnWidth }
  }, [containerWidth, stories])

  useEffect(() => {
    observerStateRef.current = { hasMore, isFetchingMore, isInitialLoading }
  }, [hasMore, isFetchingMore, isInitialLoading])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const target = loaderRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const { hasMore, isFetchingMore, isInitialLoading } = observerStateRef.current
        if (
          entry?.isIntersecting &&
          hasMore &&
          !isFetchingMore &&
          !isInitialLoading &&
          !isLoadingPageRef.current
        ) {
          isLoadingPageRef.current = true
          setPage((prev) => prev + 1)
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 },
    )
    
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasStories])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f4f6fb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        pb: 1,
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
            我的玩具
          </Typography>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Box
        sx={{
          flexGrow: 1,
          px: 0.625,
          py: 0.625,
          mt: { xs: 0, sm: 2 },
        }}
      >
        {isInitialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={48} />
          </Box>
        ) : errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : hasStories ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box
                ref={containerRef}
                sx={{
                  width: '100%',
                  maxWidth: 1200,
                  display: 'flex',
                  gap: { xs: '12px', sm: '14px' },
                  minWidth: 320,
                }}
              >
                {[columnLayout.left, columnLayout.right].map((column, idx) => (
                  <Box key={idx} sx={{ flex: 1, minWidth: 0 }}>
                    {column.map((story) => {
                      const numericWidth = Number(story.picWidth) || 0
                      const numericHeight = Number(story.picHeight) || 0
                      const hasDimensions = numericWidth > 0 && numericHeight > 0
                      const ratioPercent = hasDimensions ? (numericHeight / numericWidth) * 100 : 125
                      const title = story.toyName || '玩具'
                      const imageUrl = story.toyPicUrl
                      return (
                    <Box
                      key={story._id || story.id || `${story.toyName}-${story.toyPicUrl}`}
                      sx={{
                        width: '100%',
                        breakInside: 'avoid',
                        display: 'inline-block',
                        mb: { xs: 1.5, sm: 2 },
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
                        background: 'linear-gradient(180deg, #f8fafc 0%, #fff 22%)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        cursor: story.articleURL ? 'pointer' : 'default',
                        transition: 'transform 200ms ease, box-shadow 200ms ease',
                        '&:hover': {
                          transform: story.articleURL ? 'translateY(-4px)' : 'none',
                          boxShadow: story.articleURL
                            ? '0 22px 40px rgba(15, 23, 42, 0.18)'
                            : '0 18px 32px rgba(15, 23, 42, 0.12)',
                        },
                      }}
                      onClick={() =>
                        navigate('/toy', {
                          state: {
                            title,
                            picURL: imageUrl,
                            width: story.picWidth,
                            height: story.picHeight,
                            description: story.description,
                            labels: story.labels,
                            price: story.price,
                            id: story._id || story.id,
                            createAt: story.createAt,
                            sellAt: story.sellAt,
                            item: story,
                          },
                        })
                      }
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                          overflow: 'hidden',
                          height: 0,
                          paddingTop: `${ratioPercent}%`,
                          aspectRatio: hasDimensions ? `${numericWidth}/${numericHeight}` : '4 / 5',
                        }}
                      >
                        {imageUrl ? (
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={title}
                            width={hasDimensions ? story.picWidth : undefined}
                            height={hasDimensions ? story.picHeight : undefined}
                            loading="lazy"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'block',
                              objectFit: 'contain',
                              backgroundColor: '#f8fafc',
                            }}
                          />
                        ) : null}
                      </Box>
                      <Box sx={{ px: 0.75, py: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: 0.2 }}
                          noWrap
                        >
                          {title}
                        </Typography>
                      </Box>
                        </Box>
                      )
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box
              ref={loaderRef}
              sx={{
                width: '100%',
                maxWidth: 1200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
                minHeight: 64,
                overflowAnchor: 'none',
                visibility: hasStories && (hasMore || isFetchingMore || loadMoreError) ? 'visible' : 'hidden',
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
          </>
        ) : (
          <Alert severity="info">暂时没有玩具内容。</Alert>
        )}
      </Box>

      {showScrollTop ? (
        <Fab
          color="primary"
          aria-label="回到顶部"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            zIndex: 1200,
          }}
        >
          <ArrowUpwardIcon />
        </Fab>
      ) : null}

      <Fab
        color="primary"
        aria-label="添加玩具"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
        }}
        onClick={() => navigate('/addToy')}
      >
        <AddIcon />
      </Fab>
    </Box>
  )
}

export default Toies
