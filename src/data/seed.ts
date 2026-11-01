export const resources = [
  { id: "r1", title: "Build a study plan that works", category: "Study skills", readTime: "5 min read", description: "Turn a big syllabus into manageable daily study sessions, with breaks and realistic revision goals." },
  { id: "r2", title: "Preparing for examinations with confidence", category: "Examinations", readTime: "7 min read", description: "Practical preparation habits, active recall, practice questions, and exam-day routines." },
  { id: "r3", title: "Exploring career paths after secondary school", category: "Career", readTime: "6 min read", description: "Compare interests, subjects, skills, and possible career directions before making your next choice." },
  { id: "r4", title: "Managing stress during a busy semester", category: "Wellbeing", readTime: "4 min read", description: "Small, supportive steps for balancing study, rest, relationships, and asking for help." }
];
export const scholarships = [
  { id: "s1", title: "Future Leaders Education Award", provider: "Mentorship+ Demo Listing", level: "Undergraduate", deadline: "2026-12-15", eligibility: "Nigerian undergraduate students; sample listing only.", description: "A demonstration scholarship record for testing search, saving, and deadline tracking." },
  { id: "s2", title: "STEM Pathways Support Grant", provider: "Mentorship+ Demo Listing", level: "Undergraduate", deadline: "2027-01-30", eligibility: "Students pursuing science, technology, engineering, or mathematics; sample listing only.", description: "A mock opportunity to help students practise checking eligibility and application requirements." },
  { id: "s3", title: "Community Learning Bursary", provider: "Mentorship+ Demo Listing", level: "Secondary", deadline: "2026-11-20", eligibility: "Secondary-school learners; sample listing only.", description: "A sample bursary record. This is not a verified or open funding opportunity." }
];
export const counsellors = [
  { id: "c1", name: "Amara Okafor", topics: ["Career", "Academics"], bio: "Supports study planning, academic decisions, and career exploration.", availability: "Available this week" },
  { id: "c2", name: "Tunde Adebayo", topics: ["Academics", "Others"], bio: "Helps students build learning routines and work through academic pressure.", availability: "Available tomorrow" },
  { id: "c3", name: "Grace Danjuma", topics: ["Marriage", "Others"], bio: "Offers supportive conversations around relationships and personal decisions.", availability: "Limited availability" }
];
export const topics = ["Career", "Academics", "Marriage", "Others"];
export const ninRecords: Record<string, { name: string; lga: string; state: string }> = {
  "12345678901": { name: "Ayo Adeyemi", lga: "Lagos Mainland", state: "Lagos" },
  "23456789012": { name: "Zainab Yusuf", lga: "Ikeja", state: "Lagos" },
  "34567890123": { name: "Chidi Okoro", lga: "Kano Municipal", state: "Kano" }
};
export const initialAuthorisedLgas = ["Lagos Mainland", "Ikeja", "Surulere"];
export const universities = [
  { id: "u1", name: "University of Lagos", location: "Akoka, Lagos", description: "A Nigerian public research university. Check official channels for current admissions information." },
  { id: "u2", name: "University of Ibadan", location: "Ibadan, Oyo", description: "A Nigerian public university. Confirm courses and requirements through official sources." },
  { id: "u3", name: "Ahmadu Bello University", location: "Zaria, Kaduna", description: "A Nigerian public university. Confirm current admission details independently." }
];
