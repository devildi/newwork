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

import { getStoredUser } from '../utils/authStorage.ts'
import { preloadGaodeMap } from '../utils/amapLoader.ts'
import { preloadGoogleMap } from '../utils/googleMapsLoader.ts'
import { GAODE_MAP_API_KEY, GOOGLE_MAP_API_KEY } from '../constants/map.ts'
import type { SearchResult as POISearchResult } from '../types/search.ts'

type ToySearchResult = {
  id?: string
  toyName?: string
  toyPicUrl?: string
}

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

const normalizeResults = (payload: unknown): ToySearchResult[] => {
  const pickList = (): unknown[] => {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object') {
      if (Array.isArray((payload as { data?: unknown[] }).data)) return (payload as { data: unknown[] }).data
      if (Array.isArray((payload as { list?: unknown[] }).list)) return (payload as { list: unknown[] }).list
      if (Array.isArray((payload as { items?: unknown[] }).items)) return (payload as { items: unknown[] }).items
    }
    return []
  }
  return pickList()
    .map((item) => {
      if (!item || typeof item !== 'object') return {}
      const source = item as Record<string, unknown>
      return {
        id: (source._id as string | undefined) || (source.id as string | undefined),
        toyName: (source.toyName as string | undefined) || (source.name as string | undefined),
        toyPicUrl:
          (source.toyPicUrl as string | undefined) ||
          (source.picURL as string | undefined) ||
          (source.photo as string | undefined),
      }
    })
    .filter((item) => item.toyName || item.toyPicUrl || item.id)
}

const SearchPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as {
    from?: string
    backgroundLocation?: Location
    mapProvider?: 'gaode' | 'google'
  }
  const storedUserId = useMemo(() => resolveOwnerId(getStoredUser()), [])
  const cameFromOverlay = Boolean(state.backgroundLocation)
  const mapProvider = state.mapProvider
  const isPOISearch = Boolean(mapProvider)
  const [searchValue, setSearchValue] = useState('')
  const [toySearchResults, setToySearchResults] = useState<ToySearchResult[]>([])
  const [poiSearchResults, setPOISearchResults] = useState<POISearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fallbackPath = useMemo(() => {
    if (typeof state.from === 'string' && state.from.length > 0) return state.from
    return '/toies'
  }, [state.from])

  const exitSearch = useCallback(() => {
    const historyIndex = (typeof window !== 'undefined' && (window.history.state?.idx as number | undefined)) || 0
    const canGoBack = historyIndex > 0
    if (cameFromOverlay) {
      navigate(-1)
    } else {
      if (canGoBack) {
        navigate(-1)
      } else {
        navigate(fallbackPath, { replace: true })
      }
    }
  }, [cameFromOverlay, fallbackPath, navigate])

  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    }
    const timers = [
      window.setTimeout(focusInput, 80),
      window.setTimeout(focusInput, 240),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  const performSearch = useCallback(async () => {
    const keyword = searchValue.trim()
    inputRef.current?.blur()
    if (!keyword) {
      setToySearchResults([])
      setPOISearchResults([])
      setIsSearching(false)
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    setHasSearched(true)

    // POI Search (from /edit page)
    if (isPOISearch && mapProvider) {
      try {
        setPOISearchResults([])
        if (mapProvider === 'gaode') {
          const AMap = await preloadGaodeMap(GAODE_MAP_API_KEY)
          const placeSearch = new AMap.PlaceSearch({ city: '全国', pageSize: 5 })
          placeSearch.search(keyword, (status: string, result: any) => {
            if (status !== 'complete' || !result?.poiList?.pois) {
              setPOISearchResults([])
              setIsSearching(false)
              return
            }
            const list: POISearchResult[] = result.poiList.pois
              .slice(0, 5)
              .map((poi: any) => {
                const location = poi.location
                let lngLat: [number, number] | null = null
                if (location) {
                  if (typeof location.lng === 'number' && typeof location.lat === 'number') {
                    lngLat = [location.lng, location.lat]
                  } else if (typeof location === 'string') {
                    const [lng, lat] = location.split(/[,，]/).map(Number)
                    if (Number.isFinite(lng) && Number.isFinite(lat)) {
                      lngLat = [lng, lat]
                    }
                  }
                }
                if (!lngLat) return null
                return {
                  name: poi.name,
                  location: lngLat,
                  address: poi.address,
                }
              })
              .filter(Boolean) as POISearchResult[]
            setPOISearchResults(list)
            setIsSearching(false)
          })
        } else {
          const google = await preloadGoogleMap(GOOGLE_MAP_API_KEY)
          if (!google?.maps?.importLibrary) {
            setPOISearchResults([])
            setIsSearching(false)
            return
          }
          const { PlacesService, PlacesServiceStatus } =
            (await google.maps.importLibrary('places')) as { PlacesService: any; PlacesServiceStatus: any }
          const placesService = new PlacesService(document.createElement('div'))
          const request = { query: keyword }
          placesService.textSearch(request, (results: any, status: string) => {
            if (status !== PlacesServiceStatus.OK || !results) {
              setPOISearchResults([])
              setIsSearching(false)
              return
            }
            const list: POISearchResult[] = results
              .filter((place: any) => place.geometry?.location)
              .slice(0, 5)
              .map((place: any) => {
                const location = place.geometry!.location
                return {
                  name: place.name ?? '未知地点',
                  location: [location.lng(), location.lat()],
                  address: place.formatted_address ?? place.vicinity ?? '',
                }
              })
            setPOISearchResults(list)
            setIsSearching(false)
          })
        }
      } catch (error) {
        console.error('POI搜索失败：', error)
        setIsSearching(false)
        setHasSearched(false)
      }
      return
    }

    // Toy Search (default)
    try {
      const uidParam = storedUserId ? `&uid=${encodeURIComponent(storedUserId)}` : ''
      const response = await fetch(
        `/api/treasure/search?keyword=${encodeURIComponent(keyword)}${uidParam}`,
        {
          method: 'GET',
        },
      )
      if (!response.ok) {
        throw new Error(`搜索失败：${response.status}`)
      }
      const payload = await response.json()
      const normalized = normalizeResults(payload)
      setToySearchResults(normalized)
    } catch (error) {
      console.error('搜索失败：', error)
      setToySearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchValue, storedUserId, isPOISearch, mapProvider])

  const handlePOIResultSelect = useCallback(
    (result: POISearchResult) => {
      // Dispatch custom event to notify EditTrips page
      const event = new CustomEvent('trip-search-select', { detail: result })
      window.dispatchEvent(event)
      // Navigate back
      exitSearch()
    },
    [exitSearch],
  )

  const handleToyResultSelect = useCallback(
    (result: ToySearchResult) => {
      const title = result.toyName || '玩具'
      navigate('/toy', {
        state: {
          title,
          picURL: result.toyPicUrl,
          id: result.id,
          item: result,
        },
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
          placeholder="请输入关键字"
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
          ) : isPOISearch ? (
            poiSearchResults.length > 0 ? (
              <List>
                {poiSearchResults.map((result, index) => (
                  <ListItemButton
                    key={`${result.name}-${index}`}
                    onClick={() => handlePOIResultSelect(result)}
                    sx={{ gap: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <ListItemText
                      primary={result.name}
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}
                      secondary={result.address}
                      secondaryTypographyProps={{ fontSize: 13, color: '#64748b' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : hasSearched ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                暂无搜索结果
              </Box>
            ) : null
          ) : toySearchResults.length > 0 ? (
            <List>
              {toySearchResults.map((result, index) => (
                <ListItemButton
                  key={`${result.id || result.toyName || 'item'}-${index}`}
                  onClick={() => handleToyResultSelect(result)}
                  sx={{ gap: 1.5 }}
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
                    {result.toyPicUrl ? (
                      <Box
                        component="img"
                        src={result.toyPicUrl}
                        alt={result.toyName || '玩具'}
                        sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        loading="lazy"
                      />
                    ) : (
                      <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: '#e2e8f0' }} />
                    )}
                  </Box>
                  <ListItemText
                    primary={result.toyName || '未命名玩具'}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}
                    secondaryTypographyProps={{ display: 'none' }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : hasSearched ? (
            <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              暂无搜索结果
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

export default SearchPage
