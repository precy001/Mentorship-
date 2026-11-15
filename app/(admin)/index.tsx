import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, LayoutChangeEvent, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Card, Button, Field, Pill, Row, SectionHeader, StatTile, Chip, EmptyState, Avatar, LoadingBlock, IconBadge } from "@/src/components/UI";
import type { IconName } from "@/src/components/UI";
import { DatePickerField, ImageUploadField, SelectField, SmartImage, Toast } from "@/src/components/Forms";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import {
  AdminAppointment, AdminDashboardStats, AdminResource, AdminScholarship, AdminTopic, AdminUser, AuditLogRecord,
  PendingRating, ServiceAreaRecord, UnassignedDiscussion,
  apiAdminAppointments, apiAdminAssignTopics, apiAdminAuditLogs, apiAdminAutoAssignDiscussion, apiAdminCreateResource,
  apiAdminCreateScholarship, apiAdminCreateTopic, apiAdminDashboard, apiAdminDeleteResource, apiAdminDeleteScholarship,
  apiAdminInviteCounsellor, apiAdminModerateRating, apiAdminPendingRatings, apiAdminResources, apiAdminScholarships,
  apiAdminServiceAreas, apiAdminSetAccountStatus, apiAdminSetCounsellorAvailability, apiAdminSetResourceActive,
  apiAdminSetRole, apiAdminSetScholarshipActive, apiAdminSetServiceAreaActive, apiAdminSetTopicActive, apiAdminTopics,
  apiAdminUnassignedDiscussions, apiAdminUpdateResource, apiAdminUpdateScholarship, apiAdminUploadContentImage, apiAdminUsers,
} from "@/src/lib/api";
import { confirmAction, errorMessage, isSessionExpired, useToast } from "@/src/lib/feedback";
import type { PickedImage } from "@/src/lib/imagePicker";
import { READ_MINUTES_MAX, READ_MINUTES_MIN, RESOURCE_CATEGORIES, SCHOLARSHIP_LEVELS, minutesFromReadTime, readTimeLabel, toOptions } from "@/src/lib/options";
import {
  digitsOnly, endOfDayIso, formatDisplayDate, hasErrors, toDateString, validateChoice, validateDateString,
  validateEmail, validateInteger, validateLength,
} from "@/src/lib/validation";

type FormErrors = Record<string, string | null>;
type AdminSection = "overview" | "accounts" | "counselling" | "resources" | "scholarships" | "platform";
type Success = { title: string; message: string; toast?: boolean };
const emptyResource = { title: "", category: "", minutes: "5", description: "" };
const emptyScholarship = { title: "", provider: "", level: "", deadline: "", eligibility: "", description: "" };

