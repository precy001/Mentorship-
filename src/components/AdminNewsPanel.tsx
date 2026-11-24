import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, EmptyState, Field, Heading, LoadingBlock, Pill, Row, Segmented } from "@/src/components/UI";
import { ImageUploadField, SmartImage } from "@/src/components/Forms";
import { AppAlert } from "@/src/lib/alert";
import { colors } from "@/src/lib/theme";
import { formatDateTime } from "@/src/lib/format";
import { confirmAction, errorMessage, isSessionExpired } from "@/src/lib/feedback";
import { hasErrors, validateLength } from "@/src/lib/validation";
import { excerpt } from "@/src/lib/newsFeed";
import { invalidateNews } from "@/src/lib/news";
import type { PickedImage } from "@/src/lib/imagePicker";
import { useApp } from "@/src/context/AppContext";
import {
  type AdminNewsPost, type NewsInput,
  apiAdminCreateNews, apiAdminDeleteNews, apiAdminNews, apiAdminSetNewsFlags, apiAdminUpdateNews, apiAdminUploadContentImage,
} from "@/src/lib/api";

type Errors = Record<string, string | null>;
type Mode = "publish" | "draft";
const empty = { title: "", body: "", linkUrl: "", pinned: false, mode: "publish" as Mode };
const MAX_PINNED = 3;
const validateLink = (value: string) => (!value.trim() || /^https?:\/\/\S+\.\S+/i.test(value.trim()) ? null : "Enter a full web address starting with https://, or leave it empty.");
const cardStyle = { borderRadius: 18, borderColor: "#E5EBEF", backgroundColor: "#FFFFFF" };

/**
 * Admin > News: write posts for everyone's News & updates feed (members, counsellors and admins).
 * Its own component with its own data, so the (already large) admin screen only has to show it. Posts can be
 * published at once or kept as drafts, pinned to the top (up to three), edited, unpublished or deleted.
 */
