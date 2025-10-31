import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import type { SxProps, Theme } from '@mui/material/styles'

type PageSwitcherProps = {
  onPrev?: () => void
  onNext?: () => void
  disablePrev?: boolean
  disableNext?: boolean
  sx?: SxProps<Theme>
}

const PageSwitcher = ({
  onPrev,
  onNext,
  disablePrev = false,
  disableNext = false,
  sx,
}: PageSwitcherProps) => (
  <Box
    sx={{
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 2,
      ...sx,
    }}
  >
    <Button
      variant="outlined"
      onClick={onPrev}
      disabled={disablePrev}
      sx={{ minWidth: 120, textTransform: 'none', fontWeight: 600 }}
    >
      上一页
    </Button>
    <Button
      variant="contained"
      onClick={onNext}
      disabled={disableNext}
      sx={{ minWidth: 120, textTransform: 'none', fontWeight: 600 }}
    >
      下一页
    </Button>
  </Box>
)

export default PageSwitcher
