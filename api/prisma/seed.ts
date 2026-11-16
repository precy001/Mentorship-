import { PrismaClient } from '@prisma/client';
import { RETIRED_SERVICE_AREAS, SERVICE_AREAS } from './data/service-areas';
import { STARTER_RESOURCES, STARTER_SCHOLARSHIPS } from './data/starter-content';

const prisma = new PrismaClient();

const categories = [
  {
    slug: 'education-learning', name: 'Education & Learning', sortOrder: 1,
    subcategories: [
      ['secondary-school-student', 'Secondary School Student'],
      ['undergraduate', 'Undergraduate'],
      ['postgraduate-student', 'Postgraduate Student'],
      ['vocational-technical-student', 'Vocational & Technical Student'],
      ['recent-graduate', 'Recent Graduate'],
    ],
  },
  {
    slug: 'work-career', name: 'Work & Career', sortOrder: 2,
    subcategories: [
      ['employed-professional', 'Employed Professional'],
      ['self-employed-business-owner', 'Self-Employed / Business Owner'],
      ['artisan-skilled-tradesperson', 'Artisan / Skilled Tradesperson'],
      ['freelancer-gig-worker', 'Freelancer / Gig Worker'],
      ['job-seeker', 'Job Seeker'],
      ['career-changer', 'Career Changer'],
    ],
  },
];

const topics = [
  ['academic-support', 'Academic Support'],
  ['career-guidance', 'Career Guidance'],
  ['employment', 'Employment'],
  ['scholarships-funding', 'Scholarships & Funding'],
  ['business-entrepreneurship', 'Business & Entrepreneurship'],
  ['wellbeing', 'Wellbeing'],
  ['personal-development', 'Personal Development'],
];

const STARTER_MARKER = 'STARTER_CONTENT_SEEDED_V1';

/**
 * Publishes the starter resources and scholarships once. A marker row records that it has run, so:
 *  - re-running the seed never duplicates content (the marker and the unique seedKey both guard it), and
 *  - anything an administrator later edits, unpublishes or deletes is never put back.
 */
async function seedStarterContent(): Promise<void> {
  const already = await prisma.auditLog.findFirst({ where: { action: STARTER_MARKER }, select: { id: true } });
  if (already) {
    console.log('Starter content was already published earlier; leaving administrator-managed content untouched.');
    return;
  }
  for (const item of STARTER_RESOURCES) {
    const { seedKey, ...data } = item;
    await prisma.resource.upsert({ where: { seedKey }, update: {}, create: { seedKey, ...data } });
  }
  for (const item of STARTER_SCHOLARSHIPS) {
    const { seedKey, leadDays, ...data } = item;
    const deadline = new Date(Date.now() + leadDays * 24 * 60 * 60 * 1000);
    await prisma.scholarship.upsert({ where: { seedKey }, update: {}, create: { seedKey, deadline, ...data } });
  }
  await prisma.auditLog.create({ data: { action: STARTER_MARKER, entityType: 'Seed', metadata: { resources: STARTER_RESOURCES.length, scholarships: STARTER_SCHOLARSHIPS.length } } });
  console.log(`Published ${STARTER_RESOURCES.length} starter resources and ${STARTER_SCHOLARSHIPS.length} starter scholarships.`);
}

async function main(): Promise<void> {
  for (const categoryInput of categories) {
    const { subcategories, ...categoryData } = categoryInput;
    const category = await prisma.membershipCategory.upsert({
      where: { slug: categoryData.slug },
      update: { name: categoryData.name, sortOrder: categoryData.sortOrder, isActive: true },
      create: categoryData,
    });
    for (const [slug, name] of subcategories) {
      await prisma.membershipSubcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug } },
        update: { name, isActive: true },
        create: { categoryId: category.id, slug, name },
      });
    }
  }
  for (const [slug, name] of topics) {
    await prisma.counsellingTopic.upsert({
      where: { slug }, update: { name, isActive: true }, create: { slug, name },
    });
  }
  // Service areas: the same list the restore migration inserts. Existing rows are never changed
  // (update: {}), so administrator edits and enable/disable choices survive every re-run.
  for (const [state, lga, lcda] of RETIRED_SERVICE_AREAS) {
    await prisma.serviceArea.updateMany({ where: { state, lga, lcda, isActive: true }, data: { isActive: false } });
  }
  for (const [state, lga, lcda] of SERVICE_AREAS) {
    await prisma.serviceArea.upsert({ where: { state_lga_lcda: { state, lga, lcda } }, update: {}, create: { state, lga, lcda } });
  }
  await seedStarterContent();
  console.log('Mentorship+ reference data seeded. No user accounts or demo users were created.');
}

main().catch((error: unknown) => {
  console.error('Seed failed.');
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
