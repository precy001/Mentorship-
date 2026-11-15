import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { mimeTypeFromUri, validateImageMeta } from "./validation";

export type PickedImage = {
  uri: string;
  mimeType: string;
  fileName?: string;
  size?: number;
  width?: number;
  height?: number;
};

export type PickResult =
  | { status: "picked"; image: PickedImage }
  | { status: "cancelled" }
  | { status: "error"; message: string };

function readFileSize(uri: string): number | undefined {
  try {
    const size = (new File(uri) as { size?: number | null }).size;
    return typeof size === "number" ? size : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Opens the photo library, then validates the chosen file's type and size before it is ever
 * sent to the server (the server validates again; this only gives faster, clearer feedback).
 */
export async function pickImage(aspect: [number, number] = [16, 9]): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      status: "error",
      message: "Allow Mentorship+ to access your photo library in your device settings to choose an image.",
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]?.uri) return { status: "cancelled" };

  const asset = result.assets[0];
  const mimeType = asset.mimeType || mimeTypeFromUri(asset.uri) || "";
  const size = typeof asset.fileSize === "number" ? asset.fileSize : readFileSize(asset.uri);
  const problem = validateImageMeta({ mimeType, size });
  if (problem) return { status: "error", message: problem };

  return {
    status: "picked",
    image: { uri: asset.uri, mimeType, fileName: asset.fileName ?? undefined, size, width: asset.width, height: asset.height },
  };
}
