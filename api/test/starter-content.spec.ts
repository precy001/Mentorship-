import { READ_TIME_PATTERN, RESOURCE_CATEGORIES, SCHOLARSHIP_LEVELS } from '../src/content/content.constants';
import { STARTER_RESOURCES, STARTER_SCHOLARSHIPS } from '../prisma/data/starter-content';

describe('starter content', () => {
  it('uses unique seed keys and titles', () => {
    const keys = [...STARTER_RESOURCES, ...STARTER_SCHOLARSHIPS].map((item) => item.seedKey);
    expect(new Set(keys).size).toBe(keys.length);
    const titles = [...STARTER_RESOURCES, ...STARTER_SCHOLARSHIPS].map((item) => item.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('matches the admin validation rules so every item can be edited later', () => {
    for (const item of STARTER_RESOURCES) {
      expect((RESOURCE_CATEGORIES as readonly string[]).includes(item.category)).toBe(true);
      expect(READ_TIME_PATTERN.test(item.readTime)).toBe(true);
      expect(item.title.length).toBeGreaterThanOrEqual(2);
      expect(item.title.length).toBeLessThanOrEqual(180);
      expect(item.description.length).toBeGreaterThan(300);
      expect(item.description.length).toBeLessThanOrEqual(2000);
    }
    for (const item of STARTER_SCHOLARSHIPS) {
      expect((SCHOLARSHIP_LEVELS as readonly string[]).includes(item.level)).toBe(true);
      expect(item.description.length).toBeLessThanOrEqual(2000);
      expect(item.eligibility.length).toBeLessThanOrEqual(2000);
      expect(item.leadDays).toBeGreaterThan(0);
      expect(item.seedKey.length).toBeLessThanOrEqual(80);
    }
  });

  it('tells members to confirm scholarship deadlines with the provider', () => {
    for (const item of STARTER_SCHOLARSHIPS) expect(item.description).toMatch(/planning reminder/i);
  });
});
