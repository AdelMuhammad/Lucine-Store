/** Builds a CSV file in the browser and triggers a download. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\r\n')

  // The BOM keeps Arabic readable when the file is opened in Excel.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** `lucine-coupons-2026-10-13.csv` */
export function csvFilename(name: string): string {
  return `lucine-${name}-${new Date().toISOString().slice(0, 10)}.csv`
}
