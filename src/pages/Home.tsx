import type { ReactElement } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import { useNavigate } from 'react-router-dom'

import { FEATURE_ITEMS, HOME_NAVIGATION } from '../constants/app.ts'

const Home = () => {
  const navigate = useNavigate()

  const cardSx = {
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
  } as const

  const mergedGroups = [
    { key: '录入-照片', labels: ['录入', '照片'] as const },
    { key: '编辑-瀑布流', labels: ['编辑', '瀑布流'] as const },
    { key: '设计-行程-图片', labels: ['设计', '行程', '图片'] as const },
  ] as const

  const findMergedGroup = (startIndex: number) =>
    mergedGroups.find((group) =>
      group.labels.every(
        (label, offset) => FEATURE_ITEMS[startIndex + offset] === label,
      ),
    )

  const cards: ReactElement[] = []

  for (let i = 0; i < FEATURE_ITEMS.length; ) {
    const mergedGroup = findMergedGroup(i)

    if (mergedGroup) {
      cards.push(
        <Grid
          key={mergedGroup.key}
          size={{ xs: 12, sm: 6, md: 4 }}
          sx={{ display: 'flex' }}
        >
          <Paper elevation={3} sx={cardSx}>
            <Box
              sx={{
                display: 'grid',
                width: '100%',
                flex: 1,
                gap: 2,
                gridTemplateColumns: `repeat(${mergedGroup.labels.length}, minmax(0, 1fr))`,
              }}
            >
              {mergedGroup.labels.map((mergedLabel) => (
                <ButtonBase
                  key={mergedLabel}
                  focusRipple
                  onClick={() => navigate(HOME_NAVIGATION[mergedLabel])}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                    py: 3,
                    whiteSpace: 'nowrap',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {mergedLabel}
                </ButtonBase>
              ))}
            </Box>
          </Paper>
        </Grid>,
      )
      i += mergedGroup.labels.length
      continue
    }

    const label = FEATURE_ITEMS[i]
    const route = HOME_NAVIGATION[label]
    const card = (
      <Paper elevation={3} sx={cardSx}>
        {label}
      </Paper>
    )

    cards.push(
      <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
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
      </Grid>,
    )
    i += 1
  }

  return (
    <Grid container spacing={3} sx={{ width: '100%' }}>
      {cards}
    </Grid>
  )
}

export default Home
