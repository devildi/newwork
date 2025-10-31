import ButtonBase from '@mui/material/ButtonBase'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import { useNavigate } from 'react-router-dom'

import { FEATURE_ITEMS, HOME_NAVIGATION } from '../constants/app.ts'

const Home = () => {
  const navigate = useNavigate()

  return (
    <Grid container spacing={3} sx={{ width: '100%' }}>
      {FEATURE_ITEMS.map((label) => {
        const route = HOME_NAVIGATION[label]
        const card = (
          <Paper
            elevation={3}
            sx={{
              borderRadius: 3,
              p: 3,
              width: '100%',
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: 500,
            }}
          >
            {label}
          </Paper>
        )

        return (
          <Grid
            key={label}
            size={{ xs: 12, sm: 6, md: 4 }}
            sx={{ display: 'flex' }}
          >
            {route ? (
              <ButtonBase
                onClick={() => navigate(route)}
                focusRipple
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  display: 'flex',
                }}
              >
                {card}
              </ButtonBase>
            ) : (
              card
            )}
          </Grid>
        )
      })}
    </Grid>
  )
}

export default Home
