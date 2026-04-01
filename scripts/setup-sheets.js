// Run this once to set up your Google Sheet structure
// In VS Code terminal: node scripts/setup-sheets.js

const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const CREDS = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'))

const auth = new google.auth.GoogleAuth({
  credentials: CREDS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const ACCOUNTS = [
  {
    handle: 'tesiakuh',
    platform: 'instagram',
    pillars: ['Trends', 'Events', 'Hobbies', 'Carousels'],
  },
  {
    handle: 'atetheplate_',
    platform: 'instagram',
    pillars: ['Recipes', 'Mukbang', 'Special Feature', 'Restaurant Highlight'],
  },
  {
    handle: 'atetheplate_',
    platform: 'tiktok',
    pillars: ['Recipes', 'Mukbang', 'Special Feature', 'Restaurant Highlight'],
  },
  {
    handle: 'zachforcontroller',
    platform: 'instagram',
    pillars: ["Where's the Audit", 'Foodie Content', 'Endorsements', 'Class is in Session', 'Get to Know Zach'],
  },
  {
    handle: 'zachforcontroller',
    platform: 'tiktok',
    pillars: ["Where's the Audit", 'Foodie Content', 'Endorsements', 'Class is in Session', 'Get to Know Zach'],
  },
]

const IG_HEADERS = ['Date', 'Content', 'Pillar', 'Views', 'Existing Reach', 'New Reach', 'Shares', 'Saves', 'Follows', 'Skip Rate %', 'Watch Time (s)', 'Length (s)', '% Watch Time', 'Post URL', 'Notes']
const TT_HEADERS = ['Date', 'Content', 'Pillar', 'Views', 'Likes', 'Comments', 'Saves']

const JADE = { red: 0.29, green: 0.62, blue: 0.54 }
const DARK = { red: 0.1, green: 0.1, blue: 0.18 }
const LIGHT_JADE = { red: 0.82, green: 0.93, blue: 0.91 }
const LIGHT_GRAY = { red: 0.96, green: 0.95, blue: 0.93 }
const WHITE = { red: 1, green: 1, blue: 1 }
const GOLD = { red: 0.79, green: 0.66, blue: 0.43 }

function color(c) {
  return { red: c.red, green: c.green, blue: c.blue }
}

async function setup() {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() })

  // Get existing sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingSheets = meta.data.sheets.map(s => s.properties.title)

  const requests = []

  // First add all account sheets
  const addRequests = []
  for (const acct of ACCOUNTS) {
    const pt = acct.platform === 'instagram' ? 'IG' : 'TT'
    const title = `@${acct.handle} (${pt})`
    if (!existingSheets.includes(title)) {
      addRequests.push({ addSheet: { properties: { title } } })
    }
  }

  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: addRequests },
    })
  }

  // Now delete Sheet1 if present (only after other sheets exist)
  if (existingSheets.includes('Sheet1')) {
    const sheet1 = meta.data.sheets.find(s => s.properties.title === 'Sheet1')
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] },
    })
  }

  // Re-fetch to get new sheet IDs
  const updated = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheetMap = {}
  for (const s of updated.data.sheets) {
    sheetMap[s.properties.title] = s.properties.sheetId
  }

  // Now populate each sheet
  for (const acct of ACCOUNTS) {
    const pt = acct.platform === 'instagram' ? 'IG' : 'TT'
    const tabName = `@${acct.handle} (${pt})`
    const sheetId = sheetMap[tabName]
    const isIG = acct.platform === 'instagram'
    const headers = isIG ? IG_HEADERS : TT_HEADERS
    const headerColor = acct.handle.includes('zach') ? DARK : JADE

    // Build all rows grouped by pillar
    const allRows = []
    // Title row
    allRows.push([`@${acct.handle} · ${acct.platform.toUpperCase()}`])

    // For each pillar: header, empty data rows, average row
    let currentRow = 2 // 1-indexed, row 1 = title
    const formatRequests = []

    // Title row formatting
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: color(headerColor),
            textFormat: { foregroundColor: color(WHITE), bold: true, fontSize: 13 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      }
    })

    // Column headers row
    allRows.push(headers)
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: color(LIGHT_JADE),
            textFormat: { foregroundColor: color(DARK), bold: true, fontSize: 10 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      }
    })

    currentRow = 3 // next row after headers (1-indexed = row 3)

    for (const pillar of acct.pillars) {
      const pillarStartRow = currentRow // 1-indexed

      // 5 empty data rows per pillar
      for (let i = 0; i < 5; i++) {
        if (isIG) {
          // % Watch Time formula in column M (index 12)
          const r = currentRow
          allRows.push(['', '', pillar, '', '', '', '', '', '', '', '', '', `=IFERROR(K${r}/L${r}*100,"")`, '', ''])
        } else {
          allRows.push(['', '', pillar, '', '', '', ''])
        }
        currentRow++
      }

      // Average row
      const dataStart = pillarStartRow
      const dataEnd = currentRow - 1

      if (isIG) {
        allRows.push([
          '', `=IFERROR(COUNTIF(C${dataStart}:C${dataEnd},"${pillar}")&" posts","")`,
          `✦ ${pillar} avg`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",D${dataStart}:D${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",E${dataStart}:E${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",F${dataStart}:F${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",G${dataStart}:G${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",H${dataStart}:H${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",I${dataStart}:I${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",J${dataStart}:J${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",K${dataStart}:K${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",L${dataStart}:L${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",M${dataStart}:M${dataEnd}),"")`,
          '', '',
        ])
      } else {
        allRows.push([
          '', `=IFERROR(COUNTIF(C${dataStart}:C${dataEnd},"${pillar}")&" posts","")`,
          `✦ ${pillar} avg`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",D${dataStart}:D${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",E${dataStart}:E${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",F${dataStart}:F${dataEnd}),"")`,
          `=IFERROR(AVERAGEIF(C${dataStart}:C${dataEnd},"${pillar}",G${dataStart}:G${dataEnd}),"")`,
        ])
      }

      // Format average row
      formatRequests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: currentRow - 1, endRowIndex: currentRow, startColumnIndex: 0, endColumnIndex: headers.length },
          cell: {
            userEnteredFormat: {
              backgroundColor: color(LIGHT_JADE),
              textFormat: { foregroundColor: color(DARK), bold: true, fontSize: 10 },
              horizontalAlignment: 'CENTER',
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        }
      })

      currentRow++

      // Spacer row
      allRows.push([])
      currentRow++
    }

    // Write all data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    })

    // Apply formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: formatRequests },
    })

    // Set column widths
    const colWidths = isIG
      ? [100, 200, 180, 80, 110, 80, 70, 70, 70, 90, 110, 90, 100, 200, 200]
      : [100, 200, 180, 80, 80, 80, 80]

    const colRequests = colWidths.map((width, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: width },
        fields: 'pixelSize',
      }
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: colRequests },
    })

    console.log(`✓ Set up ${tabName}`)
  }

  console.log('\n✅ Google Sheet is ready! Open it at:')
  console.log(`https://docs.google.com/spreadsheets/d/${SHEET_ID}`)
}

setup().catch(console.error)
