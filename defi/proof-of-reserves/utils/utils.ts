export function tableToString(data: any, columns: any) {
  let tableString = '';

  // Add the header row
  // tableString += columns.join(' | ') + '\n';
  // tableString += columns.map(() => '---').join(' | ') + '\n';
  const headerObject: any = {}
  const headerObject1: any = {}
  columns.forEach((col: any) => {
    headerObject[col] = col
    headerObject1[col] = '---'
  })
  data.unshift(headerObject1)
  data.unshift(headerObject)
  // Calculate the maximum width for each column
  const columnWidths = columns.map((col: any) => 
    Math.max(col.length, ...data.map((row: any) => (row[col] !== undefined ? String(row[col]).length : 0)))
  );

  // Add the data rows
  data.forEach((row: any) => {

    // Format the row with padded values
    const tableRow = columns.map((col: any, index: number) => {
      const cell = row[col] !== undefined ? String(row[col]) : '';
      return cell.padEnd(columnWidths[index], ' ');
    }).join(' | ');
    tableString += tableRow + '\n';
  });

  return tableString;
}
