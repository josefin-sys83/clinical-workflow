import type { TableData } from '../types/review';

interface TableViewProps {
  table: TableData;
}

export function TableView({ table }: TableViewProps) {
  return (
    <div className="my-6">
      <div className="mb-3">
        <p className="text-sm font-medium text-neutral-900 mb-1">{table.id}</p>
        <p className="text-sm text-neutral-700 mb-1">{table.caption}</p>
        <p className="text-xs text-neutral-500 italic">{table.reference}</p>
      </div>

      <div className="overflow-x-auto border border-neutral-300 rounded-md">
        <table className="min-w-full divide-y divide-neutral-300 bg-white">
          <thead className="bg-neutral-50">
            <tr>
              {table.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-sm font-medium text-neutral-900 border-r border-neutral-200 last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-neutral-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-2.5 text-sm border-r border-neutral-200 last:border-r-0 ${
                      cellIndex === 0 || cell === ''
                        ? 'text-neutral-900'
                        : 'text-neutral-700'
                    } ${
                      cell === '' || String(cell).startsWith('  ')
                        ? 'font-normal'
                        : cellIndex === 0
                        ? 'font-medium'
                        : 'font-normal'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
