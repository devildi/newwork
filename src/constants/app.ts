export const APP_TITLE = 'NextSticker'

export const FEATURE_ITEMS = [
  '照片录入',
  '所有照片',
  '瀑布流数据',
  '编辑瀑布流',
  '行程设计',
  '图片预览',
  '行程列表',
] as const

export const HOME_NAVIGATION: Record<string, string> = {
  照片录入: '/photosInput',
  所有照片: '/photos',
  瀑布流数据: '/waterfall',
  行程列表: '/alltrips',
  编辑瀑布流: '/story',
  行程设计: '/edit',
  图片预览: '/preview',
}

export const PREVIEW_PAGE_SIZE = 24
export const PHOTOS_FALLBACK_PAGE_SIZE = 24
export const WATERFALL_FALLBACK_PAGE_SIZE = 14
export const ALL_TRIPS_FALLBACK_PAGE_SIZE = 10

export const AUTH_BACKGROUND_VIDEO =
  'https://cdn.moji.com/websrc/video/video621.mp4'
