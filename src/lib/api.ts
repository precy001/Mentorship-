
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";

const TOKEN_KEY = "mentorship-plus-access-token-v1";
const REQUEST_TIMEOUT_MS = 15_000;

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  // A development client may use the machine running Expo. A standalone
  // build must never silently target localhost (which would be the phone).
  if (!__DEV__) {
    return "";
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];

  return host ? `http://${host}:4000/api/v1` : "http://localhost:4000/api/v1";
}

export const API_BASE_URL = resolveBaseUrl();

function requireApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "The Mentorship+ server address is not configured for this build. Configure EXPO_PUBLIC_API_URL in the EAS environment and rebuild the app.",
    );
  }

  if (!__DEV__) {
    if (!/^https:\/\//i.test(API_BASE_URL)) {
      throw new Error("The production Mentorship+ API address must use HTTPS.");
    }

    if (/^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)(:\d+)?(?:\/|$)/i.test(API_BASE_URL)) {
      throw new Error("This production build is pointing to localhost. Configure the live Render API URL and rebuild.");
    }
  }

  return API_BASE_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
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
  profile?: {
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    dateOfBirth?: string | null;
    stateOfResidence?: string | null;
    lga?: string | null;
    lcda?: string | null;
    school?: string | null;
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
    subcategory?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

export type MembershipCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  subcategories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }[];
};

function extractErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fallback;
  }

  const payload = body as Record<string, unknown>;
  const candidate = payload.message ?? payload.error;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }

  if (Array.isArray(candidate)) {
    const messages = candidate.filter(
      (item): item is string => typeof item === "string",
    );

    if (messages.length) {
      return messages.join("\n");
    }
  }

  if (candidate && typeof candidate === "object") {
    const nested = candidate as Record<string, unknown>;

    if (typeof nested.message === "string") {
      return nested.message;
    }
  }

  return fallback;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const rawBody = await response.text();

  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const baseUrl = requireApiBaseUrl();
  const token = authenticated
    ? await AsyncStorage.getItem(TOKEN_KEY)
    : null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;

  try {
    const requestUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    response = await expoFetch(
      requestUrl,
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
        `The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Check that the Mentorship+ API is running and your phone can reach ${API_BASE_URL}.`,
      );
    }

    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error("[API Request] Network request failed", {
      url: `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
      method: init.method ?? "GET",
      error: detail,
    });

    throw new Error(
      `Could not connect to the Mentorship+ server at ${baseUrl}. ${detail}. Check your internet connection and try again.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(
        body,
        "We couldn't complete that request. Please try again.",
      ),
      response.status,
    );
  }

  return body as T;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<ApiUser> {
  const result = await apiRequest<{
    accessToken: string;
    user: ApiUser;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

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

export async function apiGetMembershipCategories(): Promise<
  MembershipCategory[]
> {
  const result = await apiRequest<{
    categories: MembershipCategory[];
  }>("/membership/categories");

  return result.categories;
}

export async function apiVerifyEmail(
  token: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: token.trim() }),
  });
}

export async function apiRequestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });
}

export async function apiResetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: token.trim(),
      newPassword,
    }),
  });
}

export async function apiResendVerification(
  email: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/auth/resend-verification",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    },
  );
}

export async function apiUploadProfilePicture(
  uri: string,
  mimeType: string,
): Promise<{ avatarUrl: string }> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new ApiError(
      "Please sign in again to update your profile picture.",
      401,
    );
  }

  if (!uri) {
    throw new Error("No profile picture was selected.");
  }

  const baseUrl = requireApiBaseUrl();
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    30_000,
  );

  const uploadUrl = `${baseUrl}/profile/avatar`;

  try {
    // Expo SDK 57 requires an actual File/Blob in FormData.
    // The previous { uri, name, type } object caused
    // "Unsupported FormDataPart implementation".
    const imageFile = new File(uri);

    if (!imageFile.exists) {
      throw new Error("The selected image could not be accessed.");
    }

    const form = new FormData();
    form.append("file", imageFile);

    console.log("[Profile Upload] Starting upload:", uploadUrl);

    const response = await expoFetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
      signal: controller.signal,
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      const message = extractErrorMessage(
        body,
        `Profile picture upload failed with status ${response.status}.`,
      );

      console.error("[Profile Upload] Server rejected upload:", {
        status: response.status,
        message,
      });

      throw new ApiError(message, response.status);
    }

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).avatarUrl !== "string"
    ) {
      throw new Error(
        "The server did not return a valid profile picture URL.",
      );
    }

    const avatarUrl = (body as { avatarUrl: string }).avatarUrl;

    if (!avatarUrl.trim()) {
      throw new Error("The server returned an empty profile picture URL.");
    }

    console.log("[Profile Upload] Upload successful.");

    return { avatarUrl };
  } catch (error) {
    console.error("[Profile Upload] Failed:", {
      url: uploadUrl,
      errorName:
        error instanceof Error ? error.name : "Unknown",
      errorMessage:
        error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The profile picture upload timed out. Please try again.",
      );
    }

    throw new Error(
      error instanceof Error
        ? `Profile upload failed: ${error.message}`
        : `Profile upload failed: ${String(error)}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
