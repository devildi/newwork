import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import AppFooter from '../components/AppFooter.tsx'
import { AUTH_BACKGROUND_VIDEO } from '../constants/app.ts'
import { useAppDispatch, useAppSelector } from '../app/hooks.ts'
import { setAuthMode, setUserName } from '../features/auth/authSlice.ts'
import AuthErrorAlert from '../components/AuthErrorAlert.tsx'
import { clearStoredUser, persistUser } from '../utils/authStorage.ts'

const SignIn = () => {
  const dispatch = useAppDispatch()
  const authMode = useAppSelector((state) => state.auth.mode)
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({ name: '', password: '' })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    dispatch(setAuthMode('signin'))
  }, [dispatch])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  useEffect(() => {
    if (!errorMessage) return

    const timer = window.setTimeout(() => {
      setErrorMessage(null)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [errorMessage])

  const handleChange = (field: 'name' | 'password') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formValues.name.trim()
    const password = formValues.password
    setErrorMessage(null)

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          password,
        }),
      })

      const text = await response.text()
      let payload: unknown
      try {
        payload = text ? JSON.parse(text) : null
      } catch (error) {
        payload = text
      }
      const hasPayload = (() => {
        if (payload === null || payload === undefined) return false
        if (typeof payload === 'string') return payload.trim().length > 0
        if (typeof payload === 'object')
          return Object.keys(payload as Record<string, unknown>).length > 0
        return true
      })()

      if (response.ok && hasPayload) {
        const resolvedName = (() => {
          if (payload && typeof payload === 'object' && payload !== null) {
            const name = (payload as Record<string, unknown>).name
            if (typeof name === 'string' && name.trim()) {
              return name.trim()
            }
          }
          if (typeof payload === 'string' && payload.trim()) {
            return payload.trim()
          }
          return trimmedName
        })()

        const userObject =
          payload && typeof payload === 'object' && payload !== null
            ? (payload as Record<string, unknown>)
            : { name: resolvedName }
        dispatch(setUserName(resolvedName))
        persistUser(userObject)
        setErrorMessage(null)
        navigate('/')
      } else {
        dispatch(setUserName(null))
        clearStoredUser()
        const message =
          typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as Record<string, unknown>).message ?? '')
            : typeof payload === 'string'
              ? payload
              : ''
        setErrorMessage(message.trim() || '登录失败，请检查用户名或密码。')
      }
    } catch (error) {
      console.error('Login request failed:', error)
      dispatch(setUserName(null))
      clearStoredUser()
      setErrorMessage('登录请求失败，请稍后重试。')
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '100svh', md: '100vh' },
        height: { xs: '100svh', md: '100vh' },
        overflow: 'hidden',
        color: '#ffffff',
      }}
    >
    <Box
      component="video"
      autoPlay
      muted
      loop
      playsInline
      src={AUTH_BACKGROUND_VIDEO}
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
      }}
    />

    <Stack
      sx={{
        position: 'relative',
        zIndex: 1,
        minHeight: { xs: '100svh', md: '100vh' },
        height: { xs: '100svh', md: '100vh' },
        px: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          aria-label={`auth-${authMode}`}
          elevation={6}
          sx={{
            maxWidth: 400,
            width: '100%',
            p: { xs: 3, sm: 5 },
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(12, 21, 31, 0.6)',
          }}
        >
          <Stack
            spacing={3}
            component="form"
            onSubmit={handleSubmit}
            noValidate
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}
              >
                欢迎回来
              </Typography>
              <Button
                component={RouterLink}
                to="/logon"
                variant="text"
                size="medium"
                sx={{
                  color: 'rgba(255,255,255,0.75)',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 1,
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                }}
              >
                去注册
              </Button>
            </Box>
            <Typography variant="body2" color="rgba(255,255,255,0.75)">
              登录 NextSticker 继续管理照片与行程。
            </Typography>
            {errorMessage ? <AuthErrorAlert message={errorMessage} /> : null}
            <Stack spacing={0}>
              <TextField
                label="用户名"
                type="text"
                size="medium"
                variant="filled"
                name="name"
                value={formValues.name}
                onChange={handleChange('name')}
                InputProps={{ disableUnderline: true }}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  '& .MuiFilledInput-root': {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                }}
              />
              <TextField
                label="密码"
                type="password"
                size="small"
                variant="filled"
                name="password"
                value={formValues.password}
                onChange={handleChange('password')}
                InputProps={{ disableUnderline: true }}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  '& .MuiFilledInput-root': {
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                  },
                }}
              />
            </Stack>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ borderRadius: 999, py: { xs: 1, sm: 1.5 }, fontWeight: 600 }}
            >
              登录
            </Button>
          </Stack>
        </Paper>
      </Box>

      <AppFooter
        color="rgba(255,255,255,0.8)"
        sx={{ position: 'relative', zIndex: 1, width: '100%' }}
      />
    </Stack>
  </Box>
  )
}

export default SignIn
