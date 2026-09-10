import {
  concatTransformationMatrix,
  degrees,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from 'pdf-lib'
import type { PDFPage } from 'pdf-lib'
import type { Stamp } from '@/store/useStore'

type PageRotation = 0 | 90 | 180 | 270

interface PageLayout {
  visibleWidth: number
  visibleHeight: number
  transform: [number, number, number, number, number, number]
}

function normalizePageRotation(angle: number): PageRotation {
  const normalized = ((angle % 360) + 360) % 360
  return normalized === 90 || normalized === 180 || normalized === 270
    ? normalized
    : 0
}

/**
 * Builds a coordinate system matching PDF.js' rendered viewport. Stamps are
 * authored in that visible coordinate system, while pdf-lib writes into the
 * page's unrotated PDF coordinate system.
 */
function getPageLayout(page: PDFPage): PageLayout {
  const { x, y, width, height } = page.getCropBox()
  const rotation = normalizePageRotation(page.getRotation().angle)

  switch (rotation) {
    case 90:
      return {
        visibleWidth: height,
        visibleHeight: width,
        transform: [0, 1, -1, 0, x + width, y],
      }
    case 180:
      return {
        visibleWidth: width,
        visibleHeight: height,
        transform: [-1, 0, 0, -1, x + width, y + height],
      }
    case 270:
      return {
        visibleWidth: height,
        visibleHeight: width,
        transform: [0, -1, 1, 0, x, y + height],
      }
    default:
      return {
        visibleWidth: width,
        visibleHeight: height,
        transform: [1, 0, 0, 1, x, y],
      }
  }
}

export async function exportPdf(
  originalFile: File,
  stamps: Stamp[],
  pageImages: string[]
): Promise<Blob> {
  const originalBytes = await originalFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes)
  const pages = pdfDoc.getPages()

  for (const stamp of stamps) {
    const page = pages[stamp.pageIndex]
    if (!page) continue

    const { visibleWidth, visibleHeight, transform } = getPageLayout(page)

    // Get the rendered image dimensions to calculate scale
    const img = new Image()
    img.src = pageImages[stamp.pageIndex]
    await new Promise((resolve) => {
      img.onload = resolve
    })

    const imageWidth = img.naturalWidth || img.width
    const imageHeight = img.naturalHeight || img.height

    if (imageWidth === 0 || imageHeight === 0) continue

    // Position is mapped independently to absorb integer canvas rounding. Size
    // uses one scale so images and shapes cannot be stretched on rotated pages.
    const scaleX = visibleWidth / imageWidth
    const scaleY = visibleHeight / imageHeight
    const sizeScale = Math.sqrt(scaleX * scaleY)

    const pdfWidth = stamp.width * sizeScale
    const pdfHeight = stamp.height * sizeScale
    const centerX = (stamp.x + stamp.width / 2) * scaleX
    const centerY = visibleHeight - (stamp.y + stamp.height / 2) * scaleY
    const pdfX = centerX - pdfWidth / 2
    const pdfY = centerY - pdfHeight / 2

    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(...transform)
    )

    try {
      if (stamp.type === 'signature' || stamp.type === 'seal') {
        // Embed signatures and seals as transparent PNG images.
        const imageData = stamp.content.split(',')[1]
        const imageBytes = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0))
        const pngImage = await pdfDoc.embedPng(imageBytes)

        const rotation = stamp.type === 'seal' ? stamp.rotation ?? 0 : 0
        const pdfRotation = -rotation * Math.PI / 180
        const rotatedCenterOffsetX = pdfWidth / 2 * Math.cos(pdfRotation) - pdfHeight / 2 * Math.sin(pdfRotation)
        const rotatedCenterOffsetY = pdfWidth / 2 * Math.sin(pdfRotation) + pdfHeight / 2 * Math.cos(pdfRotation)

        page.drawImage(pngImage, {
          x: centerX - rotatedCenterOffsetX,
          y: centerY - rotatedCenterOffsetY,
          width: pdfWidth,
          height: pdfHeight,
          rotate: degrees(-rotation),
        })
      } else if (stamp.type === 'text' || stamp.type === 'date') {
        // Draw text
        const fontSize = Math.min(pdfHeight * 0.7, stamp.type === 'date' ? 12 : 16)
        page.drawText(stamp.content, {
          x: pdfX,
          y: pdfY + pdfHeight * 0.3,
          size: fontSize,
        })
      } else if (stamp.type === 'checkmark') {
        // Center the shape within the stamp bounds
        const size = Math.min(pdfWidth, pdfHeight)
        const shapeSize = size * 0.55  // Match the visual size of the Unicode character
        const offsetX = pdfX + (pdfWidth - shapeSize) / 2
        const offsetY = pdfY + (pdfHeight - shapeSize) / 2

        if (stamp.content === '■') {
          // Draw a filled black square
          page.drawRectangle({
            x: offsetX,
            y: offsetY,
            width: shapeSize,
            height: shapeSize,
            color: rgb(0, 0, 0),
          })
        } else {
          // Draw a checkmark using lines
          const left = offsetX
          const right = offsetX + shapeSize
          const top = offsetY + shapeSize
          const bottom = offsetY
          const midX = left + shapeSize * 0.35
          const midY = bottom + shapeSize * 0.3

          page.drawLine({
            start: { x: left, y: bottom + shapeSize * 0.5 },
            end: { x: midX, y: midY },
            thickness: size * 0.1,
            color: rgb(0, 0, 0),
          })
          page.drawLine({
            start: { x: midX, y: midY },
            end: { x: right, y: top },
            thickness: size * 0.1,
            color: rgb(0, 0, 0),
          })
        }
      }
    } finally {
      page.pushOperators(popGraphicsState())
    }
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
