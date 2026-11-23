import type { Audience, MembershipCategory } from "@/src/lib/api";

/** Product defaults: resources for everyone, scholarships for students, grants for working members. */
export const DEFAULT_AUDIENCE = {
  resource: { audienceCategories: [], audienceSubcategories: [] } as Audience,
  scholarship: { audienceCategories: ["education-learning"], audienceSubcategories: [] } as Audience,
  grant: { audienceCategories: ["work-career"], audienceSubcategories: [] } as Audience,
};

export const isEveryone = (item: Partial<Audience>) => !item.audienceCategories?.length && !item.audienceSubcategories?.length;

/**
 * Whether an item is meant for this member. Items for everyone always match. A member who has not chosen a
 * membership category sees everything, because there is nothing to match them against yet. Staff see everything.
 */
export function isForMember(item: Partial<Audience>, member: { role?: string; categorySlug?: string; subcategorySlug?: string } | null | undefined): boolean {
  if (isEveryone(item)) return true;
  if (!member) return true;
  if (member.role && member.role !== "member" && member.role !== "student") return true;
  if (!member.categorySlug && !member.subcategorySlug) return true;
  return (!!member.categorySlug && !!item.audienceCategories?.includes(member.categorySlug))
    || (!!member.subcategorySlug && !!item.audienceSubcategories?.includes(member.subcategorySlug));
}

/** Short human label, e.g. "Everyone" or "Work & Career · Job Seeker". */
export function audienceLabel(item: Partial<Audience>, categories: MembershipCategory[]): string {
  if (isEveryone(item)) return "Everyone";
  const names: string[] = [];
  for (const slug of item.audienceCategories ?? []) names.push(categories.find((c) => c.slug === slug)?.name ?? slug);
  for (const slug of item.audienceSubcategories ?? []) {
    const parent = categories.find((c) => c.subcategories.some((sub) => sub.slug === slug));
    // A subcategory inside a category that is already fully selected adds nothing to the label.
    if (parent && item.audienceCategories?.includes(parent.slug)) continue;
    names.push(parent?.subcategories.find((sub) => sub.slug === slug)?.name ?? slug);
  }
  return names.join(" · ");
}
