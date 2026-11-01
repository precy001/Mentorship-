import { PrismaClient } from '@prisma/client';

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
  console.log('Mentorship+ reference data seeded. No user accounts or demo users were created.');
}

main().catch((error: unknown) => {
  console.error('Seed failed.');
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
