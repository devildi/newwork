type InfoWindowParams = {
  title?: string
  description?: string
  imageUrl?: string
  onDelete?: () => void
  actionType?: 'add' | 'delete'
  onInfoWindowClick?: () => void
}

const createInfoWindowContent = (item: InfoWindowParams) => {
  const container = document.createElement('div')
  container.style.width = '240px'
  container.style.maxWidth = '240px'
  container.style.background = '#fff'
  container.style.borderRadius = '10px'
  container.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.18)'
  container.style.padding = '12px'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.gap = '8px'
  container.style.boxSizing = 'border-box'
  container.style.fontSize = '13px'
  container.style.color = '#1f2937'
  container.style.pointerEvents = 'auto'
  container.style.cursor = 'pointer'

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.justifyContent = 'space-between'
  header.style.alignItems = 'center'

  const title = document.createElement('div')
  title.textContent = item.title || '未命名地点'
  title.style.fontWeight = '600'
  title.style.fontSize = '14px'
  title.style.color = '#111827'
  title.style.flexGrow = '1'
  header.appendChild(title)

  const actionButton = document.createElement('span')
  const isAdd = item.actionType === 'add'
  actionButton.textContent = isAdd ? '+' : '×'
  actionButton.style.cursor = 'pointer'
  actionButton.style.fontSize = isAdd ? '18px' : '16px'
  actionButton.style.lineHeight = isAdd ? '18px' : '16px'
  actionButton.style.color = isAdd ? '#22c55e' : '#ef4444'
  actionButton.style.fontWeight = '700'
  actionButton.title = isAdd ? '添加' : '删除'
  actionButton.onclick = (event) => {
    event.stopPropagation()
    if (typeof item.onDelete === 'function') {
      item.onDelete()
    }
  }
  header.appendChild(actionButton)

  container.appendChild(header)

  container.addEventListener('click', (event) => {
    event.stopPropagation()
    if (typeof item.onInfoWindowClick === 'function') {
      item.onInfoWindowClick()
    }
  })

  if (item.description) {
    const description = document.createElement('div')
    description.textContent = item.description
    description.style.color = '#4b5563'
    description.style.lineHeight = '1.4'
    container.appendChild(description)
  }

  if (item.imageUrl) {
    const imageWrapper = document.createElement('div')
    imageWrapper.style.width = '100%'
    imageWrapper.style.borderRadius = '8px'
    imageWrapper.style.overflow = 'hidden'
    imageWrapper.style.background = '#f3f4f6'

    const image = document.createElement('img')
    image.src = item.imageUrl
    image.alt = item.title || '预览图片'
    image.style.display = 'block'
    image.style.width = '100%'
    image.style.height = 'auto'

    imageWrapper.appendChild(image)
    container.appendChild(imageWrapper)
  }

  return container
}

export type { InfoWindowParams }
export { createInfoWindowContent }

