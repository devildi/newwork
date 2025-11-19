import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Outlet } from 'react-router-dom'

import './App.css'
import { APP_TITLE } from './constants/app.ts'
import AppFooter from './components/AppFooter.tsx'
import { useAppSelector } from './app/hooks.ts'
import { useAppDispatch } from './app/hooks.ts'
import { setUserName } from './features/auth/authSlice.ts'
import { clearStoredUser } from './utils/authStorage.ts'

function App() {
  const userName = useAppSelector((state) => state.auth.userName)
  const dispatch = useAppDispatch()
  const handleLogout = () => {
    clearStoredUser()
    dispatch(setUserName(null))
  }

  return (
    <>
      <CssBaseline />
      <Box className="app">
        <Stack sx={{ minHeight: '100vh' }}>
          <AppBar position="fixed" elevation={2}>
            <Toolbar
              sx={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {userName ? (
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}
                  >
                    欢迎你，{userName}
                  </Typography>
                ) : null}
              </Box>
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 600, textAlign: 'center' }}
              >
                {APP_TITLE}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  color="inherit"
                  onClick={handleLogout}
                  sx={{
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2,
                  }}
                >
                  登出
                </Button>
              </Box>
            </Toolbar>
          </AppBar>
          <Toolbar />

          <Container
            maxWidth="md"
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              py: 3,
            }}
          >
            <Outlet />
          </Container>

          <AppFooter />
        </Stack>
      </Box>
    </>
  )
}

export default App
