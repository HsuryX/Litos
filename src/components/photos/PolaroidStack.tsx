import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import type { Photo } from '~/types'
import { cn } from '~/lib/utils'
import PolaroidCard from './PolaroidCard'
import PhotoGalleryModal from './PhotoGalleryModal'

interface Props {
  photos: Photo[]
  title: string
  description?: string
  className?: string
}

// 生成随机旋转角度
const generateRotations = (count: number) => Array.from({ length: count }, () => Math.random() * 20 - 10)

export default function PolaroidStack({ photos, title, description, className }: Props) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [shouldRenderModal, setShouldRenderModal] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [clickedPhotoIndex, setClickedPhotoIndex] = useState<number | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  // 为每张照片生成固定的旋转角度
  const photoRotations = useMemo(() => generateRotations(photos.length), [photos.length])

  const handlePhotoClick = (index: number) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }

    setShouldRenderModal(true)
    setClickedPhotoIndex(index)
    setSelectedPhotoIndex(index)

    openTimerRef.current = window.setTimeout(() => {
      setIsModalOpen(true)
      openTimerRef.current = null
    }, 50)
  }

  const handleModalClose = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }

    setIsModalOpen(false)

    closeTimerRef.current = window.setTimeout(() => {
      setClickedPhotoIndex(null)
      setShouldRenderModal(false)
      closeTimerRef.current = null
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current)
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  return (
    <>
      <motion.div ref={ref} className={cn('relative perspective-1000 ml-4 flex flex-wrap items-center ', className)}>
        {photos.map((photo, index) => (
          <div key={typeof photo.src === 'string' ? photo.src : photo.src.src} onClick={() => handlePhotoClick(index)}>
            <PolaroidCard
              photo={photo}
              index={index}
              totalPhotos={photos.length}
              rotation={photoRotations[index]}
              variant={photo.variant}
              isVisible={isInView}
              isClicked={clickedPhotoIndex === index}
            />
          </div>
        ))}
      </motion.div>

      {shouldRenderModal && (
        <PhotoGalleryModal
          photos={photos}
          title={title}
          description={description}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          initialIndex={selectedPhotoIndex}
        />
      )}
    </>
  )
}
