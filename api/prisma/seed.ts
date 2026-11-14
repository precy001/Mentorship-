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
  // Lagos State LGA and LCDA pairings, based on the official LASIEC listing.
  const serviceAreas: [string, string, string][] = [
    ['Lagos', 'Agege', 'Orile Agege LCDA'],
    ['Lagos', 'Ajeromi-Ifelodun', 'Ifelodun LCDA'],
    ['Lagos', 'Alimosho', 'Agbado-Oke Odo LCDA'], ['Lagos', 'Alimosho', 'Ayobo-Ipaja LCDA'], ['Lagos', 'Alimosho', 'Egbe-Idimu LCDA'], ['Lagos', 'Alimosho', 'Mosan-Okunola LCDA'], ['Lagos', 'Alimosho', 'Igando-Ikotun LCDA'],
    ['Lagos', 'Amuwo-Odofin', 'Oriade LCDA'],
    ['Lagos', 'Apapa', 'Apapa Iganmu LCDA'],
    ['Lagos', 'Badagry', 'Olorunda LCDA'], ['Lagos', 'Badagry', 'Badagry West LCDA'],
    ['Lagos', 'Epe', 'Eredo LCDA'], ['Lagos', 'Epe', 'Ikosi-Ejirin LCDA'],
    ['Lagos', 'Eti-Osa', 'Ikoyi-Obalende LCDA'], ['Lagos', 'Eti-Osa', 'Iru/Victoria Island LCDA'],
    ['Lagos', 'Ibeju-Lekki', 'Lekki LCDA'],
    ['Lagos', 'Ifako-Ijaiye', 'Ojokoro LCDA'],
    ['Lagos', 'Ikeja', 'Onigbongbo LCDA'], ['Lagos', 'Ikeja', 'Ojodu LCDA'],
    ['Lagos', 'Ikorodu', 'Igbogbo-Baiyeku LCDA'], ['Lagos', 'Ikorodu', 'Ijede LCDA'], ['Lagos', 'Ikorodu', 'Imota LCDA'], ['Lagos', 'Ikorodu', 'Ikorodu North LCDA'], ['Lagos', 'Ikorodu', 'Ikorodu West LCDA'],
    ['Lagos', 'Kosofe', 'Agboyi-Ketu LCDA'], ['Lagos', 'Kosofe', 'Ikosi-Isheri LCDA'],
    ['Lagos', 'Lagos Island', 'Lagos Island East LCDA'],
    ['Lagos', 'Lagos Mainland', 'Yaba LCDA'],
    ['Lagos', 'Mushin', 'Odi-Olowo/Ojuwoye LCDA'],
    ['Lagos', 'Ojo', 'Iba LCDA'], ['Lagos', 'Ojo', 'Oto-Awori LCDA'],
    ['Lagos', 'Oshodi-Isolo', 'Ejigbo LCDA'], ['Lagos', 'Oshodi-Isolo', 'Isolo LCDA'],
    ['Lagos', 'Shomolu', 'Bariga LCDA'],
    ['Lagos', 'Surulere', 'Coker-Aguda LCDA'], ['Lagos', 'Surulere', 'Itire-Ikate LCDA'],
    ['Lagos', 'Other / not listed', 'Other LCDA'],
  ];
  // Retire two incorrectly grouped legacy options from the original static list.
  await prisma.serviceArea.updateMany({ where: { state: 'Lagos', OR: [
    { lga: 'Eti-Osa', lcda: 'Lekki LCDA' },
    { lga: 'Lagos Mainland', lcda: 'Odi-Olowo/Ojuwoye LCDA' },
  ] }, data: { isActive: false } });
  for (const [state, lga, lcda] of serviceAreas) {
    await prisma.serviceArea.upsert({ where: { state_lga_lcda: { state, lga, lcda } }, update: {}, create: { state, lga, lcda } });
  }
  console.log('Mentorship+ reference data seeded. No user accounts or demo users were created.');
}

main().catch((error: unknown) => {
  console.error('Seed failed.');
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
