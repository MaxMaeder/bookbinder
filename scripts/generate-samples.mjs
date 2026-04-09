import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { writeFileSync } from "fs"

async function createSample(pageCount, filename) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([612, 792]) // US Letter portrait
    const { width, height } = page.getSize()

    // Border
    page.drawRectangle({
      x: 36, y: 36, width: width - 72, height: height - 72,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    })

    // Page number
    const pageText = `Page ${i}`
    const textWidth = boldFont.widthOfTextAtSize(pageText, 48)
    page.drawText(pageText, {
      x: (width - textWidth) / 2,
      y: height / 2 + 40,
      size: 48,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.3),
    })

    // Subtitle
    const subtitle = `Sample Document — ${pageCount} pages`
    const subWidth = font.widthOfTextAtSize(subtitle, 14)
    page.drawText(subtitle, {
      x: (width - subWidth) / 2,
      y: height / 2 - 10,
      size: 14,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Some body text to make it look like a real page
    const lines = [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
      "Duis aute irure dolor in reprehenderit in voluptate velit.",
    ]
    for (let l = 0; l < lines.length; l++) {
      page.drawText(lines[l], {
        x: 72,
        y: height / 2 - 60 - l * 20,
        size: 11,
        font,
        color: rgb(0.35, 0.35, 0.35),
      })
    }
  }

  const bytes = await doc.save({ useObjectStreams: false })
  writeFileSync(filename, bytes)
  console.log(`Created ${filename} (${pageCount} pages, ${bytes.length} bytes)`)
}

await createSample(4, "public/samples/sample-short.pdf")
await createSample(16, "public/samples/sample-long.pdf")
