import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Fab from '@mui/material/Fab'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import type { SearchResult } from '../components/GaodeMap.tsx'
import { preloadGaodeMap } from '../utils/amapLoader.ts'
import { preloadGoogleMap } from '../utils/googleMapsLoader.ts'
import { GAODE_MAP_API_KEY, GOOGLE_MAP_API_KEY } from '../constants/map.ts'

const SearchPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as {
    mapProvider?: 'gaode' | 'google'
    from?: string
    backgroundLocation?: Location
  }
  const mapProvider = state.mapProvider
  const cameFromOverlay = Boolean(state.backgroundLocation)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearchAttempt, setHasSearchAttempt] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fallbackPath = useMemo(() => {
    if (typeof state.from === 'string' && state.from.length > 0) return state.from
    return '/edit'
  }, [state.from])

  const exitSearch = useCallback(() => {
    if (cameFromOverlay) {
      navigate(-1)
    } else {
      navigate(fallbackPath, { replace: true })
    }
  }, [cameFromOverlay, fallbackPath, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 120)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (mapProvider === 'gaode') {
      void preloadGaodeMap(GAODE_MAP_API_KEY)
    } else if (mapProvider === 'google') {
      void preloadGoogleMap(GOOGLE_MAP_API_KEY)
    }
  }, [mapProvider])

  const performSearch = useCallback(async () => {
    const keyword = searchValue.trim()
    inputRef.current?.blur()
    if (!keyword || !mapProvider) {
      setSearchResults([])
      setIsSearching(false)
      setHasSearchAttempt(false)
      return
    }
    setHasSearchAttempt(true)
    setIsSearching(true)
    try {
      if (mapProvider === 'gaode') {
        const AMap = await preloadGaodeMap(GAODE_MAP_API_KEY)
        const placeSearch = new AMap.PlaceSearch({ city: '全国', pageSize: 5 })
        placeSearch.search(keyword, (status: string, result: any) => {
          if (status !== 'complete' || !result?.poiList?.pois) {
            setSearchResults([])
            setIsSearching(false)
            return
          }
          const list: SearchResult[] = result.poiList.pois
            .filter((poi: any) => Array.isArray(poi.location?.lnglat) || poi.location)
            .slice(0, 5)
            .map((poi: any) => {
              const location = poi.location?.lnglat ?? [poi.location?.lng, poi.location?.lat]
              return {
                name: poi.name ?? '未知地点',
                location: [
                  Number(location?.[0]) || 0,
                  Number(location?.[1]) || 0,
                ] as [number, number],
                address: poi.address ?? poi.cityname ?? '',
              }
            })
          setSearchResults(list)
          setIsSearching(false)
        })
      } else if (mapProvider === 'google') {
        const { PlacesService, PlacesServiceStatus } =
          (await google.maps.importLibrary('places')) as { PlacesService: any; PlacesServiceStatus: any }
        const placesService = new PlacesService(document.createElement('div'))
        placesService.textSearch({ query: keyword }, (results: any, status: string) => {
          if (status !== PlacesServiceStatus.OK || !results) {
            setSearchResults([])
            setIsSearching(false)
            return
          }
          const list: SearchResult[] = results
            .filter((place: any) => place.geometry?.location)
            .slice(0, 5)
            .map((place: any) => {
              const location = place.geometry!.location
              return {
                name: place.name ?? '未知地点',
                location: [location.lng(), location.lat()] as [number, number],
                address: place.formatted_address ?? place.vicinity ?? '',
              }
            })
          setSearchResults(list)
          setIsSearching(false)
        })
      }
    } catch (error) {
      console.error('搜索失败：', error)
      setIsSearching(false)
      setHasSearchAttempt(false)
    }
  }, [mapProvider, searchValue])

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      inputRef.current?.blur()
      window.dispatchEvent(new CustomEvent<SearchResult>('trip-search-select', { detail: result }))
      exitSearch()
    },
    [exitSearch],
  )

  const handleClear = () => {
    setSearchResults([])
    setSearchValue('')
    setIsSearching(false)
    setHasSearchAttempt(false)
    inputRef.current?.focus()
  }

  const handleSubmit = () => {
    if (!mapProvider) return
    void performSearch()
  }

  const disabled = !mapProvider

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        minHeight: '100vh',
        backgroundColor: '#f4f6fb',
        display: 'flex',
        flexDirection: 'column',
        pt: 2,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ px: 2 }}>
        <TextField
          inputRef={inputRef}
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value)
            setHasSearchAttempt(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            } else if (event.key === 'Escape') {
              exitSearch()
            }
          }}
          placeholder={disabled ? '请先选择地图服务' : '请输入关键字'}
          disabled={disabled}
          autoFocus
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: (
              <IconButton color="primary" onClick={handleSubmit} disabled={disabled}>
                <SearchIcon />
              </IconButton>
            ),
            sx: {
              height: 56,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              paddingRight: 1,
              border: '1px solid rgba(15, 23, 42, 0.1)',
              backgroundColor: '#fff',
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
            <List>
              <ListItem>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <ListItemText primary="搜索中..." primaryTypographyProps={{ fontSize: 14 }} />
              </ListItem>
            </List>
          ) : searchResults.length > 0 ? (
            <List>
              {searchResults.map((result, index) => (
                <ListItemButton key={`${result.name}-${index}`} onClick={() => handleResultSelect(result)}>
                  <ListItemText
                    primary={result.name}
                    secondary={result.address}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }}
                    secondaryTypographyProps={{ fontSize: 13, color: '#6b7280' }}
                  />
                </ListItemButton>
              ))}
              <ListItemButton onClick={handleClear}>
                <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                <ListItemText primary="清除搜索结果" primaryTypographyProps={{ fontSize: 13 }} />
              </ListItemButton>
            </List>
          ) : hasSearchAttempt ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center' }}>
                未找到相关地点，请尝试其他关键字
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center' }}>
                输入关键字开始搜索
              </Typography>
            </Box>
          )}
        </Paper>
        {!mapProvider ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            请返回并选择地图服务后再进行搜索。
          </Alert>
        ) : null}
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
