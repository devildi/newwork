import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import SignIn from './pages/SignIn.tsx'
import Logon from './pages/Logon.tsx'
import PhotosInput from './pages/PhotosInput.tsx'
import Story from './pages/Story.tsx'
import Photos from './pages/Photos.tsx'
import WaterfallData from './pages/WaterfallData.tsx'
import AllTrips from './pages/AllTrips.tsx'
import MyTrips from './pages/MyTrips.tsx'
import TripShow from './pages/TripShow.tsx'
import EditTrips from './pages/EditTrips.tsx'
import Toies from './pages/Toies.tsx'
import Toy from './pages/Toy.tsx'
import Preview from './pages/Preview.tsx'
import ProtectedLayout from './layouts/ProtectedLayout.tsx'
import { store } from './app/store.ts'
import { preloadGaodeMap } from './utils/amapLoader.ts'
import Search from './pages/Search.tsx'
import AddToy from './pages/AddToy.tsx'
import SearchTrips from './pages/SearchTrips.tsx'

preloadGaodeMap('fbe59813637de60223e3d22805a2486c')

const AppRoutes = () => {
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | undefined
  const backgroundLocation = state?.backgroundLocation

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
          </Route>
          <Route path="/photos" element={<Photos />} />
          <Route path="/photosInput" element={<PhotosInput />} />
          <Route path="/waterfall" element={<WaterfallData />} />
          <Route path="/alltrips" element={<AllTrips />} />
          <Route path="/list" element={<MyTrips />} />
          <Route path="/show" element={<TripShow />} />
          <Route path="/searchTrips" element={<SearchTrips />} />
          <Route path="/edit" element={<EditTrips />} />
          <Route path="/toies" element={<Toies />} />
          <Route path="/toy" element={<Toy />} />
          <Route path="/addToy" element={<AddToy />} />
          <Route path="/search" element={<Search />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/story" element={<Story />} />
        </Route>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/logon" element={<Logon />} />
      </Routes>
      {backgroundLocation ? (
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      ) : null}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
