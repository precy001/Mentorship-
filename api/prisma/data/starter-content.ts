/**
 * Starter content shown to new members from day one. Everything here is original, general guidance
 * written for Mentorship+, and is managed afterwards from the Admin dashboard (edit, unpublish, delete).
 * Category and level values must match api/src/content/content.constants.ts (checked by a unit test).
 */
export type StarterResource = { seedKey: string; title: string; category: string; readTime: string; description: string };
export type StarterScholarship = { seedKey: string; title: string; provider: string; level: string; eligibility: string; description: string; leadDays: number };

export const STARTER_RESOURCES: StarterResource[] = [
  {
    seedKey: 'resource-cv-that-gets-read',
    title: 'Building a CV that gets read',
    category: 'Career',
    readTime: '6 min read',
    description:
      'Recruiters often skim a CV in under a minute, so make the first half-page count.\n\n1. Start with a two-line summary: who you are, what you do well, and the role you want.\n2. List experience in reverse order. For each role, write what you achieved, not only what you were asked to do. “Handled customer complaints” becomes “Resolved 20+ customer complaints a week and kept repeat complaints low”. Use real numbers only.\n3. Keep one clean page if you are early in your career, two at most later on. Use a plain font, clear headings and consistent dates.\n4. Add skills that match the advert, using the same words the employer uses.\n5. Include volunteering, projects and training. They show initiative when paid experience is short.\n6. Proofread twice, then ask someone else to read it. Save it as a PDF and name the file with your own name.\n\nTailor the summary and top skills for every application. A focused CV beats a long one.',
  },
  {
    seedKey: 'resource-interview-preparation',
    title: 'Preparing for a job interview',
    category: 'Career',
    readTime: '7 min read',
    description:
      'Good interviews are mostly good preparation.\n\nBefore the day: read the job description line by line and note where your experience fits. Learn what the organisation does, who it serves and one recent thing it has done. Prepare three short stories using Situation, Task, Action, Result: a problem you solved, a time you worked in a team, and a mistake you learned from.\n\nLikely questions: “Tell me about yourself” (keep it to one minute: present, past, future), “Why this role?”, “What are your strengths and weaknesses?”, and “Where do you want to be in five years?”. Practise answers aloud, not only in your head.\n\nOn the day: arrive early, or log in ten minutes early for an online interview. Bring copies of your CV and certificates. Listen to the full question before answering. It is fine to pause and think.\n\nAlways ask questions at the end, for example what success looks like in the first three months. Send a short thank-you message the same day.',
  },
  {
    seedKey: 'resource-finding-scholarships',
    title: 'Finding and applying for scholarships',
    category: 'Education',
    readTime: '8 min read',
    description:
      'Scholarships reward preparation as much as grades.\n\nWhere to look: your school or university funding office, government scholarship boards, foundations, employers, and the official websites of universities abroad. Apply only through official pages. A genuine scholarship never asks you to pay to apply.\n\nStart early. Many programmes open months before they close and need documents that take time: transcripts, references, a personal statement, proof of identity and sometimes a research or study plan. Ask referees at least a month ahead and give them your CV and the deadline.\n\nRead the eligibility rules carefully (level of study, country, field, age, minimum grade) and apply only where you fit. Keep a simple tracker with the name, deadline, documents needed and status.\n\nWrite for the reader: say why you chose the course, what you will do with it, and how the award helps others as well as you. Submit a day early, because websites are busiest on deadline day. Keep applying; most successful applicants apply more than once.',
  },
  {
    seedKey: 'resource-study-habits',
    title: 'Study habits that actually work',
    category: 'Study Skills',
    readTime: '6 min read',
    description:
      'Studying longer is not the same as studying better. These methods are well supported by learning research.\n\nRetrieval practice: close the book and write down everything you remember, then check. Testing yourself beats re-reading.\n\nSpaced repetition: review material after one day, three days, a week and a month, rather than all at once the night before.\n\nFocused sessions: study for 25 to 45 minutes with your phone out of reach, then take a five-minute break. Four sessions make a productive morning.\n\nExplain it simply: teach the topic to a friend or to yourself aloud. Where you get stuck is where to study next.\n\nPlan the week: list exams and assignments with dates, divide each into small tasks and schedule them. Start with the hardest subject when you are most alert.\n\nProtect your sleep. Memory is stored while you rest, so an all-nighter usually costs more than it gives.',
  },
  {
    seedKey: 'resource-personal-statement',
    title: 'Writing a strong personal statement',
    category: 'Education',
    readTime: '7 min read',
    description:
      'A personal statement answers one question: why should we choose you?\n\nPlan first. Write down your reasons for the course, two or three experiences that prove your interest, and what you hope to do afterwards.\n\nStructure: an opening that shows genuine motivation (a specific moment, not a famous quote); a middle that connects your studies, projects, work or community activity to the course; a close that looks forward.\n\nShow, do not claim. Instead of “I am a hard-working leader”, describe the club you organised, what you did and what changed.\n\nKeep to the word limit and the prompt. Use clear, honest language in your own voice. Never copy a sample, because reviewers read hundreds and recognise templates, and plagiarism checks are common.\n\nDraft, rest for a day, then edit. Cut every sentence that does not support your case. Ask a teacher, mentor or counsellor to read it and tell you what they remember afterwards.',
  },
  {
    seedKey: 'resource-small-business-checklist',
    title: 'Starting a small business: a first-month checklist',
    category: 'Business',
    readTime: '8 min read',
    description:
      'You do not need a perfect plan to start, but you do need clear answers to a few questions.\n\nWeek 1 — Validate: Who exactly will buy this, and what problem does it solve? Talk to at least ten potential customers and ask what they currently do and what they pay.\n\nWeek 2 — Offer and price: Define one simple offer. Work out your costs per unit or hour, add a fair margin and compare with competitors.\n\nWeek 3 — Make it legal and organised: Choose a business name and check it is available. Look up the registration and tax requirements that apply to your business type and location with the relevant government agency. Open a separate account so business and personal money never mix.\n\nWeek 4 — Sell: Make your first sales through people you can reach directly, such as messaging, social media and referrals. Record every sale and expense from the first day.\n\nAfter the month, review what customers said, what sold, and what to change. Small, quick experiments teach more than waiting for certainty.',
  },
  {
    seedKey: 'resource-pricing-products-services',
    title: 'Pricing your product or service',
    category: 'Business',
    readTime: '6 min read',
    description:
      'Many small businesses fail by pricing on guesswork or by copying the cheapest competitor.\n\nStep 1: Know your costs. Add materials, packaging, transport, data and airtime, tools, platform fees and your own time. If you pay yourself nothing, you have a hobby, not a business.\n\nStep 2: Choose a margin. Decide what percentage of each sale must remain after costs so that the business can pay you, replace equipment and survive a slow month.\n\nStep 3: Check the market. Compare with similar offers, but look at quality, reliability and service as well as price. Being slightly more expensive and clearly better is often a winning position.\n\nStep 4: Test. Try a price for two weeks and see how customers react. Raise prices gradually and tell regular customers early.\n\nAvoid discounting by reflex. If you do offer a promotion, set an end date and make sure you still earn a margin. Review your prices at least twice a year, because your costs change.',
  },
  {
    seedKey: 'resource-budgeting-irregular-income',
    title: 'Budgeting basics with irregular income',
    category: 'Finance',
    readTime: '7 min read',
    description:
      'If your income changes from month to month, a fixed monthly budget can feel impossible. Plan around your lowest realistic month instead.\n\n1. Look back over the last six months and note your lowest income. Treat that figure as your “base” income.\n2. List fixed essentials: rent, food, transport, bills, school fees, debt payments. Pay these first from your base income.\n3. Split anything above the base into three parts when it arrives: savings, upcoming irregular costs (for example school fees, repairs, renewals) and spending you enjoy.\n4. Pay yourself a steady “salary” from a separate account, and let the business or gig money flow into that account first. This smooths the ups and downs.\n5. Track spending for a month in a notebook or phone note. Most people find two or three leaks they can fix.\n\nReview weekly for ten minutes. A simple plan you follow is better than a detailed plan you abandon.\n\nThis is general education, not financial advice. For major decisions, speak to a qualified adviser.',
  },
  {
    seedKey: 'resource-emergency-fund',
    title: 'Building an emergency fund, one step at a time',
    category: 'Finance',
    readTime: '5 min read',
    description:
      'An emergency fund is money set aside for surprises such as illness, a repair or a sudden loss of income. It stops a small problem from becoming a debt.\n\nStart tiny. Choose a first target you can reach in a month or two, such as one week of essential expenses. Then aim for one month, and eventually three to six months if your income is irregular.\n\nMake it automatic. Move a fixed amount the day you are paid, before you can spend it. Even a small regular amount builds momentum.\n\nKeep it separate and accessible. Use a different account from your daily spending so you are not tempted, and choose a safe place where you can withdraw quickly. Check that the provider is properly licensed.\n\nDefine what counts as an emergency in advance (urgent, necessary and unexpected), and refill the fund after you use it.\n\nCelebrate each milestone. Progress that feels good is progress you will keep making.',
  },
  {
    seedKey: 'resource-managing-stress',
    title: 'Managing stress and exam pressure',
    category: 'Wellbeing',
    readTime: '6 min read',
    description:
      'Feeling pressure before exams, interviews or big decisions is normal. These habits can help you stay steady.\n\nBreak it down: write the big task as small steps and do the first one. Progress reduces worry.\n\nMove and rest: a short walk, regular meals, water and enough sleep make a real difference to concentration and mood.\n\nBreathe slowly: breathe in for four counts and out for six, for a minute or two. A slower breath tells your body it can settle.\n\nLimit comparison: other people’s highlights are not your reality. Focus on your own plan.\n\nTalk early: share what you are feeling with a friend, family member, teacher or a Mentorship+ counsellor. Saying it out loud often makes it lighter.\n\nIf stress stays high for weeks, affects your sleep or daily life, or you feel hopeless, please reach out for support. You can start a private discussion with a counsellor in the Support tab. If you or someone else may be in immediate danger, contact your local emergency number straight away.',
  },
  {
    seedKey: 'resource-goal-setting',
    title: 'Setting goals you will actually keep',
    category: 'Personal Development',
    readTime: '5 min read',
    description:
      'Big goals fail when they are vague. Make yours specific and small enough to start today.\n\nWrite it clearly: “I will complete one online course module every Saturday morning” is better than “learn more”.\n\nPick a deadline and a measure so you can see progress. Break it into weekly actions, and put the first action in your calendar.\n\nLimit the list. Two or three goals at a time are enough. Choose one for career or learning, one for health or wellbeing, and one for something you enjoy.\n\nExpect obstacles. Decide in advance: “If I miss a day, I will do a shorter version the next day.” Missing once is normal; stopping completely is what to avoid.\n\nReview each week. What worked? What got in the way? Adjust the plan, not your worth.\n\nYou can record your goals under Activities in Mentorship+ and tick them off as you go. Share a goal with someone who will ask you how it is going.',
  },
  {
    seedKey: 'resource-freelancing-first-clients',
    title: 'Freelancing: finding your first clients',
    category: 'Career',
    readTime: '6 min read',
    description:
      'Your first clients usually come from people who already know you.\n\n1. Define what you offer in one sentence: who you help and what result they get.\n2. Build proof: complete two or three small projects, even for friends or a local organisation, and ask permission to show them. A simple portfolio page or document is enough.\n3. Tell people: message contacts, former colleagues and teachers about what you do and ask for introductions.\n4. Use platforms wisely: create a clear profile on one or two freelance or professional platforms and apply to a few well-matched jobs each week with a short, specific message.\n5. Agree terms in writing: scope, price, deadline, number of revisions and payment schedule. For new clients, ask for part-payment upfront.\n6. Deliver on time and ask for a testimonial and a referral.\n\nKeep records of invoices and income, and set aside money for tax obligations that apply to you. Your reputation is your most valuable asset, so protect it.',
  },
];