export default function AdminDashboard() {
  const app = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<AdminSection>("overview");

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [scholarships, setScholarships] = useState<AdminScholarship[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaRecord[]>([]);
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [unassignedDiscussions, setUnassignedDiscussions] = useState<UnassignedDiscussion[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  // Topic and invitation forms
  const [newTopic, setNewTopic] = useState("");
  const [description, setDescription] = useState("");
  const [topicErrors, setTopicErrors] = useState<FormErrors>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTopicIds, setInviteTopicIds] = useState<string[]>([]);
  const [inviteErrors, setInviteErrors] = useState<FormErrors>({});

  // Resource form
  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [resourceErrors, setResourceErrors] = useState<FormErrors>({});
  const [resourceImage, setResourceImage] = useState<PickedImage | null>(null);
  const [resourceRemoveImage, setResourceRemoveImage] = useState(false);
  const [editingResource, setEditingResource] = useState<AdminResource | null>(null);
  const resourceUpload = useRef<{ uri: string; url: string } | null>(null);
  const resourceFormY = useRef(0);

  // Scholarship form
  const [scholarshipForm, setScholarshipForm] = useState(emptyScholarship);
  const [scholarshipErrors, setScholarshipErrors] = useState<FormErrors>({});
  const [scholarshipImage, setScholarshipImage] = useState<PickedImage | null>(null);
  const [scholarshipRemoveImage, setScholarshipRemoveImage] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<AdminScholarship | null>(null);
  const scholarshipUpload = useRef<{ uri: string; url: string } | null>(null);
  const scholarshipFormY = useRef(0);

  const [search, setSearch] = useState("");
  const searchTerm = useRef("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // One request at a time: the ref blocks double taps instantly, the state drives spinners.
  const lock = useRef(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const anyBusy = busyKey !== null;
  const isBusy = (key: string) => busyKey === key;

  const adminCardStyle = { borderRadius: 18, borderColor: "#E5EBEF", backgroundColor: "#FFFFFF" };
  const isSuperAdmin = app.user?.role === "super_admin";
  const isAdminRole = app.user?.role === "admin" || app.user?.role === "super_admin";
  const today = toDateString(new Date());

  const visibleItems = <T,>(section: string, items: T[]): T[] => (expandedSections[section] ? items : items.slice(0, 5));
  const renderSectionToggle = (section: string, count: number) =>
    count > 5 ? (
      <Button
        title={expandedSections[section] ? "Show less" : `View all (${count})`}
        variant="secondary"
        onPress={() => setExpandedSections((current) => ({ ...current, [section]: !current[section] }))}
      />
    ) : null;
  const emptyCard = (text: string) => <EmptyState icon="file-tray-outline" title={text} />;

  /* ---------------------------------------------------------------- access control */
  useEffect(() => {
    if (app.sessionLoading) return;
    if (!app.user) router.replace({ pathname: "/auth", params: { mode: "signin" } });
    else if (app.user.role === "counsellor") router.replace("/(counsellor)");
    else if (!isAdminRole) router.replace("/(student)");
  }, [app.sessionLoading, app.user, isAdminRole]);

  /* ---------------------------------------------------------------- data loading */
  const refresh = useCallback(async () => {
    setLoading(true);
    const names = ["Dashboard", "Accounts", "Topics", "Resources", "Scholarships", "Service areas", "Ratings", "Unassigned discussions", "Appointments", "Audit trail"];
    const results = await Promise.allSettled([
      apiAdminDashboard(), apiAdminUsers(searchTerm.current), apiAdminTopics(), apiAdminResources(), apiAdminScholarships(),
      apiAdminServiceAreas(), apiAdminPendingRatings(), apiAdminUnassignedDiscussions(), apiAdminAppointments(), apiAdminAuditLogs(),
    ]);
    const [s, u, t, r, sc, a, pr, ud, ap, au] = results;
    if (s.status === "fulfilled") setStats(s.value as AdminDashboardStats);
    if (u.status === "fulfilled") setUsers(u.value as AdminUser[]);
    if (t.status === "fulfilled") setTopics(t.value as AdminTopic[]);
    if (r.status === "fulfilled") setResources(r.value as AdminResource[]);
    if (sc.status === "fulfilled") setScholarships(sc.value as AdminScholarship[]);
    if (a.status === "fulfilled") setServiceAreas(a.value as ServiceAreaRecord[]);
    if (pr.status === "fulfilled") setPendingRatings(pr.value as PendingRating[]);
    if (ud.status === "fulfilled") setUnassignedDiscussions(ud.value as UnassignedDiscussion[]);
    if (ap.status === "fulfilled") setAppointments(ap.value as AdminAppointment[]);
    if (au.status === "fulfilled") setAuditLogs(au.value as AuditLogRecord[]);
    setLoadErrors(results.flatMap((result, index) => (result.status === "rejected" ? [`${names[index]}: ${errorMessage(result.reason)}`] : [])));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdminRole) void refresh();
  }, [refresh, isAdminRole]);

  const searchUsers = async (term: string) => {
    searchTerm.current = term.trim();
    setUsersLoading(true);
    try {
      setUsers(await apiAdminUsers(searchTerm.current));
    } catch (error) {
      Alert.alert("Search failed", errorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  /**
   * Runs one admin action with a single-flight lock, a spinner, backend-confirmed success feedback,
   * a meaningful error alert and a refresh of every affected list. Resolves true only on success.
   */
  const perform = async (key: string, errorTitle: string, task: () => Promise<unknown>, success?: Success): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusyKey(key);
    try {
      await task();
    } catch (error) {
      if (isSessionExpired(error)) {
        Alert.alert("Session expired", "Please sign in again to continue.", [
          { text: "Sign in", onPress: async () => { await app.logout(); router.replace({ pathname: "/auth", params: { mode: "signin", signedOut: "1" } }); } },
        ]);
      } else {
        Alert.alert(errorTitle, errorMessage(error));
      }
      lock.current = false;
      setBusyKey(null);
      return false;
    }
    await refresh();
    lock.current = false;
    setBusyKey(null);
    if (success) {
      if (success.toast) showToast(success.message);
      else Alert.alert(success.title, success.message);
    }
    return true;
  };

  /* ---------------------------------------------------------------- accounts */
  const changeRole = async (user: AdminUser, role: AdminUser["role"]) => {
    if (!(await confirmAction({ title: "Change account role", message: `Change ${user.email} from ${user.role} to ${role}?`, destructive: role === "MEMBER" }))) return;
    await perform(`role-${user.id}`, "Role update failed", () => apiAdminSetRole(user.id, role), { title: "Role updated", message: `${user.email} is now ${role}.` });
  };

  const setAccountStatus = async (user: AdminUser, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") => {
    const label = status === "ACTIVE" ? "reactivate" : status.toLowerCase().replace("deactivated", "deactivate").replace("suspended", "suspend");
    if (!(await confirmAction({ title: "Change account status", message: `Are you sure you want to ${label} ${user.email}?`, destructive: status !== "ACTIVE" }))) return;
    await perform(`status-${user.id}`, "Status update failed", () => apiAdminSetAccountStatus(user.id, status), { title: "Account updated", message: `${user.email} is now ${status.toLowerCase()}.` });
  };

  const assignAllTopics = async (user: AdminUser) => {
    const assigned = user.counsellorProfile?.topics.map((item) => item.topic.id) ?? [];
    const next = assigned.length ? [] : topics.filter((topic) => topic.isActive).map((topic) => topic.id);
    if (!assigned.length && !next.length) return Alert.alert("No active topics", "Create or reactivate a counselling topic first.");
    if (!(await confirmAction({ title: "Update counsellor topics", message: assigned.length ? `Remove all topic assignments for ${user.email}?` : `Assign all active topics to ${user.email}?`, destructive: assigned.length > 0 }))) return;
    await perform(`topics-${user.id}`, "Assignment failed", () => apiAdminAssignTopics(user.id, next), { title: "Topics updated", message: assigned.length ? "All topic assignments were removed." : "All active topics were assigned." });
  };

  const toggleCounsellorTopic = async (user: AdminUser, topicId: string) => {
    const current = user.counsellorProfile?.topics.map((item) => item.topic.id) ?? [];
    const activeCurrent = current.filter((id) => topics.some((topic) => topic.id === id && topic.isActive));
    const next = current.includes(topicId) ? activeCurrent.filter((id) => id !== topicId) : [...activeCurrent, topicId];
    await perform(`topic-${user.id}-${topicId}`, "Assignment failed", () => apiAdminAssignTopics(user.id, next), { title: "", message: "Counsellor topics updated.", toast: true });
  };

  const setCounsellorAvailability = (user: AdminUser, availability: "AVAILABLE" | "OFFLINE" | "ON_LEAVE") =>
    perform(`avail-${user.id}`, "Availability update failed", () => apiAdminSetCounsellorAvailability(user.id, availability), { title: "", message: `Availability set to ${availability.replace("_", " ").toLowerCase()}.`, toast: true });

  /* ---------------------------------------------------------------- invitations and topics */
  const inviteCounsellor = async () => {
    const errors: FormErrors = {
      email: validateEmail(inviteEmail),
      topics: inviteTopicIds.length ? null : "Select at least one counselling topic.",
    };
    setInviteErrors(errors);
    if (hasErrors(errors)) return;
    const email = inviteEmail.trim().toLowerCase();
    const ok = await perform("invite", "Invitation failed", () => apiAdminInviteCounsellor(email, inviteTopicIds), { title: "Invitation sent", message: `An invitation was emailed to ${email}. It expires in seven days.` });
    if (ok) { setInviteEmail(""); setInviteTopicIds([]); setInviteErrors({}); }
  };

  const addTopic = async () => {
    const duplicate = topics.some((topic) => topic.name.trim().toLowerCase() === newTopic.trim().toLowerCase());
    const errors: FormErrors = {
      name: validateLength(newTopic, "Topic name", { min: 2, max: 120 }) ?? (duplicate ? "A topic with this name already exists." : null),
      description: validateLength(description, "Description", { max: 500, required: false }),
    };
    setTopicErrors(errors);
    if (hasErrors(errors)) return;
    const name = newTopic.trim();
    const ok = await perform("topic-create", "Could not add topic", () => apiAdminCreateTopic(name, description.trim() || undefined), { title: "Topic created", message: `“${name}” is now available to members.` });
    if (ok) { setNewTopic(""); setDescription(""); setTopicErrors({}); }
  };

  const toggleTopic = async (topic: AdminTopic) => {
    if (topic.isActive && !(await confirmAction({ title: "Deactivate topic", message: `Members will no longer be able to choose “${topic.name}”. Existing discussions are kept.`, confirmText: "Deactivate", destructive: true }))) return;
    await perform(`topic-${topic.id}`, "Topic update failed", () => apiAdminSetTopicActive(topic.id, !topic.isActive), { title: "", message: `“${topic.name}” ${topic.isActive ? "deactivated" : "reactivated"}.`, toast: true });
  };

  const toggleServiceArea = async (area: ServiceAreaRecord) => {
    if (area.isActive && !(await confirmAction({ title: "Disable service area", message: `${area.lcda} will no longer be offered during registration.`, confirmText: "Disable", destructive: true }))) return;
    await perform(`area-${area.id}`, "Service area update failed", () => apiAdminSetServiceAreaActive(area.id, !area.isActive), { title: "", message: `${area.lcda} ${area.isActive ? "disabled" : "enabled"}.`, toast: true });
  };

  /* ---------------------------------------------------------------- resources */
  const resetResourceForm = () => {
    setResourceForm(emptyResource); setResourceErrors({}); setResourceImage(null); setResourceRemoveImage(false);
    setEditingResource(null); resourceUpload.current = null;
  };

  const editResource = (item: AdminResource) => {
    if (anyBusy) return;
    setEditingResource(item);
    setResourceForm({ title: item.title, category: item.category, minutes: minutesFromReadTime(item.readTime), description: item.description });
    setResourceErrors({}); setResourceImage(null); setResourceRemoveImage(false); resourceUpload.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(resourceFormY.current - 12, 0), animated: true });
    showToast("Editing loaded in the form above.");
  };

  const validateResource = (): FormErrors => ({
    title: validateLength(resourceForm.title, "Title", { min: 2, max: 180 }),
    category: validateChoice(resourceForm.category, "Category"),
    minutes: validateInteger(resourceForm.minutes, "Reading time", { min: READ_MINUTES_MIN, max: READ_MINUTES_MAX }),
    description: validateLength(resourceForm.description, "Description", { min: 2, max: 2000 }),
  });

  const submitResource = async () => {
    const errors = validateResource();
    setResourceErrors(errors);
    if (hasErrors(errors)) return showToast("Please fix the highlighted fields.", "error");
    const editing = editingResource;
    const input = { title: resourceForm.title.trim(), category: resourceForm.category, readTime: readTimeLabel(resourceForm.minutes), description: resourceForm.description.trim() };
    const ok = await perform("resource-save", editing ? "Resource not updated" : "Resource not saved", async () => {
      let imageUrl: string | null | undefined;
      if (resourceImage) {
        // Reuse an earlier upload of the same file so a retry after a failed save never uploads twice.
        if (resourceUpload.current?.uri !== resourceImage.uri) resourceUpload.current = { uri: resourceImage.uri, url: (await apiAdminUploadContentImage(resourceImage.uri)).imageUrl };
        imageUrl = resourceUpload.current.url;
      } else if (editing && resourceRemoveImage) imageUrl = null;
      const payload = imageUrl === undefined ? input : { ...input, imageUrl };
      return editing ? apiAdminUpdateResource(editing.id, payload) : apiAdminCreateResource(payload);
    }, editing ? { title: "Resource updated", message: `“${input.title}” was saved.` } : { title: "Resource published", message: `“${input.title}” is now visible to members in Explore.` });
    if (ok) resetResourceForm();
  };

  const toggleResource = async (item: AdminResource) => {
    if (item.isActive && !(await confirmAction({ title: "Unpublish resource", message: `“${item.title}” will be hidden from members.`, confirmText: "Unpublish", destructive: true }))) return;
    await perform(`resource-${item.id}`, "Resource update failed", () => apiAdminSetResourceActive(item.id, !item.isActive), { title: "", message: `“${item.title}” ${item.isActive ? "unpublished" : "published"}.`, toast: true });
  };

  const deleteResource = async (item: AdminResource) => {
    if (!(await confirmAction({ title: "Delete resource", message: `Permanently delete “${item.title}”${item.imageUrl ? " and its image" : ""}? This cannot be undone. Use Unpublish to hide it instead.`, confirmText: "Delete", destructive: true }))) return;
    const ok = await perform(`resource-del-${item.id}`, "Resource not deleted", () => apiAdminDeleteResource(item.id), { title: "Resource deleted", message: `“${item.title}” was removed.` });
    if (ok && editingResource?.id === item.id) resetResourceForm();
  };

  /* ---------------------------------------------------------------- scholarships */
  const resetScholarshipForm = () => {
    setScholarshipForm(emptyScholarship); setScholarshipErrors({}); setScholarshipImage(null); setScholarshipRemoveImage(false);
    setEditingScholarship(null); scholarshipUpload.current = null;
  };

  const editScholarship = (item: AdminScholarship) => {
    if (anyBusy) return;
    setEditingScholarship(item);
    setScholarshipForm({ title: item.title, provider: item.provider, level: item.level, deadline: toDateString(new Date(item.deadline)), eligibility: item.eligibility, description: item.description });
    setScholarshipErrors({}); setScholarshipImage(null); setScholarshipRemoveImage(false); scholarshipUpload.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(scholarshipFormY.current - 12, 0), animated: true });
    showToast("Editing loaded in the form above.");
  };

  const submitScholarship = async () => {
    const f = scholarshipForm;
    const editing = editingScholarship;
    // An already-expired listing may keep its old deadline while other details are corrected.
    const unchangedDeadline = !!editing && f.deadline === toDateString(new Date(editing.deadline));
    const errors: FormErrors = {
      title: validateLength(f.title, "Title", { min: 2, max: 180 }),
      provider: validateLength(f.provider, "Provider", { min: 2, max: 180 }),
      level: validateChoice(f.level, "Level"),
      deadline: validateDateString(f.deadline, "Deadline", { min: unchangedDeadline ? undefined : today }),
      eligibility: validateLength(f.eligibility, "Eligibility", { min: 2, max: 2000 }),
      description: validateLength(f.description, "Description", { min: 2, max: 2000 }),
    };
    setScholarshipErrors(errors);
    if (hasErrors(errors)) return showToast("Please fix the highlighted fields.", "error");
    const input = { title: f.title.trim(), provider: f.provider.trim(), level: f.level, deadline: unchangedDeadline && editing ? editing.deadline : endOfDayIso(f.deadline), eligibility: f.eligibility.trim(), description: f.description.trim() };
    const ok = await perform("scholarship-save", editing ? "Scholarship not updated" : "Scholarship not saved", async () => {
      let imageUrl: string | null | undefined;
      if (scholarshipImage) {
        if (scholarshipUpload.current?.uri !== scholarshipImage.uri) scholarshipUpload.current = { uri: scholarshipImage.uri, url: (await apiAdminUploadContentImage(scholarshipImage.uri)).imageUrl };
        imageUrl = scholarshipUpload.current.url;
      } else if (editing && scholarshipRemoveImage) imageUrl = null;
      const payload = imageUrl === undefined ? input : { ...input, imageUrl };
      return editing ? apiAdminUpdateScholarship(editing.id, payload) : apiAdminCreateScholarship(payload);
    }, editing ? { title: "Scholarship updated", message: `“${input.title}” was saved.` } : { title: "Scholarship published", message: `“${input.title}” is now visible to members in Explore.` });
    if (ok) resetScholarshipForm();
  };

  const toggleScholarship = async (item: AdminScholarship) => {
    if (item.isActive && !(await confirmAction({ title: "Unpublish scholarship", message: `“${item.title}” will be hidden from members.`, confirmText: "Unpublish", destructive: true }))) return;
    await perform(`scholarship-${item.id}`, "Scholarship update failed", () => apiAdminSetScholarshipActive(item.id, !item.isActive), { title: "", message: `“${item.title}” ${item.isActive ? "unpublished" : "published"}.`, toast: true });
  };

  const deleteScholarship = async (item: AdminScholarship) => {
    if (!(await confirmAction({ title: "Delete scholarship", message: `Permanently delete “${item.title}”${item.imageUrl ? " and its image" : ""}? This cannot be undone. Use Unpublish to hide it instead.`, confirmText: "Delete", destructive: true }))) return;
    const ok = await perform(`scholarship-del-${item.id}`, "Scholarship not deleted", () => apiAdminDeleteScholarship(item.id), { title: "Scholarship deleted", message: `“${item.title}” was removed.` });
    if (ok && editingScholarship?.id === item.id) resetScholarshipForm();
  };

  /* ---------------------------------------------------------------- moderation */
  const moderate = async (rating: PendingRating, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !(await confirmAction({ title: "Reject rating", message: "This rating will not count towards the counsellor's average.", confirmText: "Reject", destructive: true }))) return;
    await perform(`rating-${rating.id}`, status === "APPROVED" ? "Rating not approved" : "Rating not rejected", () => apiAdminModerateRating(rating.id, status), { title: "Rating moderated", message: `The rating was ${status.toLowerCase()}.` });
  };

  const autoAssign = (item: UnassignedDiscussion) =>
    perform(`assign-${item.id}`, "Assignment failed", () => apiAdminAutoAssignDiscussion(item.id), { title: "Counsellor assigned", message: `“${item.title}” was assigned to an available counsellor.` });

  const signOut = () =>
    Alert.alert("Sign out?", "Return to sign in?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", onPress: async () => { await app.logout(); router.replace({ pathname: "/auth", params: { mode: "signin", signedOut: "1" } }); } },
    ]);

  const keepY = (target: React.MutableRefObject<number>) => (event: LayoutChangeEvent) => { target.current = event.nativeEvent.layout.y; };
  const categoryOptions = toOptions(RESOURCE_CATEGORIES);
  const levelOptions = toOptions(SCHOLARSHIP_LEVELS);
  const activeTopics = topics.filter((topic) => topic.isActive);
  const h = (title: string, subtitle: string) => <SectionHeader title={title} subtitle={subtitle} />;
  const title = (text: string, sub: string) => (
    <>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 16, fontWeight: "800" }}>{text}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{sub}</Text>
    </>
  );
  const itemHeader = (name: string, meta: string, active: boolean, imageUrl: string | null, activeLabel: string, inactiveLabel: string, icon: "book-outline" | "school-outline") => (
    <Row style={{ alignItems: "flex-start", gap: 12 }}>
      <View style={{ width: 84 }}><SmartImage uri={imageUrl} aspectRatio={1} radius={14} fallbackIcon={icon} accessibilityLabel={imageUrl ? `Image for ${name}` : undefined} /></View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.ink, fontWeight: "800" }}>{name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{meta}</Text>
        <Pill label={active ? activeLabel : inactiveLabel} tone={active ? "green" : "red"} />
      </View>
    </Row>
  );

  const switchSection = (next: AdminSection) => {
    setSection(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const attention = pendingRatings.length + unassignedDiscussions.length;
  const sections: { key: AdminSection; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "accounts", label: "Accounts" },
    { key: "counselling", label: "Counselling", count: attention },
    { key: "resources", label: "Resources" },
    { key: "scholarships", label: "Scholarships" },
    { key: "platform", label: "Platform" },
  ];
  const statTiles: { label: string; value: number; icon: IconName; tone?: "brand" | "green" | "amber" | "red" | "neutral"; highlight?: boolean }[] = stats ? [
    { label: "Total accounts", value: stats.users, icon: "people-outline" },
    { label: "Active members", value: stats.members, icon: "person-outline" },
    { label: "Counsellors", value: stats.counsellors, icon: "chatbubbles-outline" },
    { label: "Administrators", value: stats.admins, icon: "shield-checkmark-outline" },
    { label: "Active topics", value: stats.topics, icon: "pricetags-outline" },
    { label: "Open discussions", value: stats.openDiscussions, icon: "chatbubble-ellipses-outline" },
    { label: "Upcoming appointments", value: stats.appointments, icon: "calendar-outline" },
    { label: "Ratings to review", value: stats.pendingRatings, icon: "star-half-outline", tone: "amber", highlight: stats.pendingRatings > 0 },
    { label: "Published resources", value: stats.resources, icon: "book-outline" },
    { label: "Published scholarships", value: stats.scholarships, icon: "school-outline" },
  ] : [];

  if (app.sessionLoading || !isAdminRole) return <Screen><LoadingBlock label="Opening administration…" /></Screen>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 10, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 22, paddingBottom: 12 }}>
          <IconBadge icon="shield-checkmark-outline" size={44} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }}>{isSuperAdmin ? "Super Admin dashboard" : "Admin dashboard"}</Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>{app.user?.name || "Administrator"}</Text>
          </View>
          <Button title="Sign out" variant="ghost" size="sm" icon="log-out-outline" onPress={signOut} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingBottom: 12 }}>
          {sections.map((item) => <Chip key={item.key} label={item.label} count={item.count} accessibilityRole="tab" selected={section === item.key} onPress={() => switchSection(item.key)} />)}
        </ScrollView>
      </View>

      <Screen scrollRef={scrollRef} safeTop={false} onRefresh={refresh} refreshing={loading && !!stats}>
        {loadErrors.length ? (
          <Card style={{ ...adminCardStyle, borderColor: "#F3B5B5", backgroundColor: colors.errorBg }}>
            <Text style={{ color: colors.error, fontWeight: "800" }}>Some administration data could not load</Text>
            {loadErrors.map((line) => <Text key={line} style={{ color: colors.error, fontSize: 12, lineHeight: 18 }}>{line}</Text>)}
            <Button title="Retry" variant="secondary" size="sm" loading={loading} onPress={() => void refresh()} />
          </Card>
        ) : null}
        {loading && !stats ? <LoadingBlock label="Loading platform data…" /> : null}

        {section === "overview" ? <>
          {h("Platform overview", "A live snapshot of accounts, counselling activity and published content.")}
          {stats ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {statTiles.map((tile) => <StatTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} tone={tile.tone} highlight={tile.highlight} />)}
            </View>
          ) : null}
          {stats ? (
            <Card style={adminCardStyle}>
              {title(attention ? "Needs your attention" : "Nothing needs attention", attention ? "These items are waiting on an administrator." : "There are no pending ratings or unassigned discussions.")}
              {pendingRatings.length ? <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, flex: 1 }}>{pendingRatings.length} {pendingRatings.length === 1 ? "rating" : "ratings"} awaiting moderation</Text><Button size="sm" title="Review" variant="secondary" onPress={() => switchSection("counselling")} /></Row> : null}
              {unassignedDiscussions.length ? <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, flex: 1 }}>{unassignedDiscussions.length} {unassignedDiscussions.length === 1 ? "discussion" : "discussions"} awaiting a counsellor</Text><Button size="sm" title="Assign" variant="secondary" onPress={() => switchSection("counselling")} /></Row> : null}
            </Card>
          ) : null}
          <Button title="Refresh platform data" icon="refresh" variant="secondary" loading={loading} disabled={anyBusy} onPress={() => void refresh()} />
        </> : null}

        {section === "accounts" ? <>
        {/* ------------------------------------------------ accounts */}
        {h("Account management", `Search accounts and manage access · ${users.length} accounts. Super Admin privileges are required to appoint administrators.`)}
        <Card style={adminCardStyle}>
          {title("Find an account", "Search by a member name or email address, then manage their access below.")}
          <Field label="Search by name or email" value={search} onChangeText={setSearch} placeholder="Enter name or email" optional autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
          <Button title="Search accounts" variant="secondary" loading={usersLoading} disabled={anyBusy} onPress={() => void searchUsers(search)} />
          {searchTerm.current ? <Button title="Clear search" variant="ghost" disabled={usersLoading || anyBusy} onPress={() => { setSearch(""); void searchUsers(""); }} /> : null}
          <Button title="Refresh platform data" variant="secondary" loading={loading} disabled={anyBusy} onPress={() => void refresh()} />
        </Card>
        {visibleItems("users", users).map((user) => {
          const canManage = user.id !== app.user?.id && (isSuperAdmin || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"));
          return (
            <Card key={user.id} style={adminCardStyle}>
              <Row style={{ alignItems: "center", gap: 12 }}>
                <Avatar name={user.displayName || user.email} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>{user.displayName || "Unnamed account"}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{user.email}</Text>
                </View>
              </Row>
              <View style={{ gap: 8 }}>
                <Row style={{ gap: 6, flexWrap: "wrap" }}>
                  <Pill label={user.role} tone={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "green" : "blue"} />
                  <Pill label={user.status} tone={user.status === "ACTIVE" ? "green" : "red"} />
                  <Pill label={user.emailVerifiedAt ? "Email verified" : "Unverified"} tone={user.emailVerifiedAt ? "green" : "red"} />
                </Row>
                {user.role === "COUNSELLOR" && user.counsellorProfile ? <Text style={{ color: colors.muted, fontSize: 12 }}>Topics: {user.counsellorProfile.topics.map((t) => t.topic.name).join(", ") || "None assigned"}</Text> : null}
              </View>
              <Row style={{ flexWrap: "wrap", gap: 8 }}>
                {user.role === "MEMBER" ? <Button size="sm" title="Make counsellor" loading={isBusy(`role-${user.id}`)} disabled={anyBusy} onPress={() => void changeRole(user, "COUNSELLOR")} /> : null}
                {user.role === "COUNSELLOR" ? <Button size="sm" title="Remove counsellor role" variant="secondary" loading={isBusy(`role-${user.id}`)} disabled={anyBusy} onPress={() => void changeRole(user, "MEMBER")} /> : null}
                {user.role === "COUNSELLOR" ? <Button size="sm" title={user.counsellorProfile?.topics.length ? "Clear all topics" : "Assign all topics"} variant="secondary" loading={isBusy(`topics-${user.id}`)} disabled={anyBusy} onPress={() => void assignAllTopics(user)} /> : null}
                {isSuperAdmin && user.role === "MEMBER" && user.id !== app.user?.id ? <Button size="sm" title="Make admin" variant="secondary" loading={isBusy(`role-${user.id}`)} disabled={anyBusy} onPress={() => void changeRole(user, "ADMIN")} /> : null}
                {isSuperAdmin && user.role === "ADMIN" ? <Button size="sm" title="Revoke admin" variant="danger" loading={isBusy(`role-${user.id}`)} disabled={anyBusy} onPress={() => void changeRole(user, "MEMBER")} /> : null}
                {canManage && user.status === "ACTIVE" ? <Button size="sm" title="Suspend" variant="dangerSoft" loading={isBusy(`status-${user.id}`)} disabled={anyBusy} onPress={() => void setAccountStatus(user, "SUSPENDED")} /> : null}
                {canManage && user.status === "ACTIVE" ? <Button size="sm" title="Deactivate" variant="dangerSoft" loading={isBusy(`status-${user.id}`)} disabled={anyBusy} onPress={() => void setAccountStatus(user, "DEACTIVATED")} /> : null}
                {canManage && user.status !== "ACTIVE" && user.emailVerifiedAt ? <Button size="sm" title="Reactivate" variant="secondary" loading={isBusy(`status-${user.id}`)} disabled={anyBusy} onPress={() => void setAccountStatus(user, "ACTIVE")} /> : null}
              </Row>
              {user.role === "COUNSELLOR" && user.counsellorProfile ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>Availability · {user.counsellorProfile.availability.replace("_", " ").toLowerCase()}</Text>
                  <Row style={{ flexWrap: "wrap", gap: 7 }}>
                    {(["AVAILABLE", "OFFLINE", "ON_LEAVE"] as const).map((value, index) => (
                      <Button size="sm" key={value} title={value === "ON_LEAVE" ? "On leave" : value === "OFFLINE" ? "Offline" : "Available"} variant={index === 0 ? "primary" : index === 1 ? "secondary" : "ghost"} loading={isBusy(`avail-${user.id}`) && user.counsellorProfile?.availability !== value} disabled={anyBusy || user.counsellorProfile?.availability === value} onPress={() => void setCounsellorAvailability(user, value)} />
                    ))}
                  </Row>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>Manage assigned topics</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                    {topics.filter((topic) => topic.isActive || user.counsellorProfile?.topics.some((item) => item.topic.id === topic.id)).map((topic) => {
                      const assigned = user.counsellorProfile?.topics.some((item) => item.topic.id === topic.id) ?? false;
                      return (
                        <Pressable key={topic.id} accessibilityRole="checkbox" accessibilityState={{ checked: assigned, disabled: anyBusy }} disabled={anyBusy} onPress={() => void toggleCounsellorTopic(user, topic.id)} style={{ opacity: anyBusy && !isBusy(`topic-${user.id}-${topic.id}`) ? 0.55 : 1 }}>
                          <Pill label={`${assigned ? "✓ " : "+ "}${topic.name}`} tone={assigned ? "green" : "blue"} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })}
        {renderSectionToggle("users", users.length)}
        {!users.length && !loading ? emptyCard(searchTerm.current ? `No accounts match “${searchTerm.current}”.` : "No accounts were found.") : null}


        {/* ------------------------------------------------ invitations */}
        {h("Invite a counsellor", "Send an invitation to an existing Mentorship+ account or a new registrant. The invitee must sign in with the invited email and accept the link.")}
        <Card style={adminCardStyle}>
          {title("Invitation details", "Choose the email address and counselling topics for the invitation.")}
          <Field label="Counsellor email address" value={inviteEmail} onChangeText={(v) => { setInviteEmail(v); if (inviteErrors.email) setInviteErrors((e) => ({ ...e, email: null })); }} placeholder="counsellor@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" required error={inviteErrors.email} onBlur={() => inviteEmail && setInviteErrors((e) => ({ ...e, email: validateEmail(inviteEmail) }))} />
          <Text style={{ color: colors.ink, fontWeight: "700" }}>Assign topics <Text style={{ color: colors.error }}>*</Text></Text>
          {activeTopics.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {activeTopics.map((topic) => {
                const selected = inviteTopicIds.includes(topic.id);
                return (
                  <Pressable key={topic.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => { setInviteTopicIds((c) => (selected ? c.filter((id) => id !== topic.id) : [...c, topic.id])); setInviteErrors((e) => ({ ...e, topics: null })); }}>
                    <Pill label={`${selected ? "✓ " : "+ "}${topic.name}`} tone={selected ? "green" : "blue"} />
                  </Pressable>
                );
              })}
            </View>
          ) : <Text style={{ color: colors.muted, fontSize: 12 }}>No active topics yet. Create a counselling topic below first.</Text>}
          {inviteErrors.topics ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>{inviteErrors.topics}</Text> : null}
          <Button title={isBusy("invite") ? "Sending…" : "Send counsellor invitation"} loading={isBusy("invite")} disabled={anyBusy} onPress={() => void inviteCounsellor()} />
        </Card>

        </> : null}

        {section === "counselling" ? <>
        {/* ------------------------------------------------ appointments */}
        {h("Appointment oversight", `Review appointment requests and their current status · ${appointments.length} records. Members and assigned counsellors manage changes.`)}
        {visibleItems("appointments", appointments).map((item) => (
          <Card key={item.id} style={adminCardStyle}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{item.member.displayName || item.member.email}</Text>
              <Pill label={item.status.replaceAll("_", " ")} tone={item.status === "COMPLETED" ? "green" : item.status === "CANCELLED" || item.status === "NO_SHOW" ? "red" : "amber"} />
            </Row>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{item.topic?.name || "Counselling"} · {item.counsellor.user.displayName || item.counsellor.user.email}</Text>
            <Text style={{ color: colors.muted }}>{new Date(item.startsAt).toLocaleString()}</Text>
          </Card>
        ))}
        {renderSectionToggle("appointments", appointments.length)}
        {!appointments.length && !loading ? emptyCard("No appointment records yet.") : null}


        {/* ------------------------------------------------ discussions */}
        {h("Unassigned counselling discussions", `Automatically assign open discussions to an available counsellor with the matching topic and lowest current load · ${unassignedDiscussions.length} awaiting assignment.`)}
        {visibleItems("unassignedDiscussions", unassignedDiscussions).map((item) => (
          <Card key={item.id} style={adminCardStyle}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>{item.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{item.topic.name} · {item.creator.displayName || item.creator.email} · {item._count.messages} messages</Text>
            <Button title="Auto-assign counsellor" loading={isBusy(`assign-${item.id}`)} disabled={anyBusy} onPress={() => void autoAssign(item)} />
          </Card>
        ))}
        {renderSectionToggle("unassignedDiscussions", unassignedDiscussions.length)}
        {!unassignedDiscussions.length && !loading ? emptyCard("There are no unassigned discussions.") : null}


        {/* ------------------------------------------------ ratings */}
        {h("Counsellor rating moderation", `Only approved ratings contribute to public counsellor averages · ${pendingRatings.length} awaiting review.`)}
        {visibleItems("pendingRatings", pendingRatings).map((rating) => (
          <Card key={rating.id} style={adminCardStyle}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>{rating.score}/5 · {rating.counsellor.user.displayName || rating.counsellor.user.email}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>From {rating.author.displayName || rating.author.email} · {rating.discussion?.title || "Appointment rating"}</Text>
            {rating.feedback ? <Text style={{ color: colors.muted }}>{rating.feedback}</Text> : null}
            <Row style={{ gap: 8 }}>
              <Button size="sm" title="Approve" loading={isBusy(`rating-${rating.id}`)} disabled={anyBusy} onPress={() => void moderate(rating, "APPROVED")} />
              <Button size="sm" title="Reject" variant="dangerSoft" disabled={anyBusy} onPress={() => void moderate(rating, "REJECTED")} />
            </Row>
          </Card>
        ))}
        {renderSectionToggle("pendingRatings", pendingRatings.length)}
        {!pendingRatings.length && !loading ? emptyCard("No ratings are waiting for moderation.") : null}


        {/* ------------------------------------------------ topics */}
        {h("Counselling topic management", `Create topics and control whether members can select them · ${topics.length} topics.`)}
        <Card style={adminCardStyle}>
          {title("Create a counselling topic", "Topics help members find the right counselling support.")}
          <Field label="Topic name" value={newTopic} onChangeText={(v) => { setNewTopic(v); if (topicErrors.name) setTopicErrors((e) => ({ ...e, name: null })); }} placeholder="e.g. Career development" required maxLength={120} error={topicErrors.name} editable={!anyBusy} />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="What this topic covers" multiline optional maxLength={500} error={topicErrors.description} editable={!anyBusy} />
          <Button title={isBusy("topic-create") ? "Saving…" : "Add topic"} loading={isBusy("topic-create")} disabled={anyBusy} onPress={() => void addTopic()} />
        </Card>
        {visibleItems("topics", topics).map((topic) => (
          <Card key={topic.id} style={adminCardStyle}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.ink, fontWeight: "800" }}>{topic.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{topic.description || "No description"} · {topic._count.counsellors} counsellors · {topic._count.discussions} discussions</Text>
              </View>
              <Pill label={topic.isActive ? "Active" : "Inactive"} tone={topic.isActive ? "green" : "red"} />
            </Row>
            <Button size="sm" title={topic.isActive ? "Deactivate topic" : "Reactivate topic"} variant="secondary" loading={isBusy(`topic-${topic.id}`)} disabled={anyBusy} onPress={() => void toggleTopic(topic)} />
          </Card>
        ))}
        {renderSectionToggle("topics", topics.length)}
        {!topics.length && !loading ? emptyCard("No counselling topics yet. Create the first one above.") : null}

        </> : null}

        {section === "resources" ? <>
        {/* ------------------------------------------------ resources */}
        {h("Resource management", `Publish and manage learning resources shown in Explore · ${resources.length} resources.`)}
        <View onLayout={keepY(resourceFormY)}>
          <Card style={adminCardStyle}>
            {title(editingResource ? "Edit resource" : "Create a resource", editingResource ? `Editing “${editingResource.title}”. Changes apply as soon as you save.` : "Add learning content to the Explore section. Fields marked * are required.")}
            <Field label="Resource title" value={resourceForm.title} onChangeText={(v) => setResourceForm((f) => ({ ...f, title: v }))} placeholder="Title" required maxLength={180} error={resourceErrors.title} editable={!anyBusy} />
            <SelectField label="Category" value={resourceForm.category} options={categoryOptions} onChange={(v) => { setResourceForm((f) => ({ ...f, category: v })); setResourceErrors((e) => ({ ...e, category: null })); }} placeholder="Select a category" required error={resourceErrors.category} disabled={anyBusy} />
            <Field label="Reading time (minutes)" value={resourceForm.minutes} onChangeText={(v) => setResourceForm((f) => ({ ...f, minutes: digitsOnly(v).slice(0, 3) }))} placeholder="5" keyboardType="number-pad" required helper={`Whole minutes, ${READ_MINUTES_MIN}–${READ_MINUTES_MAX}.`} error={resourceErrors.minutes} editable={!anyBusy} />
            <Field label="Description" value={resourceForm.description} onChangeText={(v) => setResourceForm((f) => ({ ...f, description: v }))} placeholder="Resource summary" multiline required maxLength={2000} error={resourceErrors.description} editable={!anyBusy} />
            <ImageUploadField label="Cover image" picked={resourceImage} existingUrl={editingResource?.imageUrl} existingRemoved={resourceRemoveImage} onPick={(image) => { setResourceImage(image); setResourceRemoveImage(false); }} onRemove={() => { if (resourceImage) setResourceImage(null); else setResourceRemoveImage(true); }} disabled={anyBusy} />
            <Button title={isBusy("resource-save") ? (resourceImage ? "Uploading and saving…" : "Saving…") : editingResource ? "Save changes" : "Publish resource"} loading={isBusy("resource-save")} disabled={anyBusy} onPress={() => void submitResource()} />
            {editingResource ? <Button title="Cancel editing" variant="ghost" disabled={anyBusy} onPress={resetResourceForm} /> : null}
          </Card>
        </View>
        {visibleItems("resources", resources).map((item) => (
          <Card key={item.id} style={adminCardStyle}>
            {itemHeader(item.title, `${item.category} · ${item.readTime}`, item.isActive, item.imageUrl, "Published", "Unpublished", "book-outline")}
            <Row style={{ flexWrap: "wrap", gap: 8 }}>
              <Button size="sm" title="Edit" variant="secondary" disabled={anyBusy} onPress={() => editResource(item)} />
              <Button size="sm" title={item.isActive ? "Unpublish" : "Publish"} variant="secondary" loading={isBusy(`resource-${item.id}`)} disabled={anyBusy} onPress={() => void toggleResource(item)} />
              <Button size="sm" title="Delete" variant="danger" loading={isBusy(`resource-del-${item.id}`)} disabled={anyBusy} onPress={() => void deleteResource(item)} />
            </Row>
          </Card>
        ))}
        {renderSectionToggle("resources", resources.length)}
        {!resources.length && !loading ? emptyCard("No resources yet. Use the form above to publish the first one.") : null}

        </> : null}

        {section === "scholarships" ? <>
        {/* ------------------------------------------------ scholarships */}
        {h("Scholarship management", `Publish verified opportunities and manage their visibility · ${scholarships.length} listings.`)}
        <View onLayout={keepY(scholarshipFormY)}>
          <Card style={adminCardStyle}>
            {title(editingScholarship ? "Edit scholarship" : "Create a scholarship listing", editingScholarship ? `Editing “${editingScholarship.title}”.` : "Publish an opportunity with clear eligibility and deadline details. Fields marked * are required.")}
            <Field label="Scholarship title" value={scholarshipForm.title} onChangeText={(v) => setScholarshipForm((f) => ({ ...f, title: v }))} placeholder="Title" required maxLength={180} error={scholarshipErrors.title} editable={!anyBusy} />
            <Field label="Provider" value={scholarshipForm.provider} onChangeText={(v) => setScholarshipForm((f) => ({ ...f, provider: v }))} placeholder="Provider organisation" required maxLength={180} error={scholarshipErrors.provider} editable={!anyBusy} />
            <SelectField label="Eligible level" value={scholarshipForm.level} options={levelOptions} onChange={(v) => { setScholarshipForm((f) => ({ ...f, level: v })); setScholarshipErrors((e) => ({ ...e, level: null })); }} placeholder="Select a level" required error={scholarshipErrors.level} disabled={anyBusy} />
            <DatePickerField label="Application deadline" value={scholarshipForm.deadline} onChange={(v) => { setScholarshipForm((f) => ({ ...f, deadline: v })); setScholarshipErrors((e) => ({ ...e, deadline: null })); }} minDate={editingScholarship && scholarshipForm.deadline === toDateString(new Date(editingScholarship.deadline)) ? undefined : today} maxDate={`${new Date().getFullYear() + 10}-12-31`} required error={scholarshipErrors.deadline} disabled={anyBusy} helper={scholarshipForm.deadline ? `Closes at the end of ${formatDisplayDate(scholarshipForm.deadline)}.` : undefined} />
            <Field label="Eligibility" value={scholarshipForm.eligibility} onChangeText={(v) => setScholarshipForm((f) => ({ ...f, eligibility: v }))} placeholder="Eligibility requirements" multiline required maxLength={2000} error={scholarshipErrors.eligibility} editable={!anyBusy} />
            <Field label="Description" value={scholarshipForm.description} onChangeText={(v) => setScholarshipForm((f) => ({ ...f, description: v }))} placeholder="Opportunity details" multiline required maxLength={2000} error={scholarshipErrors.description} editable={!anyBusy} />
            <ImageUploadField label="Scholarship image" picked={scholarshipImage} existingUrl={editingScholarship?.imageUrl} existingRemoved={scholarshipRemoveImage} onPick={(image) => { setScholarshipImage(image); setScholarshipRemoveImage(false); }} onRemove={() => { if (scholarshipImage) setScholarshipImage(null); else setScholarshipRemoveImage(true); }} disabled={anyBusy} />
            <Button title={isBusy("scholarship-save") ? (scholarshipImage ? "Uploading and saving…" : "Saving…") : editingScholarship ? "Save changes" : "Publish scholarship"} loading={isBusy("scholarship-save")} disabled={anyBusy} onPress={() => void submitScholarship()} />
            {editingScholarship ? <Button title="Cancel editing" variant="ghost" disabled={anyBusy} onPress={resetScholarshipForm} /> : null}
          </Card>
        </View>
        {visibleItems("scholarships", scholarships).map((item) => (
          <Card key={item.id} style={adminCardStyle}>
            {itemHeader(item.title, `${item.provider} · ${item.level} · Deadline ${formatDisplayDate(item.deadline)}`, item.isActive, item.imageUrl, "Published", "Unpublished", "school-outline")}
            <Row style={{ flexWrap: "wrap", gap: 8 }}>
              <Button size="sm" title="Edit" variant="secondary" disabled={anyBusy} onPress={() => editScholarship(item)} />
              <Button size="sm" title={item.isActive ? "Unpublish" : "Publish"} variant="secondary" loading={isBusy(`scholarship-${item.id}`)} disabled={anyBusy} onPress={() => void toggleScholarship(item)} />
              <Button size="sm" title="Delete" variant="danger" loading={isBusy(`scholarship-del-${item.id}`)} disabled={anyBusy} onPress={() => void deleteScholarship(item)} />
            </Row>
          </Card>
        ))}
        {renderSectionToggle("scholarships", scholarships.length)}
        {!scholarships.length && !loading ? emptyCard("No scholarships yet. Use the form above to publish the first one.") : null}

        </> : null}

        {section === "platform" ? <>
        {/* ------------------------------------------------ service areas */}
        {h("LGA / LCDA access management", `Control which Lagos service areas are available during registration · ${serviceAreas.length} areas.`)}
        {visibleItems("serviceAreas", serviceAreas).map((area) => (
          <Card key={area.id} style={adminCardStyle}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.ink, fontWeight: "800" }}>{area.lga}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{area.lcda} · {area.state}</Text>
              </View>
              <Pill label={area.isActive ? "Available" : "Disabled"} tone={area.isActive ? "green" : "red"} />
            </Row>
            <Button size="sm" title={area.isActive ? "Disable area" : "Enable area"} variant="secondary" loading={isBusy(`area-${area.id}`)} disabled={anyBusy} onPress={() => void toggleServiceArea(area)} />
          </Card>
        ))}
        {renderSectionToggle("serviceAreas", serviceAreas.length)}
        {!serviceAreas.length && !loading ? emptyCard("No service areas are configured.") : null}


        {/* ------------------------------------------------ audit */}
        {h("Administrative audit trail", `Recent account, topic, content, appointment and moderation actions · ${auditLogs.length} entries.`)}
        {visibleItems("auditLogs", auditLogs).map((log) => (
          <Card key={log.id} style={adminCardStyle}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>{log.action.replaceAll("_", " ")}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{log.actor?.displayName || log.actor?.email || "System"} · {log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(log.createdAt).toLocaleString()}</Text>
          </Card>
        ))}
        {renderSectionToggle("auditLogs", auditLogs.length)}
        {!auditLogs.length && !loading ? emptyCard("No administrative actions have been recorded yet.") : null}
        </> : null}

        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>
          Sensitive member wellbeing entries are not exposed in this dashboard. Discussion access is restricted to the member, their assigned counsellor and authorised administrators.
        </Text>
      </Screen>
      <Toast toast={toast} onDismiss={hideToast} />
    </View>
  );
}
