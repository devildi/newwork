export const APP_TITLE = 'NextSticker'

export const FEATURE_ITEMS = [
  '我的行程',
  '我的玩具',
  '录入',
  '照片',
  '编辑',
  '瀑布流',
  '设计',
  '行程',
  '图片',
] as const

export const HOME_NAVIGATION: Record<string, string> = {
  我的行程: '/list',
  我的玩具: '/toies',
  录入: '/photosInput',
  照片: '/photos',
  瀑布流: '/waterfall',
  编辑: '/story',
  设计: '/edit',
  行程: '/alltrips',
  图片: '/preview',
}

export const PREVIEW_PAGE_SIZE = 24
export const PHOTOS_FALLBACK_PAGE_SIZE = 24
export const WATERFALL_FALLBACK_PAGE_SIZE = 14
export const ALL_TRIPS_FALLBACK_PAGE_SIZE = 10

export const AUTH_BACKGROUND_VIDEO =
  'https://cdn.moji.com/websrc/video/video621.mp4'
