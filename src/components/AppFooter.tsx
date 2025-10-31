import Box from '@mui/material/Box'
import Typography, { type TypographyProps } from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

type AppFooterProps = {
  color?: TypographyProps['color']
  sx?: SxProps<Theme>
}

const AppFooter = ({ color = 'text.secondary', sx }: AppFooterProps) => (
  <Box component="footer" sx={{ py: '1px', mt: 'auto', ...sx }}>
    <Typography
      variant="body2"
      align="center"
      color={color}
      sx={{ fontWeight: 500 }}
    >
      Copyright @ DevilDI {new Date().getFullYear()}
    </Typography>
  </Box>
)

export default AppFooter
