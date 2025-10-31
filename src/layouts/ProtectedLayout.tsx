import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAppSelector } from '../app/hooks.ts'

const ProtectedLayout = () => {
  const userName = useAppSelector((state) => state.auth.userName)
  const location = useLocation()

  if (!userName) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedLayout
