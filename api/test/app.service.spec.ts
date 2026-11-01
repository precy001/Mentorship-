import { AppService } from '../src/app.service';

describe('AppService', () => {
  it('returns API metadata without exposing configuration', () => {
    const service = new AppService();
    expect(service.getApiInfo()).toEqual({
      name: 'Mentorship+ API',
      status: 'ok',
      version: '0.1.0',
    });
  });
});