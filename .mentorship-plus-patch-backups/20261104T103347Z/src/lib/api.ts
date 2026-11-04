import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "mentorship-plus-access-token-v1";
const REQUEST_TIMEOUT_MS = 15_000;

function resolveBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  return `http://${host || "localhost"}:4000/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiUser = {
  id: string;
  email: string;
  role: "MEMBER" | "COUNSELLOR" | "ADMIN" | "SUPER_ADMIN" | string;
  status: string;
  displayName: string | null;
  emailVerifiedAt?: string | null;
  profile?: { category?: { id: string; name: string; slug: string } | null; subcategory?: { id: string; name: string; slug: string } | null } | null;
};

export type MembershipCategory = { id: string; name: string; slug: string; description: string | null; subcategories: { id: string; name: string; slug: string; description: string | null }[] };

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const token = authenticated ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {}),
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Check that the Mentorship+ API is running and that your phone can reach ${API_BASE_URL}.`,
      );
    }
    throw new Error(
      `Could not connect to the Mentorship+ server at ${API_BASE_URL}. Check that the API is running and your phone and computer are on the same network.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await response.text();
  let body: any = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = { message: rawBody };
    }
  }

  if (!response.ok) {
    const serverMessage = body?.message ?? body?.error;
    const message = Array.isArray(serverMessage)
      ? serverMessage.join("\n")
      : typeof serverMessage === "string"
        ? serverMessage
        : serverMessage?.message || `We couldn't complete that request. Please try again.`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export async function apiLogin(email: string, password: string): Promise<ApiUser> {
  const result = await apiRequest<{ accessToken: string; user: ApiUser }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    },
  );

  if (!result?.accessToken || !result?.user?.id || !result?.user?.role) {
    throw new Error("The server returned an incomplete sign-in response.");
  }

  await AsyncStorage.setItem(TOKEN_KEY, result.accessToken);
  return result.user;
}

export async function apiRegister(input: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  dateOfBirth: string;
  stateOfResidence: string;
  lga: string;
  lcda: string;
  school?: string;
  categoryId: string;
  subcategoryId: string;
}) {
  return apiRequest<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      email: input.email.trim().toLowerCase(),
    }),
  });
}

export async function apiLogout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function apiMe(): Promise<ApiUser> {
  return apiRequest<ApiUser>("/auth/me", {}, true);
}


export async function apiGetMembershipCategories(): Promise<MembershipCategory[]> {
  const result = await apiRequest<{ categories: MembershipCategory[] }>("/membership/categories");
  return result.categories;
}

export async function apiVerifyEmail(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: token.trim() }) });
}

export async function apiResendVerification(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase() }) });
}
