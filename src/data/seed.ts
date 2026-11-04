// Production app does not ship seeded/demo content. These collections are populated by backend API integrations.
export const resources: { id:string; title:string; category:string; readTime:string; description:string }[] = [];
export const scholarships: { id:string; title:string; provider:string; level:string; deadline:string; eligibility:string; description:string }[] = [];
export const counsellors: { id:string; name:string; topics:string[]; bio:string; availability:string }[] = [];
export const topics: string[] = [];
export const ninRecords: Record<string, { name:string; lga:string; state:string }> = {};
export const initialAuthorisedLgas: string[] = [];
export const universities: { id:string; name:string; location:string; description:string }[] = [];
