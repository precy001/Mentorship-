import { extensionForImageType, MAX_IMAGE_BYTES, sniffImageType } from '../src/storage/image-validation';

const pad = (bytes: number[]) => Buffer.from([...bytes, ...new Array(16).fill(0)]);
const jpeg = pad([0xff, 0xd8, 0xff, 0xe0]);
const png = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBP'), Buffer.alloc(8)]);

describe('sniffImageType', () => {
  it('recognises JPEG, PNG and WebP by their leading bytes', () => {
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
    expect(sniffImageType(png)).toBe('image/png');
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('rejects other formats, text disguised as an image and empty input', () => {
    expect(sniffImageType(Buffer.from('GIF89a......................'))).toBeNull();
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImageType(Buffer.from('RIFF....WAVEfmt ........'))).toBeNull();
    expect(sniffImageType(Buffer.alloc(4))).toBeNull();
    expect(sniffImageType(undefined)).toBeNull();
  });
});

describe('image constants', () => {
  it('maps detected types to file extensions and keeps the 5 MB limit', () => {
    expect(extensionForImageType('image/jpeg')).toBe('jpg');
    expect(extensionForImageType('image/png')).toBe('png');
    expect(extensionForImageType('image/webp')).toBe('webp');
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
