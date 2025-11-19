declare module 'qiniu-js' {
  export function upload(...args: any[]): any
  export const region: any
  export function compressImage(
    file: File,
    options?: {
      quality?: number
      maxWidth?: number
      maxHeight?: number
      noCompressIfLarger?: boolean
    },
  ): Promise<{
    dist: Blob | File
    width?: number
    height?: number
  }>
}
