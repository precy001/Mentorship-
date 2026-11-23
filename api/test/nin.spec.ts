import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { UpdateProfileDto } from '../src/profile/update-profile.dto';
import { ProfileService } from '../src/profile/profile.service';

const errorsFor = <T extends object>(cls: new () => T, payload: Record<string, unknown>) =>
  validateSync(plainToInstance(cls, payload)).filter((error) => error.property === 'nin').flatMap((error) => Object.values(error.constraints ?? {}));

const registration = {
  email: 'ada@example.com', password: 'longenough', displayName: 'Ada Okafor', categoryId: 'c', subcategoryId: 's',
  stateOfResidence: 'Lagos', lga: 'Ikeja', lcda: 'Ojodu',
};

describe('NIN on registration', () => {
  it('is required', () => {
    expect(errorsFor(RegisterDto, registration).length).toBeGreaterThan(0);
  });
  it('must be exactly 11 digits; spaces and dashes are ignored', () => {
    expect(errorsFor(RegisterDto, { ...registration, nin: '12345678901' })).toEqual([]);
    expect(errorsFor(RegisterDto, { ...registration, nin: '123 4567-8901' })).toEqual([]);
    for (const nin of ['1234567890', '123456789012', 'ABCDEFGHIJK', '']) {
      expect(errorsFor(RegisterDto, { ...registration, nin })).toContain('Enter your 11-digit National Identification Number (NIN).');
    }
  });
});

describe('NIN on profile update', () => {
  it('is optional to send, but cannot be blank or malformed', () => {
    expect(errorsFor(UpdateProfileDto, {})).toEqual([]);
    expect(errorsFor(UpdateProfileDto, { nin: '12345678901' })).toEqual([]);
    expect(errorsFor(UpdateProfileDto, { nin: '' }).length).toBeGreaterThan(0);
    expect(errorsFor(UpdateProfileDto, { nin: '1234' }).length).toBeGreaterThan(0);
  });

  it('is stored inside the profile data alongside the existing details', async () => {
    const upsert = jest.fn(async (_args: unknown) => ({}));
    const tx = { user: { update: jest.fn() }, userProfile: { upsert }, auditLog: { create: jest.fn(async (_args: { data: { metadata: unknown } }) => ({})) } };
    const prisma = {
      user: { findUnique: jest.fn(async () => ({ id: 'u1', profile: { profileData: { lga: 'Ikeja', school: 'Unilag' } } })) },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const service = new ProfileService(prisma as never, {} as never);
    await service.updateProfile('u1', { nin: '123-4567 8901' });
    const args = upsert.mock.calls[0][0] as { update: { profileData: Record<string, unknown> } };
    expect(args.update.profileData).toEqual({ lga: 'Ikeja', school: 'Unilag', nin: '12345678901' });
    // The audit log records which fields changed, never the NIN itself.
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain('12345678901');
  });

  it('rejects a malformed NIN even if validation was bypassed', async () => {
    const prisma = { user: { findUnique: jest.fn(async () => ({ id: 'u1', profile: null })) }, $transaction: jest.fn() };
    const service = new ProfileService(prisma as never, {} as never);
    await expect(service.updateProfile('u1', { nin: '123' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
