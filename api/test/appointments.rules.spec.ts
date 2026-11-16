import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { APPOINTMENT_TRANSITIONS, parseAppointmentWindow } from '../src/appointments/appointments.service';

const now = new Date('2026-11-15T09:00:00.000Z');
const at = (hours: number, minutes = 0) => new Date(now.getTime() + hours * 3_600_000 + minutes * 60_000).toISOString();

describe('appointment time window', () => {
  it('accepts a future window of 15 minutes to 2 hours', () => {
    const result = parseAppointmentWindow(at(24), at(24, 45), now);
    expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(45 * 60_000);
    expect(() => parseAppointmentWindow(at(24), at(24, 15), now)).not.toThrow();
    expect(() => parseAppointmentWindow(at(24), at(26), now)).not.toThrow();
  });

  it('rejects past, inverted, too short and too long windows and invalid dates', () => {
    expect(() => parseAppointmentWindow(at(-1), at(1), now)).toThrow(BadRequestException);
    expect(() => parseAppointmentWindow(at(5), at(4), now)).toThrow(BadRequestException);
    expect(() => parseAppointmentWindow(at(5), at(5, 10), now)).toThrow(BadRequestException);
    expect(() => parseAppointmentWindow(at(5), at(7, 1), now)).toThrow(BadRequestException);
    expect(() => parseAppointmentWindow('not a date', at(5), now)).toThrow(BadRequestException);
  });
});

describe('appointment status transitions', () => {
  it('lets a request be confirmed or cancelled but never completed directly', () => {
    expect(APPOINTMENT_TRANSITIONS[AppointmentStatus.REQUESTED]).toEqual([AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED]);
  });

  it('allows completion, cancellation and no-show only from confirmed', () => {
    expect(APPOINTMENT_TRANSITIONS[AppointmentStatus.CONFIRMED]).toEqual(expect.arrayContaining([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]));
    expect(APPOINTMENT_TRANSITIONS[AppointmentStatus.RESCHEDULED]).not.toContain(AppointmentStatus.COMPLETED);
  });

  it('treats completed, cancelled and no-show as final', () => {
    for (const status of [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]) {
      expect(APPOINTMENT_TRANSITIONS[status]).toEqual([]);
    }
  });
});
