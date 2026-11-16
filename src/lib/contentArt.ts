import type { ImageSourcePropType } from "react-native";

/**
 * Original Mentorship+ cover artwork bundled with the app. It is only a fallback: any image an administrator
 * uploads to a resource or scholarship always takes priority, and the artwork never hides real content.
 */
const RESOURCE_ART: Record<string, ImageSourcePropType> = {
  career: require("../../assets/content/career.jpg"),
  business: require("../../assets/content/business.jpg"),
  education: require("../../assets/content/education.jpg"),
  "study skills": require("../../assets/content/study-skills.jpg"),
  finance: require("../../assets/content/finance.jpg"),
  wellbeing: require("../../assets/content/wellbeing.jpg"),
  "personal development": require("../../assets/content/personal-development.jpg"),
  general: require("../../assets/content/general.jpg"),
};

const SCHOLARSHIP_ART: ImageSourcePropType = require("../../assets/content/scholarship.jpg");

export function resourceArt(category: string): ImageSourcePropType {
  return RESOURCE_ART[category.trim().toLowerCase()] ?? RESOURCE_ART.general;
}

export function scholarshipArt(): ImageSourcePropType {
  return SCHOLARSHIP_ART;
}
