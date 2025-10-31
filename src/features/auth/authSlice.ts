import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AuthMode = 'signin' | 'logon'

type AuthState = {
  mode: AuthMode
  userName: string | null
}

const initialState: AuthState = {
  mode: 'signin',
  userName: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthMode: (state, action: PayloadAction<AuthMode>) => {
      state.mode = action.payload
    },
    setUserName: (state, action: PayloadAction<string | null>) => {
      state.userName = action.payload
    },
  },
})

export const { setAuthMode, setUserName } = authSlice.actions

export default authSlice.reducer
