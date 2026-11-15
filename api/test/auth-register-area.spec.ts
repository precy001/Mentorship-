import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

const dto = { email: 'New@Example.com', password: 'Password123', displayName: 'Ada', categoryId: 'c1', subcategoryId: 's1', phoneNumber: '+2348012345678', dateOfBirth: '2000-01-01', stateOfResidence: 'Lagos', lga: 'Alimosho', lcda: 'Egbe-Idimu LCDA' };

function build(areaResult: 'ok' | 'rejected') {
  const created: { data: Record<string, any> }[] = [];
  const prisma = {
    user: { findUnique: async () => null, create: async (args: { data: Record<string, any> }) => { created.push(args); return { id: 'u1', email: 'new@example.com' }; } },
    membershipCategory: { findFirst: async () => ({ id: 'c1' }) },
    membershipSubcategory: { findFirst: async () => ({ id: 's1' }) },
    authToken: { create: async () => ({}), updateMany: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  const serviceAreas = {
    resolveActiveArea: async () => {
      if (areaResult === 'rejected') throw new BadRequestException('This LGA/LCDA is not currently available for registration. Go back and choose an enabled area.');
      return { id: 'a1', state: 'Lagos', lga: 'Alimosho', lcda: 'Egbe-Idimu LCDA' };
    },
  };
  const service = new AuthService(prisma as never, {} as never, { get: () => undefined, getOrThrow: () => 'x' } as never, { sendActionEmail: async () => undefined } as never, serviceAreas as never);
  (service as any).createAndSendToken = async () => undefined;
  (service as any).writeAudit = async () => undefined;
  return { service, created };
}

describe('registration validates the chosen service area on the server', () => {
  it('stores the canonical state, LGA and LCDA of an active area', async () => {
    const { service, created } = build('ok');
    await service.register({ ...dto, lga: ' alimosho ' } as never);
    const profile = created[0].data.profile.create;
    expect(profile.stateOfResidence).toBe('Lagos');
    expect(profile.profileData).toMatchObject({ lga: 'Alimosho', lcda: 'Egbe-Idimu LCDA' });
  });

  it('refuses to create the account when the area is inactive or invalid', async () => {
    const { service, created } = build('rejected');
    await expect(service.register(dto as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(created.length).toBe(0);
  });
});
