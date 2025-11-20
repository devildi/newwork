import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Fab from '@mui/material/Fab'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'

type TripResult = {
  _id?: string
  id?: string
  tripName?: string | null
  country?: string | null
  city?: string | null
  tags?: string | null
  detail?: unknown
  coverUrl?: string | null
}

const normalizeTripResults = (payload: unknown): TripResult[] => {
  const pickList = (): unknown[] => {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object') {
      if (Array.isArray((payload as { data?: unknown[] }).data)) return (payload as { data: unknown[] }).data
      if (Array.isArray((payload as { list?: unknown[] }).list)) return (payload as { list: unknown[] }).list
      if (Array.isArray((payload as { items?: unknown[] }).items)) return (payload as { items: unknown[] }).items
    }
    return []
  }

  const extractCover = (detail: unknown): string | null => {
    if (!Array.isArray(detail)) return null
    for (const day of detail) {
      if (!Array.isArray(day)) continue
      for (const point of day) {
        if (!point || typeof point !== 'object') continue
        const pic =
          (point as { picURL?: string }).picURL ||
          (point as { pic?: string }).pic
        if (typeof pic === 'string' && pic.trim()) return pic.trim()
      }
    }
    return null
  }

  return pickList()
    .map((item) => {
      if (!item || typeof item !== 'object') return {}
      const source = item as Record<string, unknown>
      return {
        _id: (source._id as string | undefined) || (source.id as string | undefined),
        id: (source.id as string | undefined) || (source._id as string | undefined),
        tripName:
          (source.tripName as string | null | undefined) ||
          (source.name as string | null | undefined),
        country: source.country as string | null | undefined,
        city: source.city as string | null | undefined,
        tags: source.tags as string | null | undefined,
        detail: source.detail,
        coverUrl:
          (source.coverUrl as string | null | undefined) ||
          (source.cover as string | null | undefined) ||
          extractCover(source.detail ?? null),
      }
    })
    .filter((item) => item.tripName || item._id || item.id)
}

const buildSubtitle = (trip: TripResult) => {
  const location = [trip.country, trip.city]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' · ')
  const tagLabel =
    typeof trip.tags === 'string' && trip.tags.trim().length > 0
      ? trip.tags.trim()
      : ''

  return [location, tagLabel].filter(Boolean).join(' ｜ ')
}

const SearchTrips = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as { from?: string; backgroundLocation?: Location }
  const cameFromOverlay = Boolean(state.backgroundLocation)

  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<TripResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fallbackPath = useMemo(() => {
    if (typeof state.from === 'string' && state.from.length > 0) return state.from
    return '/list'
  }, [state.from])

  const exitSearch = useCallback(() => {
    const historyIndex = (typeof window !== 'undefined' && (window.history.state?.idx as number | undefined)) || 0
    const canGoBack = historyIndex > 0
    if (cameFromOverlay) {
      navigate(-1)
    } else if (canGoBack) {
      navigate(-1)
    } else {
      navigate(fallbackPath, { replace: true })
    }
  }, [cameFromOverlay, fallbackPath, navigate])

  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    }
    const timers = [window.setTimeout(focusInput, 80), window.setTimeout(focusInput, 240)]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  const performSearch = useCallback(async () => {
    const keyword = searchValue.trim()
    inputRef.current?.blur()
    if (!keyword) {
      setSearchResults([])
      setIsSearching(false)
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    try {
      const response = await fetch(
        `/api/trip/getDescriptedTrip?description=${encodeURIComponent(keyword)}`,
        { method: 'GET' },
      )
      if (!response.ok) {
        throw new Error(`搜索失败：${response.status}`)
      }
      const payload = await response.json()
      const normalized = normalizeTripResults(payload)
      setSearchResults(normalized)
    } catch (error) {
      console.error('搜索行程失败：', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchValue])

  const handleResultSelect = useCallback(
    (trip: TripResult) => {
      const mergedTrip = {
        _id: trip._id || trip.id || '',
        tripName: trip.tripName,
        country: trip.country,
        city: trip.city,
        tags: trip.tags,
        detail: trip.detail,
      }
      navigate('/show', {
        state: { trip: mergedTrip },
      })
    },
    [navigate],
  )

  const handleSubmit = () => {
    void performSearch()
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f4f6fb',
        display: 'flex',
        flexDirection: 'column',
        pt: { xs: 1, sm: 1.5 },
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 1.25, sm: 2.5 },
          py: { xs: 0.5, sm: 1 },
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <TextField
          inputRef={inputRef}
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            } else if (event.key === 'Escape') {
              exitSearch()
            }
          }}
          placeholder="输入行程描述"
          autoFocus
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: (
              <IconButton color="primary" onClick={handleSubmit}>
                <SearchIcon />
              </IconButton>
            ),
            sx: {
              height: { xs: 56, sm: 64 },
              '& .MuiOutlinedInput-input': {
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                py: 0,
              },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              paddingRight: 1,
              border: '1px solid rgba(15, 23, 42, 0.1)',
              backgroundColor: '#fff',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            },
          }}
        />
      </Box>
      <Box sx={{ px: 2, mt: 2, flexGrow: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.1)',
            backgroundColor: '#fff',
            minHeight: 160,
            p: 1,
          }}
        >
          {isSearching ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : searchResults.length > 0 ? (
            <List>
              {searchResults.map((trip, index) => (
                <ListItemButton
                  key={`${trip._id || trip.id || 'trip'}-${index}`}
                  onClick={() => handleResultSelect(trip)}
                  sx={{ gap: 1.5, alignItems: 'flex-start' }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {trip.coverUrl ? (
                      <Box
                        component="img"
                        src={trip.coverUrl}
                        alt={trip.tripName || '行程'}
                        sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: '#e2e8f0' }} />
                    )}
                  </Box>
                  <ListItemText
                    primary={trip.tripName?.trim() || '未命名行程'}
                    secondary={buildSubtitle(trip)}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}
                    secondaryTypographyProps={{ fontSize: 13, color: '#6b7280', mt: 0.25 }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : hasSearched ? (
            <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              未找到相关行程
            </Box>
          ) : null}
        </Paper>
      </Box>
      <Fab
        color="primary"
        aria-label="返回"
        onClick={exitSearch}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: (theme) => theme.zIndex.drawer + 4,
        }}
      >
        <ArrowBackIcon />
      </Fab>
    </Box>
  )
}

export default SearchTrips
