import { validateFigureContent } from './figure-image';
import { previewResultFile } from './result-intake';

describe('figure images', () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=',
    'base64',
  );

  it('preserves original image bytes and filename in an unsaved figure draft', async () => {
    const { drafts, issues } = await previewResultFile({
      originalname: 'ECG.png',
      buffer: png,
    });
    expect(issues).toEqual([]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      type: 'figure',
      sourceFilename: 'ECG.png',
      content: {
        image: { dataUrl: `data:image/png;base64,${png.toString('base64')}` },
      },
    });
    expect(drafts[0].description).toBeUndefined();
    expect(() => validateFigureContent(drafts[0].content)).not.toThrow();
  });

  it('rejects non-image bytes renamed as PNG', async () => {
    await expect(
      previewResultFile({
        originalname: 'fake.png',
        buffer: Buffer.from('<script>not an image</script>'),
      }),
    ).rejects.toThrow();
  });

  it.each([
    'https://example.test/image.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,YmFk',
  ])('rejects unsafe or invalid image content %s', (dataUrl) => {
    expect(() => validateFigureContent({ image: { dataUrl } })).toThrow();
  });
});
