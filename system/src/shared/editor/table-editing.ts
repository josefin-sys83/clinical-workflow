// Structural edits for a table inside a contentEditable editor. Each acts on the
// cell the caret is in. New cells copy the style of their neighbour so a table
// keeps its borders and padding.

export type TableAction = 'addRow' | 'deleteRow' | 'addColumn' | 'deleteColumn' | 'deleteTable';

export const TABLE_ACTIONS: ReadonlyArray<[TableAction, string]> = [
  ['addRow', '+ Row'],
  ['deleteRow', '− Row'],
  ['addColumn', '+ Column'],
  ['deleteColumn', '− Column'],
  ['deleteTable', 'Delete table'],
];

/** The table cell holding the caret, if it is inside the given editor. */
export function tableCellAt(editor: HTMLElement | null): HTMLTableCellElement | null {
  const node = window.getSelection()?.anchorNode;
  const element = node instanceof Element ? node : node?.parentElement;
  const cell = element?.closest<HTMLTableCellElement>('td, th') ?? null;
  return cell && editor?.contains(cell) ? cell : null;
}

function emptyCellLike(like: HTMLTableCellElement, tag: 'td' | 'th'): HTMLTableCellElement {
  const cell = document.createElement(tag);
  const style = like.getAttribute('style');
  if (style) cell.setAttribute('style', style);
  cell.innerHTML = '<br>';
  return cell;
}

export function editTable(cell: HTMLTableCellElement, action: TableAction): void {
  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = cell.closest('table');
  if (!row || !table) return;
  const rows = Array.from(table.rows);
  const index = cell.cellIndex;

  switch (action) {
    case 'addRow': {
      // A row added from the header goes to the top of the body, styled like a body row.
      const inHeader = row.parentElement === table.tHead;
      const body = table.tBodies[0] ?? table.createTBody();
      const template = inHeader ? (body.rows[0] ?? row) : row;
      const next = document.createElement('tr');
      for (const c of Array.from(template.cells)) next.appendChild(emptyCellLike(c, 'td'));
      if (inHeader) body.prepend(next);
      else row.after(next);
      break;
    }
    case 'deleteRow':
      if (rows.length <= 1) table.remove();
      else row.remove();
      break;
    case 'addColumn':
      for (const r of rows) {
        const neighbour = r.cells[Math.min(index, r.cells.length - 1)];
        if (neighbour) neighbour.after(emptyCellLike(neighbour, neighbour.tagName === 'TH' ? 'th' : 'td'));
      }
      break;
    case 'deleteColumn':
      if (row.cells.length <= 1) table.remove();
      else for (const r of rows) r.cells[index]?.remove();
      break;
    case 'deleteTable':
      table.remove();
      break;
  }
}
