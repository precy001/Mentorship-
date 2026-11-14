
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, Row } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import {
  AdminDashboardStats,
  AdminTopic,
  AdminUser,
  apiAdminDashboard,
  apiAdminUsers,
  apiAdminTopics,
  apiAdminCreateTopic,
  apiAdminSetRole,
  apiAdminSetTopicActive,
  apiAdminAssignTopics,
  apiAdminInviteCounsellor,
  apiAdminSetAccountStatus,
  apiAdminSetCounsellorAvailability,
  apiAdminResources,
  apiAdminCreateResource,
  apiAdminSetResourceActive,
  apiAdminScholarships,
  apiAdminCreateScholarship,
  apiAdminSetScholarshipActive,
  apiAdminServiceAreas,
  apiAdminSetServiceAreaActive,
  AdminResource,
  AdminScholarship,
  ServiceAreaRecord,
  apiAdminPendingRatings,
  apiAdminModerateRating,
  PendingRating,
  apiAdminUnassignedDiscussions,
  apiAdminAutoAssignDiscussion,
  UnassignedDiscussion,
  apiAdminAppointments,
  apiAdminAuditLogs,
  AdminAppointment,
  AuditLogRecord,
} from "@/src/lib/api";

export default function AdminDashboard() {
  const app = useApp();

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

  const [newTopic, setNewTopic] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTopicIds, setInviteTopicIds] = useState<string[]>([]);

  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceCategory, setResourceCategory] = useState("General");
  const [resourceReadTime, setResourceReadTime] = useState("5 min read");
  const [resourceDescription, setResourceDescription] = useState("");

  const [scholarshipTitle, setScholarshipTitle] = useState("");
  const [scholarshipProvider, setScholarshipProvider] = useState("");
  const [scholarshipLevel, setScholarshipLevel] = useState("All levels");
  const [scholarshipDeadline, setScholarshipDeadline] = useState("");
  const [scholarshipEligibility, setScholarshipEligibility] = useState("");
  const [scholarshipDescription, setScholarshipDescription] = useState("");

  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = app.user?.role === "super_admin";

  useEffect(() => {
    if (app.sessionLoading) return;

    if (!app.user) {
      router.replace({ pathname: "/auth", params: { mode: "signin" } });
    } else if (app.user.role === "counsellor") {
      router.replace("/(counsellor)");
    } else if (
      app.user.role !== "admin" &&
      app.user.role !== "super_admin"
    ) {
      router.replace("/(student)");
    }
  }, [app.sessionLoading, app.user]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const [
        nextStats,
        nextUsers,
        nextTopics,
        nextResources,
        nextScholarships,
        nextAreas,
        nextRatings,
        nextUnassigned,
        nextAppointments,
        nextAuditLogs,
      ] = await Promise.all([
        apiAdminDashboard(),
        apiAdminUsers(searchTerm),
        apiAdminTopics(),
        apiAdminResources(),
        apiAdminScholarships(),
        apiAdminServiceAreas(),
        apiAdminPendingRatings(),
        apiAdminUnassignedDiscussions(),
        apiAdminAppointments(),
        apiAdminAuditLogs(),
      ]);

      setStats(nextStats);
      setUsers(nextUsers);
      setTopics(nextTopics);
      setResources(nextResources);
      setScholarships(nextScholarships);
      setServiceAreas(nextAreas);
      setPendingRatings(nextRatings);
      setUnassignedDiscussions(nextUnassigned);
      setAppointments(nextAppointments);
      setAuditLogs(nextAuditLogs);
    } catch (error) {
      Alert.alert(
        "Unable to load administration data",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (app.sessionLoading) return;

    if (!app.user) {
      router.replace({ pathname: "/auth", params: { mode: "signin" } });
    } else if (
      app.user.role !== "admin" &&
      app.user.role !== "super_admin"
    ) {
      router.replace("/(student)");
    }
  }, [app.sessionLoading, app.user?.role]);

  useEffect(() => {
    if (app.user?.role === "admin" || app.user?.role === "super_admin") {
      void refresh();
    }
  }, [refresh, app.user?.role]);

  const changeRole = (user: AdminUser, role: AdminUser["role"]) => {
    Alert.alert(
      "Change account role",
      `Change ${user.email} from ${user.role} to ${role}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setSaving(true);
              await apiAdminSetRole(user.id, role);
              await refresh();
            } catch (error) {
              Alert.alert(
                "Role update failed",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const addTopic = async () => {
    if (!newTopic.trim()) {
      return Alert.alert("Topic required", "Enter a topic name.");
    }

    try {
      setSaving(true);
      await apiAdminCreateTopic(
        newTopic.trim(),
        description.trim() || undefined
      );
      setNewTopic("");
      setDescription("");
      await refresh();
    } catch (error) {
      Alert.alert(
        "Could not add topic",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = async (topic: AdminTopic) => {
    try {
      setSaving(true);
      await apiAdminSetTopicActive(topic.id, !topic.isActive);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Topic update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const assignAllTopics = async (user: AdminUser) => {
    const assigned =
      user.counsellorProfile?.topics.map((item) => item.topic.id) ?? [];

    const remaining = topics.filter(
      (topic) => topic.isActive && !assigned.includes(topic.id)
    );

    const next = assigned.length ? [] : remaining.map((topic) => topic.id);

    Alert.alert(
      "Update counsellor topics",
      assigned.length
        ? `Remove all topic assignments for ${user.email}?`
        : `Assign all active topics to ${user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setSaving(true);
              await apiAdminAssignTopics(user.id, next);
              await refresh();
            } catch (error) {
              Alert.alert(
                "Assignment failed",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const setCounsellorAvailability = async (
    user: AdminUser,
    availability: "AVAILABLE" | "OFFLINE" | "ON_LEAVE"
  ) => {
    try {
      setSaving(true);
      await apiAdminSetCounsellorAvailability(user.id, availability);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Availability update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCounsellorTopic = async (
    user: AdminUser,
    topicId: string
  ) => {
    const current =
      user.counsellorProfile?.topics.map((item) => item.topic.id) ?? [];

    const activeCurrent = current.filter((id) =>
      topics.some((topic) => topic.id === id && topic.isActive)
    );

    const next = current.includes(topicId)
      ? activeCurrent.filter((id) => id !== topicId)
      : [...activeCurrent, topicId];

    try {
      setSaving(true);
      await apiAdminAssignTopics(user.id, next);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Assignment failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const inviteCounsellor = async () => {
    if (
      !inviteEmail.trim() ||
      !/^\S+@\S+\.\S+$/.test(inviteEmail.trim())
    ) {
      return Alert.alert(
        "Valid email required",
        "Enter the counsellor's email address."
      );
    }

    if (!inviteTopicIds.length) {
      return Alert.alert(
        "Choose topics",
        "Assign at least one counselling topic to this invitation."
      );
    }

    try {
      setSaving(true);
      const result = await apiAdminInviteCounsellor(
        inviteEmail,
        inviteTopicIds
      );

      setInviteEmail("");
      setInviteTopicIds([]);

      Alert.alert("Invitation sent", result.message);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Invitation failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const setAccountStatus = async (
    user: AdminUser,
    status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"
  ) => {
    const label = status === "ACTIVE" ? "reactivate" : status.toLowerCase();

    Alert.alert(
      "Change account status",
      `Are you sure you want to ${label} ${user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === "ACTIVE" ? "default" : "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await apiAdminSetAccountStatus(user.id, status);
              await refresh();
            } catch (error) {
              Alert.alert(
                "Status update failed",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const addResource = async () => {
    if (
      !resourceTitle.trim() ||
      !resourceCategory.trim() ||
      !resourceDescription.trim()
    ) {
      return Alert.alert(
        "Complete resource details",
        "Enter a title, category and description."
      );
    }

    try {
      setSaving(true);
      await apiAdminCreateResource({
        title: resourceTitle.trim(),
        category: resourceCategory.trim(),
        readTime: resourceReadTime.trim(),
        description: resourceDescription.trim(),
      });

      setResourceTitle("");
      setResourceDescription("");
      await refresh();
    } catch (error) {
      Alert.alert(
        "Resource not saved",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const addScholarship = async () => {
    if (
      !scholarshipTitle.trim() ||
      !scholarshipProvider.trim() ||
      !scholarshipLevel.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(scholarshipDeadline) ||
      !scholarshipEligibility.trim() ||
      !scholarshipDescription.trim()
    ) {
      return Alert.alert(
        "Complete scholarship details",
        "All fields are required. Enter the deadline as YYYY-MM-DD."
      );
    }

    try {
      setSaving(true);
      await apiAdminCreateScholarship({
        title: scholarshipTitle.trim(),
        provider: scholarshipProvider.trim(),
        level: scholarshipLevel.trim(),
        deadline: new Date(
          `${scholarshipDeadline}T23:59:59`
        ).toISOString(),
        eligibility: scholarshipEligibility.trim(),
        description: scholarshipDescription.trim(),
      });

      setScholarshipTitle("");
      setScholarshipProvider("");
      setScholarshipDeadline("");
      setScholarshipEligibility("");
      setScholarshipDescription("");

      await refresh();
    } catch (error) {
      Alert.alert(
        "Scholarship not saved",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleResource = async (item: AdminResource) => {
    try {
      setSaving(true);
      await apiAdminSetResourceActive(item.id, !item.isActive);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Resource update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleScholarship = async (item: AdminScholarship) => {
    try {
      setSaving(true);
      await apiAdminSetScholarshipActive(item.id, !item.isActive);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Scholarship update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceArea = async (item: ServiceAreaRecord) => {
    try {
      setSaving(true);
      await apiAdminSetServiceAreaActive(item.id, !item.isActive);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Service area update failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text
        onPress={() =>
          Alert.alert("Sign out?", "Return to sign in?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign out",
              onPress: async () => {
                await app.logout();
                router.replace({
                  pathname: "/auth",
                  params: { mode: "signin", signedOut: "1" },
                });
              },
            },
          ])
        }
        style={{ color: colors.primary, fontWeight: "800" }}
      >
        ← Sign out
      </Text>

      <Heading
        title={isSuperAdmin ? "Super Admin dashboard" : "Admin dashboard"}
        subtitle={`Platform administration · ${app.user?.name || "Administrator"}`}
      />

      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: "#B8F2E8", fontWeight: "800" }}>
          MENTORSHIP+ ADMINISTRATION
        </Text>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>
          Platform operations
        </Text>
        <Text style={{ color: "#E1EDF5" }}>
          Changes are saved to the Mentorship+ server. Access is controlled by
          your administrator role.
        </Text>
      </Card>

      {loading && !stats ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}

      {stats ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            ["Total accounts", stats.users],
            ["Active members", stats.members],
            ["Counsellors", stats.counsellors],
            ["Administrators", stats.admins],
            ["Active topics", stats.topics],
            ["Open discussions", stats.openDiscussions],
            ["Upcoming appointments", stats.appointments],
            ["Ratings to review", stats.pendingRatings],
            ["Published resources", stats.resources],
            ["Published scholarships", stats.scholarships],
          ].map(([label, value]) => (
            <Card key={String(label)} style={{ width: "47%", flexGrow: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {label}
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: 25,
                  fontWeight: "900",
                }}
              >
                {value}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      <Heading
        title="Account management"
        small
        subtitle="Search accounts and manage access. Super Admin privileges are required to appoint administrators."
      />

      <Field
        label="Search by name or email"
        value={search}
        onChangeText={setSearch}
        placeholder="Enter name or email"
      />

      <Button
        title="Search accounts"
        variant="secondary"
        onPress={() => setSearchTerm(search.trim())}
        disabled={loading}
      />

      <Button
        title="Refresh platform data"
        variant="secondary"
        onPress={() => void refresh()}
        disabled={loading || saving}
      />

      {users.map((user) => (
        <Card key={user.id}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.ink, fontWeight: "800" }}>
                {user.displayName || "Unnamed account"}
              </Text>

              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {user.email}
              </Text>

              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                <Pill
                  label={user.role}
                  tone={
                    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
                      ? "green"
                      : "blue"
                  }
                />
                <Pill
                  label={user.status}
                  tone={user.status === "ACTIVE" ? "green" : "red"}
                />
                <Pill
                  label={user.emailVerifiedAt ? "Email verified" : "Unverified"}
                  tone={user.emailVerifiedAt ? "green" : "red"}
                />
              </Row>

              {user.role === "COUNSELLOR" && user.counsellorProfile ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Topics:{" "}
                  {user.counsellorProfile.topics
                    .map((t) => t.topic.name)
                    .join(", ") || "None assigned"}
                </Text>
              ) : null}
            </View>
          </Row>

          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            {user.role === "MEMBER" ? (
              <Button
                title="Make counsellor"
                onPress={() => changeRole(user, "COUNSELLOR")}
                disabled={saving}
              />
            ) : null}

            {user.role === "COUNSELLOR" ? (
              <Button
                title="Remove counsellor role"
                variant="secondary"
                onPress={() => changeRole(user, "MEMBER")}
                disabled={saving}
              />
            ) : null}

            {user.role === "COUNSELLOR" ? (
              <Button
                title="Assign / clear topics"
                variant="secondary"
                onPress={() => assignAllTopics(user)}
                disabled={saving}
              />
            ) : null}

            {isSuperAdmin && user.role === "MEMBER" ? (
              <Button
                title="Make admin"
                variant="secondary"
                onPress={() => changeRole(user, "ADMIN")}
                disabled={saving}
              />
            ) : null}

            {isSuperAdmin && user.role === "ADMIN" ? (
              <Button
                title="Revoke admin"
                variant="danger"
                onPress={() => changeRole(user, "MEMBER")}
                disabled={saving}
              />
            ) : null}

            {user.id !== app.user?.id &&
            user.status === "ACTIVE" &&
            (isSuperAdmin ||
              (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) ? (
              <Button
                title="Suspend"
                variant="danger"
                onPress={() => setAccountStatus(user, "SUSPENDED")}
                disabled={saving}
              />
            ) : null}

            {user.id !== app.user?.id &&
            user.status === "ACTIVE" &&
            (isSuperAdmin ||
              (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) ? (
              <Button
                title="Deactivate"
                variant="danger"
                onPress={() => setAccountStatus(user, "DEACTIVATED")}
                disabled={saving}
              />
            ) : null}

            {user.id !== app.user?.id &&
            user.status !== "ACTIVE" &&
            user.emailVerifiedAt &&
            (isSuperAdmin ||
              (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) ? (
              <Button
                title="Reactivate"
                variant="secondary"
                onPress={() => setAccountStatus(user, "ACTIVE")}
                disabled={saving}
              />
            ) : null}
          </Row>

          {user.role === "COUNSELLOR" && user.counsellorProfile ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.ink, fontWeight: "700" }}>
                Availability · {user.counsellorProfile?.availability}
              </Text>

              <Row style={{ flexWrap: "wrap", gap: 7 }}>
                <Button
                  title="Available"
                  onPress={() =>
                    void setCounsellorAvailability(user, "AVAILABLE")
                  }
                  disabled={
                    saving ||
                    user.counsellorProfile?.availability === "AVAILABLE"
                  }
                />
                <Button
                  title="Offline"
                  variant="secondary"
                  onPress={() =>
                    void setCounsellorAvailability(user, "OFFLINE")
                  }
                  disabled={
                    saving ||
                    user.counsellorProfile?.availability === "OFFLINE"
                  }
                />
                <Button
                  title="On leave"
                  variant="ghost"
                  onPress={() =>
                    void setCounsellorAvailability(user, "ON_LEAVE")
                  }
                  disabled={
                    saving ||
                    user.counsellorProfile?.availability === "ON_LEAVE"
                  }
                />
              </Row>

              <Text style={{ color: colors.ink, fontWeight: "700" }}>
                Manage assigned topics
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {topics
                  .filter(
                    (topic) =>
                      topic.isActive ||
                      user.counsellorProfile?.topics.some(
                        (item) => item.topic.id === topic.id
                      )
                  )
                  .map((topic) => {
                    const assigned =
                      user.counsellorProfile?.topics.some(
                        (item) => item.topic.id === topic.id
                      ) ?? false;

                    return (
                      <Pressable
                        key={topic.id}
                        disabled={saving}
                        onPress={() =>
                          void toggleCounsellorTopic(user, topic.id)
                        }
                      >
                        <Pill
                          label={`${assigned ? "✓ " : "+ "}${topic.name}`}
                          tone={assigned ? "green" : "blue"}
                        />
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          ) : null}
        </Card>
      ))}

      <Heading
        title="Invite a counsellor"
        small
        subtitle="Send an invitation to an existing Mentorship+ account or a new registrant. The invitee must sign in with the invited email and accept the link."
      />

      <Card>
        <Field
          label="Counsellor email address"
          value={inviteEmail}
          onChangeText={setInviteEmail}
          placeholder="counsellor@example.com"
          keyboardType="email-address"
        />

        <Text style={{ color: colors.ink, fontWeight: "700" }}>
          Assign topics
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {topics
            .filter((topic) => topic.isActive)
            .map((topic) => {
              const selected = inviteTopicIds.includes(topic.id);

              return (
                <Pressable
                  key={topic.id}
                  onPress={() =>
                    setInviteTopicIds((current) =>
                      selected
                        ? current.filter((id) => id !== topic.id)
                        : [...current, topic.id]
                    )
                  }
                >
                  <Pill
                    label={`${selected ? "✓ " : "+ "}${topic.name}`}
                    tone={selected ? "green" : "blue"}
                  />
                </Pressable>
              );
            })}
        </View>

        <Button
          title={saving ? "Sending…" : "Send counsellor invitation"}
          onPress={() => void inviteCounsellor()}
          disabled={saving}
        />
      </Card>

      <Heading
        title="LGA / LCDA access management"
        small
        subtitle="Control which Lagos service areas are available during registration."
      />

      {serviceAreas.map((area) => (
        <Card key={area.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.ink, fontWeight: "800" }}>
                {area.lga}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {area.lcda} · {area.state}
              </Text>
            </View>

            <Pill
              label={area.isActive ? "Available" : "Disabled"}
              tone={area.isActive ? "green" : "red"}
            />
          </Row>

          <Button
            title={area.isActive ? "Disable area" : "Enable area"}
            variant="secondary"
            onPress={() => void toggleServiceArea(area)}
            disabled={saving}
          />
        </Card>
      ))}

      <Heading
        title="Resource management"
        small
        subtitle="Publish and unpublish learning resources shown in Explore."
      />

      <Card>
        <Field
          label="Resource title"
          value={resourceTitle}
          onChangeText={setResourceTitle}
          placeholder="Title"
        />
        <Field
          label="Category"
          value={resourceCategory}
          onChangeText={setResourceCategory}
          placeholder="e.g. Career"
        />
        <Field
          label="Reading time"
          value={resourceReadTime}
          onChangeText={setResourceReadTime}
          placeholder="5 min read"
        />
        <Field
          label="Description"
          value={resourceDescription}
          onChangeText={setResourceDescription}
          placeholder="Resource summary"
          multiline
        />
        <Button
          title={saving ? "Saving…" : "Publish resource"}
          onPress={() => void addResource()}
          disabled={saving}
        />
      </Card>

      {resources.map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            {item.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {item.category} · {item.readTime}
          </Text>
          <Pill
            label={item.isActive ? "Published" : "Unpublished"}
            tone={item.isActive ? "green" : "red"}
          />
          <Button
            title={item.isActive ? "Unpublish" : "Publish"}
            variant="secondary"
            onPress={() => void toggleResource(item)}
            disabled={saving}
          />
        </Card>
      ))}

      <Heading
        title="Scholarship management"
        small
        subtitle="Publish verified opportunities and manage their visibility."
      />

      <Card>
        <Field
          label="Scholarship title"
          value={scholarshipTitle}
          onChangeText={setScholarshipTitle}
          placeholder="Title"
        />
        <Field
          label="Provider"
          value={scholarshipProvider}
          onChangeText={setScholarshipProvider}
          placeholder="Provider organisation"
        />
        <Field
          label="Eligible level"
          value={scholarshipLevel}
          onChangeText={setScholarshipLevel}
          placeholder="e.g. Undergraduate"
        />
        <Field
          label="Deadline (YYYY-MM-DD)"
          value={scholarshipDeadline}
          onChangeText={setScholarshipDeadline}
          placeholder="2027-02-01"
        />
        <Field
          label="Eligibility"
          value={scholarshipEligibility}
          onChangeText={setScholarshipEligibility}
          placeholder="Eligibility requirements"
          multiline
        />
        <Field
          label="Description"
          value={scholarshipDescription}
          onChangeText={setScholarshipDescription}
          placeholder="Opportunity details"
          multiline
        />
        <Button
          title={saving ? "Saving…" : "Publish scholarship"}
          onPress={() => void addScholarship()}
          disabled={saving}
        />
      </Card>

      {scholarships.map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            {item.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {item.provider} · {item.level} · Deadline{" "}
            {new Date(item.deadline).toLocaleDateString()}
          </Text>
          <Pill
            label={item.isActive ? "Published" : "Unpublished"}
            tone={item.isActive ? "green" : "red"}
          />
          <Button
            title={item.isActive ? "Unpublish" : "Publish"}
            variant="secondary"
            onPress={() => void toggleScholarship(item)}
            disabled={saving}
          />
        </Card>
      ))}

      <Heading
        title="Appointment oversight"
        small
        subtitle="Review appointment requests and their current status. Members and assigned counsellors manage changes."
      />

      {appointments.map((item) => (
        <Card key={item.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>
              {item.member.displayName || item.member.email}
            </Text>
            <Pill
              label={item.status.replaceAll("_", " ")}
              tone={
                item.status === "COMPLETED"
                  ? "green"
                  : item.status === "CANCELLED" || item.status === "NO_SHOW"
                    ? "red"
                    : "amber"
              }
            />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {item.topic?.name || "Counselling"} ·{" "}
            {item.counsellor.user.displayName || item.counsellor.user.email}
          </Text>
          <Text style={{ color: colors.muted }}>
            {new Date(item.startsAt).toLocaleString()}
          </Text>
        </Card>
      ))}

      {!appointments.length ? (
        <Card>
          <Text style={{ color: colors.muted }}>
            No appointment records yet.
          </Text>
        </Card>
      ) : null}

      <Heading
        title="Unassigned counselling discussions"
        small
        subtitle="Automatically assign open discussions to an available counsellor with the matching topic and lowest current load."
      />

      {unassignedDiscussions.map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            {item.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {item.topic.name} ·{" "}
            {item.creator.displayName || item.creator.email} ·{" "}
            {item._count.messages} messages
          </Text>
          <Button
            title="Auto-assign counsellor"
            disabled={saving}
            onPress={async () => {
              try {
                setSaving(true);
                await apiAdminAutoAssignDiscussion(item.id);
                await refresh();
              } catch (error) {
                Alert.alert(
                  "Assignment failed",
                  error instanceof Error
                    ? error.message
                    : "No eligible counsellor is currently available."
                );
              } finally {
                setSaving(false);
              }
            }}
          />
        </Card>
      ))}

      {!unassignedDiscussions.length ? (
        <Card>
          <Text style={{ color: colors.muted }}>
            There are no unassigned discussions.
          </Text>
        </Card>
      ) : null}

      <Heading
        title="Counsellor rating moderation"
        small
        subtitle="Only approved ratings contribute to public counsellor averages."
      />

      {pendingRatings.map((rating) => (
        <Card key={rating.id}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            {rating.score}/5 ·{" "}
            {rating.counsellor.user.displayName ||
              rating.counsellor.user.email}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            From {rating.author.displayName || rating.author.email} ·{" "}
            {rating.discussion?.title || "Appointment rating"}
          </Text>

          {rating.feedback ? (
            <Text style={{ color: colors.muted }}>{rating.feedback}</Text>
          ) : null}

          <Row style={{ gap: 8 }}>
            <Button
              title="Approve"
              onPress={async () => {
                try {
                  setSaving(true);
                  await apiAdminModerateRating(rating.id, "APPROVED");
                  await refresh();
                } catch (error) {
                  Alert.alert(
                    "Rating not approved",
                    error instanceof Error
                      ? error.message
                      : "Please try again."
                  );
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            />
            <Button
              title="Reject"
              variant="danger"
              onPress={async () => {
                try {
                  setSaving(true);
                  await apiAdminModerateRating(rating.id, "REJECTED");
                  await refresh();
                } catch (error) {
                  Alert.alert(
                    "Rating not rejected",
                    error instanceof Error
                      ? error.message
                      : "Please try again."
                  );
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            />
          </Row>
        </Card>
      ))}

      {!pendingRatings.length ? (
        <Card>
          <Text style={{ color: colors.muted }}>
            No ratings are waiting for moderation.
          </Text>
        </Card>
      ) : null}

      <Heading
        title="Counselling topic management"
        small
        subtitle="Create topics and control whether members can select them."
      />

      <Card>
        <Field
          label="Topic name"
          value={newTopic}
          onChangeText={setNewTopic}
          placeholder="e.g. Career development"
        />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What this topic covers"
          multiline
        />
        <Button
          title={saving ? "Saving…" : "Add topic"}
          onPress={() => void addTopic()}
          disabled={saving}
        />
      </Card>

      {topics.map((topic) => (
        <Card key={topic.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.ink, fontWeight: "800" }}>
                {topic.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {topic.description || "No description"} ·{" "}
                {topic._count.counsellors} counsellors ·{" "}
                {topic._count.discussions} discussions
              </Text>
            </View>
            <Pill
              label={topic.isActive ? "Active" : "Inactive"}
              tone={topic.isActive ? "green" : "red"}
            />
          </Row>
          <Button
            title={topic.isActive ? "Deactivate topic" : "Reactivate topic"}
            variant="secondary"
            onPress={() => void toggleTopic(topic)}
            disabled={saving}
          />
        </Card>
      ))}

      <Heading
        title="Administrative audit trail"
        small
        subtitle="Recent account, topic, content, appointment and moderation actions."
      />

      {auditLogs.map((log) => (
        <Card key={log.id}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            {log.action.replaceAll("_", " ")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {log.actor?.displayName || log.actor?.email || "System"} ·{" "}
            {log.entityType}
            {log.entityId ? ` · ${log.entityId}` : ""}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {new Date(log.createdAt).toLocaleString()}
          </Text>
        </Card>
      ))}

      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>
        Sensitive member wellbeing entries are not exposed in this dashboard.
        Discussion access is restricted to the member, their assigned
        counsellor and authorised administrators.
      </Text>
    </Screen>
  );
}