export const STARTER_SCHOLARSHIPS: StarterScholarship[] = [
  {
    seedKey: 'scholarship-chevening',
    title: 'Chevening Scholarships',
    provider: 'UK Foreign, Commonwealth & Development Office',
    level: 'Postgraduate',
    eligibility:
      'Typically open to citizens of eligible countries, including Nigeria, who hold an undergraduate degree, have at least two years of work experience and plan to return home after a one-year master’s degree in the UK. Check the current rules on the official Chevening website.',
    description:
      'A UK government international awards programme that funds one-year master’s degrees at UK universities. Awards usually cover tuition, a living allowance and travel. Selection looks at leadership potential, networking and a clear plan for what you will do after returning home. Applications open once a year. The date shown is a planning reminder only: always confirm the current opening and closing dates and all requirements on the official website, and never pay anyone to apply.',
    leadDays: 120,
  },
  {
    seedKey: 'scholarship-commonwealth',
    title: 'Commonwealth Scholarships',
    provider: 'Commonwealth Scholarship Commission (UK)',
    level: 'Postgraduate',
    eligibility:
      'Generally for citizens of eligible Commonwealth countries who cannot otherwise afford to study in the UK, with a strong first degree. Different award types exist for master’s and PhD study. Confirm current eligibility on the official site.',
    description:
      'Funds postgraduate study in the United Kingdom for talented people from Commonwealth countries who want to contribute to development in their home country. Different awards are available for master’s and doctoral study, and some applications are made through nominating bodies. The date shown is a planning reminder only: closing dates differ by award type and year, so check the Commission’s official website for the current schedule and instructions.',
    leadDays: 150,
  },
  {
    seedKey: 'scholarship-fulbright',
    title: 'Fulbright Foreign Student Program',
    provider: 'U.S. Department of State, with national Fulbright commissions',
    level: 'Postgraduate',
    eligibility:
      'Open to graduates from participating countries who meet academic, English-language and leadership requirements, and who intend to return home after study in the United States. Requirements vary by country, so use the Fulbright programme page for your country.',
    description:
      'Supports graduate students, young professionals and artists from outside the United States to study and research at U.S. institutions. The application process, timeline and number of awards depend on your country, and applications are usually made through the local Fulbright programme or U.S. Embassy. The date shown is a planning reminder only: confirm the current deadline and process on the official Fulbright website for your country.',
    leadDays: 180,
  },
  {
    seedKey: 'scholarship-mastercard-foundation-scholars',
    title: 'Mastercard Foundation Scholars Program',
    provider: 'Mastercard Foundation and partner institutions',
    level: 'All levels',
    eligibility:
      'Aimed at academically talented young people from Africa who face financial barriers and want to give back to their communities. Eligibility, levels of study and selection are managed by each partner institution, so apply through the partner you choose.',
    description:
      'A programme that works with partner universities and organisations to provide education, mentoring and leadership development for young Africans. Each partner institution runs its own application, so read its page carefully and apply only through official channels. The date shown is a planning reminder only: confirm which institutions are accepting applications and their deadlines before you begin.',
    leadDays: 90,
  },
  {
    seedKey: 'scholarship-nigeria-federal-awards',
    title: 'Nigerian Federal Government Scholarship Awards',
    provider: 'Federal Scholarship Board (Nigeria)',
    level: 'All levels',
    eligibility:
      'Generally for Nigerian citizens meeting the stated academic and documentation requirements. Different awards, such as bilateral education agreement awards and local scholarships, have different rules. Always read the current official announcement.',
    description:
      'The Federal Government of Nigeria offers scholarship and bilateral education awards through the Federal Scholarship Board, usually announced publicly with clear application instructions. Prepare your certificates, identification and references early. The date shown is a planning reminder only: follow the Board’s official announcements for the real opening and closing dates and beware of imitation websites.',
    leadDays: 100,
  },
];
