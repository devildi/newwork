import Typography from '@mui/material/Typography'

type AuthErrorAlertProps = {
  message: string
}

const AuthErrorAlert = ({ message }: AuthErrorAlertProps) => (
  <Typography variant="body2" color="#ffb4ab">
    {message}
  </Typography>
)

export default AuthErrorAlert
