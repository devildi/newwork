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

const Logon = () => {
  const dispatch = useAppDispatch()
  const authMode = useAppSelector((state) => state.auth.mode)
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    name: '',
    password: '',
    auth: '',
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    dispatch(setAuthMode('logon'))
  }, [dispatch])

  useEffect(() => {
    if (!errorMessage) return

    const timer = window.setTimeout(() => {
      setErrorMessage(null)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [errorMessage])

  const handleChange =
    (field: 'name' | 'password' | 'auth') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formValues.name.trim()
    const password = formValues.password
    const auth = formValues.auth.trim()
    setErrorMessage(null)

    try {
      const response = await fetch('http://localhost:4000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          password,
          auth,
        }),
      })

      const text = await response.text()
      let payload: unknown
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = text
      }

      if (typeof payload === 'string') {
        const message = payload.trim()
        dispatch(setUserName(null))
        setErrorMessage(message || '注册失败，请稍后重试。')
        return
      }

      if (payload && typeof payload === 'object') {
        const userRecord = payload as Record<string, unknown>
        const nameValue = (() => {
          const candidate = userRecord.name
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim()
          }
          return trimmedName
        })()
        dispatch(setUserName(nameValue))
        setErrorMessage(null)
        navigate('/')
        return
      }

      dispatch(setUserName(null))
      setErrorMessage('注册失败，请稍后重试。')
    } catch (error) {
      console.error('Register request failed:', error)
      dispatch(setUserName(null))
      setErrorMessage('注册请求失败，请稍后重试。')
    }
  }

  return (
    <Box
    sx={{
      position: 'relative',
      minHeight: '100vh',
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
        minHeight: '100vh',
        px: 2,
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
            p: 5,
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
                创建账号
              </Typography>
              <Button
                component={RouterLink}
                to="/signin"
                variant="text"
                size="small"
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
                去登录
              </Button>
            </Box>
            <Typography variant="body2" color="rgba(255,255,255,0.75)">
              注册 NextSticker，开启高效管理体验。
            </Typography>
            {errorMessage ? <AuthErrorAlert message={errorMessage} /> : null}
            <Stack spacing={0}>
              <TextField
                label="用户名"
                type="text"
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
                variant="filled"
                name="password"
                value={formValues.password}
                onChange={handleChange('password')}
                InputProps={{ disableUnderline: true }}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 0,
                  '& .MuiFilledInput-root': {
                    borderRadius: 0,
                  },
                }}
              />
              <TextField
                label="授权码"
                type="text"
                variant="filled"
                name="auth"
                value={formValues.auth}
                onChange={handleChange('auth')}
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
              sx={{ borderRadius: 999, py: 1.5, fontWeight: 600 }}
            >
              注册
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

export default Logon
