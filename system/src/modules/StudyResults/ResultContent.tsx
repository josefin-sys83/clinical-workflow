import { useState } from 'react';

function FigureImage({
  dataUrl,
  alt,
  expanded,
  actualSize,
}: {
  dataUrl: string;
  alt: string;
  expanded: boolean;
  actualSize: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Only embedded PNG/JPEG images are rendered. No remote requests or HTML/SVG.
  const safe = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(
    dataUrl,
  );
  if (!safe || failed)
    return (
      <p role="alert" className="rounded border p-4 text-sm text-red-700">
        The figure image could not be displayed. An author can replace it in
        Edit result.
      </p>
    );
  return (
    <img
      src={dataUrl}
      alt={alt || 'Study result figure'}
      onError={() => setFailed(true)}
      className={
        actualSize
          ? 'max-w-none'
          : expanded
            ? 'mx-auto h-auto max-w-full'
            : 'mx-auto max-h-96 max-w-full object-contain'
      }
    />
  );
}

const cellText = (value: unknown) =>
  typeof value === 'string'
    ? value
    : value == null
      ? ''
      : JSON.stringify(value);

export function ResultContent({
  content,
  showRowNumbers = false,
  expanded = false,
  actualImageSize = false,
}: {
  content: Record<string, unknown>;
  showRowNumbers?: boolean;
  expanded?: boolean;
  actualImageSize?: boolean;
}) {
  const image = content.image as
    | { dataUrl?: unknown; alt?: unknown }
    | undefined;
  if (image && typeof image.dataUrl === 'string')
    return (
      <figure className="rounded-lg border bg-stone-50 p-3">
        <FigureImage
          key={image.dataUrl}
          dataUrl={image.dataUrl}
          alt={typeof image.alt === 'string' ? image.alt : ''}
          expanded={expanded}
          actualSize={actualImageSize}
        />
      </figure>
    );
  if (Array.isArray(content.headers) && Array.isArray(content.rows)) {
    return (
      <div
        className={`${expanded ? '' : 'max-h-96'} overflow-auto rounded-lg border border-stone-200 bg-stone-50`}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-stone-100">
            <tr>
              {showRowNumbers && (
                <th className="border-b px-3 py-2">Data row</th>
              )}
              {content.headers.map((value, i) => (
                <th key={i} className="border-b px-3 py-2 font-semibold">
                  {cellText(value)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, i) => (
              <tr key={i}>
                {showRowNumbers && (
                  <th
                    scope="row"
                    className="border-b px-3 py-2 font-normal text-slate-500"
                  >
                    {i + 1}
                  </th>
                )}
                {(Array.isArray(row) ? row : [row]).map((value, j) => (
                  <td
                    key={j}
                    className="border-b border-stone-200 px-3 py-2 whitespace-pre-wrap"
                  >
                    {cellText(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (typeof content.text === 'string')
    return (
      <div
        className={`${expanded ? '' : 'max-h-96'} overflow-auto whitespace-pre-wrap rounded-lg border bg-stone-50 p-4 text-sm`}
      >
        {content.text}
      </div>
    );
  // Unknown structures remain readable; stored strings are never executed as HTML.
  return (
    <pre
      className={`${expanded ? '' : 'max-h-96'} overflow-auto whitespace-pre-wrap rounded-lg border bg-stone-50 p-4 text-xs`}
    >
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}
