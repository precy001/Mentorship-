import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CounsellorInvitationDto, ResourceDto, ScholarshipDto, TopicDto } from '../src/admin/admin.dto';

const messages = <T extends object>(cls: new () => T, payload: Record<string, unknown>) =>
  validateSync(plainToInstance(cls, payload)).flatMap((error) => Object.values(error.constraints ?? {}));

const resource = { title: 'Writing a CV', category: 'Career', readTime: '5 min read', description: 'How to write a strong CV.' };
const scholarship = { title: 'STEM Award', provider: 'Acme Foundation', level: 'Undergraduate', eligibility: 'Nigerian students', description: 'Funding for STEM students.', deadline: '2027-02-01T22:59:59.000Z' };

describe('ResourceDto', () => {
  it('accepts a complete resource, with or without an image', () => {
    expect(messages(ResourceDto, resource)).toEqual([]);
    expect(messages(ResourceDto, { ...resource, imageUrl: null })).toEqual([]);
    expect(messages(ResourceDto, { ...resource, imageUrl: 'https://example.com/a.png' })).toEqual([]);
  });

  it('rejects whitespace-only text, because values are trimmed before validation', () => {
    expect(messages(ResourceDto, { ...resource, title: '    ' })).toContain('Title must be at least 2 characters.');
    expect(messages(ResourceDto, { ...resource, description: ' ' })).toContain('Description must be at least 2 characters.');
  });

  it('rejects categories outside the predefined list', () => {
    expect(messages(ResourceDto, { ...resource, category: 'Whatever I typed' })[0]).toMatch(/Category must be one of/);
  });

  it('rejects invalid reading times', () => {
    for (const readTime of ['0 min read', '181 min read', '-5 min read', 'five minutes', '5']) {
      expect(messages(ResourceDto, { ...resource, readTime })).toContain('Reading time must be between 1 and 180 minutes.');
    }
    expect(messages(ResourceDto, { ...resource, readTime: '180 min read' })).toEqual([]);
  });
});

describe('ScholarshipDto', () => {
  it('accepts a complete scholarship', () => {
    expect(messages(ScholarshipDto, scholarship)).toEqual([]);
  });

  it('rejects free-text levels and malformed deadlines', () => {
    expect(messages(ScholarshipDto, { ...scholarship, level: 'sort of university' })[0]).toMatch(/Level must be one of/);
    expect(messages(ScholarshipDto, { ...scholarship, deadline: 'next friday' })).toContain('Choose a valid scholarship deadline.');
    expect(messages(ScholarshipDto, { ...scholarship, deadline: '' })).toContain('Choose a valid scholarship deadline.');
  });
});

describe('TopicDto and CounsellorInvitationDto', () => {
  it('trims topic names and validates their length', () => {
    expect(messages(TopicDto, { name: '  ' })).toContain('Topic name must be at least 2 characters.');
    expect(messages(TopicDto, { name: 'Study skills', description: 'x'.repeat(501) })).toContain('Topic description must be 500 characters or fewer.');
  });

  it('requires a valid email and normalises it', () => {
    expect(messages(CounsellorInvitationDto, { email: 'not-an-email', topicIds: ['a'] })).toContain('Enter a valid email address.');
    const parsed = plainToInstance(CounsellorInvitationDto, { email: '  Jane@Example.COM ', topicIds: ['a'] });
    expect(parsed.email).toBe('jane@example.com');
    expect(validateSync(parsed)).toEqual([]);
  });
});
