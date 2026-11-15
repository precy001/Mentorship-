import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { StorageService } from '../src/storage/storage.service';

const SUPABASE = 'https://project.supabase.co';
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

function build(env: Record<string, string | undefined> = { SUPABASE_URL: `${SUPABASE}/`, SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_STORAGE_BUCKET: 'profile-photos' }) {
  return new StorageService({ get: (key: string) => env[key] } as never);
}

describe('StorageService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reports a clear error when storage is not configured', async () => {
    await expect(build({}).uploadImage('content', { buffer: png })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects files that are not JPG, PNG or WebP even when the client claims they are', async () => {
    await expect(build().uploadImage('content', { buffer: Buffer.from('not an image at all, just text'), mimetype: 'image/jpeg' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects images over 5 MB', async () => {
    const big = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);
    await expect(build().uploadImage('content', { buffer: big })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads to <folder>/<uuid>.<ext>, trusts the detected type and returns the public URL', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as never;
    const result = await build().uploadImage('content', { buffer: png, mimetype: 'image/jpeg' });

    expect(result.path).toMatch(/^content\/[0-9a-f-]{36}\.png$/);
    expect(result.url).toBe(`${SUPABASE}/storage/v1/object/public/profile-photos/${result.path}`);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe(`${SUPABASE}/storage/v1/object/profile-photos/${result.path}`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('image/png');
    expect(init.headers.apikey).toBe('service-key');
  });

  it('hides storage failures from the caller and never leaks the service key', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'denied for service-key' }) as never;
    const error = await build().uploadImage('content', { buffer: png }).catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toContain('service-key');
  });

  it('recognises only URLs it produced inside the requested folder', () => {
    const storage = build();
    const base = `${SUPABASE}/storage/v1/object/public/profile-photos`;
    expect(storage.isManagedUrl(`${base}/content/abc.png`, 'content')).toBe(true);
    expect(storage.isManagedUrl(`${base}/user-1/abc.png`, 'content')).toBe(false);
    expect(storage.isManagedUrl(`${base}/content/../user-1/abc.png`, 'content')).toBe(false);
    expect(storage.isManagedUrl(`${base}/content/abc.png?download=1`, 'content')).toBe(false);
    expect(storage.isManagedUrl('https://evil.example/storage/v1/object/public/profile-photos/content/abc.png', 'content')).toBe(false);
    expect(build({}).isManagedUrl(`${base}/content/abc.png`, 'content')).toBe(false);
  });

  it('only deletes objects that live in its own bucket', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as never;
    const storage = build();
    await storage.deleteByUrl('https://elsewhere.example/a.png');
    await storage.deleteByUrl(null);
    expect(fetchMock).not.toHaveBeenCalled();
    await storage.deleteByUrl(`${SUPABASE}/storage/v1/object/public/profile-photos/content/abc.png`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${SUPABASE}/storage/v1/object/profile-photos/content/abc.png`);
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
