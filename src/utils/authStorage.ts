const AUTH_USER_KEY = 'nextsticker_auth_user'

type StoredUser =
  | {
      _id?: string
      name?: string
      [key: string]: unknown
    }
  | null

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const parseStoredUser = (value: string | null): StoredUser => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return parsed as StoredUser
    }
    if (typeof parsed === 'string' && parsed.trim()) {
      return { name: parsed.trim() }
    }
  } catch {
    if (value.trim()) {
      return { name: value.trim() }
    }
  }
  return null
}

export const getStoredUser = (): StoredUser => {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    const stored = storage.getItem(AUTH_USER_KEY)
    return parseStoredUser(stored)
  } catch (error) {
    console.error('Failed to read auth info from storage:', error)
    return null
  }
}

export const getStoredUserName = (): string | null => {
  const stored = getStoredUser()
  const name = stored && typeof stored === 'object' ? stored.name : null
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export const persistUser = (user: StoredUser) => {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? null))
  } catch (error) {
    console.error('Failed to persist login info:', error)
  }
}

export const clearStoredUser = () => {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    storage.removeItem(AUTH_USER_KEY)
  } catch (error) {
    console.error('Failed to clear login info:', error)
  }
}