export function AdminNewsPanel({ disabled, onToast }: { disabled?: boolean; onToast: (message: string, tone?: "success" | "error") => void }) {
  const app = useApp();
  const [posts, setPosts] = useState<AdminNewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [image, setImage] = useState<PickedImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [editing, setEditing] = useState<AdminNewsPost | null>(null);
  const upload = useRef<{ uri: string; url: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const locked = !!busyKey || !!disabled;
  const pinnedCount = posts.filter((post) => post.pinned && post.isPublished).length;

  const load = useCallback(async () => {
    try {
      setPosts(await apiAdminNews());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  /** Runs one change at a time, then reloads the list and tells the shared feed to refresh. */
  const run = async (key: string, failTitle: string, task: () => Promise<unknown>, done?: string): Promise<boolean> => {
    if (busyKey) return false;
    setBusyKey(key);
    try {
      await task();
      invalidateNews();
      await load();
      if (done) onToast(done);
      return true;
    } catch (error) {
      if (isSessionExpired(error)) AppAlert.alert("Session expired", "Please sign in again to continue.", [{ text: "Sign in", onPress: async () => { await app.logout(); } }]);
      else AppAlert.alert(failTitle, errorMessage(error));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const reset = () => { setForm(empty); setErrors({}); setImage(null); setRemoveImage(false); setEditing(null); upload.current = null; };

  const startEdit = (post: AdminNewsPost) => {
    setEditing(post);
    setForm({ title: post.title, body: post.body, linkUrl: post.linkUrl ?? "", pinned: post.pinned, mode: post.isPublished ? "publish" : "draft" });
    setErrors({});
    setImage(null);
    setRemoveImage(false);
  };

  const save = async () => {
    const next: Errors = {
      title: validateLength(form.title, "Title", { min: 2, max: 160 }),
      body: validateLength(form.body, "Update", { min: 2, max: 5000 }),
      linkUrl: validateLink(form.linkUrl),
      pinned: form.pinned && form.mode === "publish" && !(editing?.pinned && editing.isPublished) && pinnedCount >= MAX_PINNED ? `Up to ${MAX_PINNED} updates can be pinned. Unpin one first.` : null,
    };
    setErrors(next);
    if (hasErrors(next)) return onToast("Please fix the highlighted fields.", "error");
    const input: NewsInput = { title: form.title.trim(), body: form.body.trim(), linkUrl: form.linkUrl.trim() || null, pinned: form.pinned, isPublished: form.mode === "publish" };
    const ok = await run("save", editing ? "Update not saved" : "Update not posted", async () => {
      let imageUrl: string | null | undefined;
      if (image) {
        if (upload.current?.uri !== image.uri) upload.current = { uri: image.uri, url: (await apiAdminUploadContentImage(image.uri)).imageUrl };
        imageUrl = upload.current.url;
      } else if (editing && removeImage) imageUrl = null;
      const payload = imageUrl === undefined ? input : { ...input, imageUrl };
      return editing ? apiAdminUpdateNews(editing.id, payload) : apiAdminCreateNews(payload);
    }, editing ? `“${input.title}” was saved.` : input.isPublished ? `“${input.title}” is now in everyone’s News & updates.` : `“${input.title}” was saved as a draft.`);
    if (ok) reset();
  };

  const togglePublished = async (post: AdminNewsPost) => {
    if (post.isPublished && !(await confirmAction({ title: "Unpublish update", message: `“${post.title}” will be hidden from everyone until you publish it again.`, confirmText: "Unpublish", destructive: true }))) return;
    await run(`pub-${post.id}`, "Update not changed", () => apiAdminSetNewsFlags(post.id, { isPublished: !post.isPublished }), post.isPublished ? "Unpublished." : "Published.");
  };
  const togglePinned = (post: AdminNewsPost) =>
    run(`pin-${post.id}`, "Update not changed", () => apiAdminSetNewsFlags(post.id, { pinned: !post.pinned }), post.pinned ? "Unpinned." : "Pinned to the top.");
  const remove = async (post: AdminNewsPost) => {
    if (!(await confirmAction({ title: "Delete update", message: `Permanently delete “${post.title}”${post.imageUrl ? " and its picture" : ""}? This cannot be undone. Use Unpublish to hide it instead.`, confirmText: "Delete", destructive: true }))) return;
    const ok = await run(`del-${post.id}`, "Update not deleted", () => apiAdminDeleteNews(post.id), "Update deleted.");
    if (ok && editing?.id === post.id) reset();
  };

  return (
    <>
      <Card style={cardStyle}>
        <Heading small title={editing ? "Edit update" : "Post an update"} subtitle={editing ? `Editing “${editing.title}”.` : "Share news, announcements or anything everyone should know. Members, mentors and admins all see it."} />
        <Field label="Title" value={form.title} onChangeText={(value) => { setForm((f) => ({ ...f, title: value })); setErrors((e) => ({ ...e, title: null })); }} placeholder="e.g. New counselling hours" required maxLength={160} error={errors.title} editable={!locked} />
        <Field label="Update" value={form.body} onChangeText={(value) => { setForm((f) => ({ ...f, body: value })); setErrors((e) => ({ ...e, body: null })); }} placeholder="Write the update…" required multiline maxLength={5000} error={errors.body} editable={!locked} />
        <ImageUploadField label="Picture" picked={image} existingUrl={editing?.imageUrl} existingRemoved={removeImage} onPick={(picked) => { setImage(picked); setRemoveImage(false); }} onRemove={() => { if (image) setImage(null); else setRemoveImage(true); }} disabled={locked} />
        <Field label="Link" optional value={form.linkUrl} onChangeText={(value) => { setForm((f) => ({ ...f, linkUrl: value })); setErrors((e) => ({ ...e, linkUrl: null })); }} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false} helper="Shown as a “Read more” button." error={errors.linkUrl} editable={!locked} />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.pinned, disabled: locked }}
          accessibilityLabel="Pin to the top of the feed"
          disabled={locked}
          onPress={() => { setForm((f) => ({ ...f, pinned: !f.pinned })); setErrors((e) => ({ ...e, pinned: null })); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
        >
          <Ionicons name={form.pinned ? "checkbox" : "square-outline"} size={24} color={form.pinned ? colors.primary : colors.mutedLight} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: "700" }}>Pin to the top</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>For things everyone must see. Up to {MAX_PINNED} at a time ({pinnedCount} pinned now).</Text>
          </View>
        </Pressable>
        {errors.pinned ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>{errors.pinned}</Text> : null}
        <Segmented<Mode> value={form.mode} disabled={locked} onChange={(mode) => setForm((f) => ({ ...f, mode }))} options={[{ label: "Publish now", value: "publish" }, { label: "Save as draft", value: "draft" }]} />
        <Button
          title={busyKey === "save" ? "Saving…" : editing ? "Save changes" : form.mode === "publish" ? "Post update" : "Save draft"}
          icon={form.mode === "publish" ? "megaphone-outline" : "document-outline"}
          loading={busyKey === "save"}
          disabled={locked}
          onPress={() => void save()}
        />
        {editing ? <Button title="Cancel editing" variant="ghost" disabled={locked} onPress={reset} /> : null}
      </Card>

      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{posts.length ? `${posts.filter((p) => p.isPublished).length} published · ${posts.filter((p) => !p.isPublished).length} drafts` : ""}</Text>
        <Button title="See the feed" icon="eye-outline" variant="secondary" size="sm" onPress={() => router.push("/news")} />
      </Row>

      {loading ? <LoadingBlock label="Loading updates…" /> : null}
      {loadError ? (
        <Card style={{ ...cardStyle, borderColor: "#F3B5B5", backgroundColor: colors.errorBg }}>
          <Text style={{ color: colors.error, fontWeight: "800" }}>Updates could not load</Text>
          <Text style={{ color: colors.error, fontSize: 12 }}>{loadError}</Text>
          <Button title="Retry" variant="secondary" size="sm" onPress={() => void load()} />
        </Card>
      ) : null}
      {!loading && !loadError && !posts.length ? <EmptyState icon="megaphone-outline" title="No updates yet" message="Post the first one above. It appears in everyone’s News & updates." /> : null}

      {posts.map((post) => (
        <Card key={post.id} style={cardStyle}>
          <Row style={{ gap: 12, alignItems: "flex-start" }}>
            {post.imageUrl ? <View style={{ width: 64 }}><SmartImage uri={post.imageUrl} aspectRatio={1} radius={12} /></View> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Row style={{ flexWrap: "wrap", gap: 6 }}>
                <Pill label={post.isPublished ? "Published" : "Draft"} tone={post.isPublished ? "green" : "neutral"} />
                {post.pinned ? <Pill label="Pinned" tone="purple" /> : null}
              </Row>
              <Text style={{ color: colors.ink, fontWeight: "800" }}>{post.title}</Text>
              <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{excerpt(post.body, 140)}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {post.isPublished && post.publishedAt ? `Published ${formatDateTime(post.publishedAt)}` : `Last edited ${formatDateTime(post.updatedAt)}`}
                {post.author?.displayName ? ` · ${post.author.displayName}` : ""}
              </Text>
            </View>
          </Row>
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            <Button size="sm" title="Edit" variant="secondary" disabled={locked} onPress={() => startEdit(post)} />
            <Button size="sm" title={post.isPublished ? "Unpublish" : "Publish"} variant="secondary" loading={busyKey === `pub-${post.id}`} disabled={locked} onPress={() => void togglePublished(post)} />
            <Button size="sm" title={post.pinned ? "Unpin" : "Pin"} variant="secondary" loading={busyKey === `pin-${post.id}`} disabled={locked} onPress={() => void togglePinned(post)} />
            <Button size="sm" title="Delete" variant="dangerSoft" loading={busyKey === `del-${post.id}`} disabled={locked} onPress={() => void remove(post)} />
          </Row>
        </Card>
      ))}
    </>
  );
}
