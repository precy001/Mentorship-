
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  View,
  Pressable,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import {
  apiGetPublicResources,
  apiGetPublicScholarships,
  PublicResource,
  PublicScholarship,
} from "@/src/lib/api";

export default function Explore() {
  const app = useApp();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"resources" | "scholarships">(
    params.tab === "scholarships" ? "scholarships" : "resources"
  );

  const [resources, setResources] = useState<PublicResource[]>([]);
  const [scholarships, setScholarships] = useState<PublicScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      apiGetPublicResources(),
      apiGetPublicScholarships(),
    ])
      .then(([resourceItems, scholarshipItems]) => {
        if (active) {
          setResources(resourceItems);
          setScholarships(scholarshipItems);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Content could not be loaded."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const list = tab === "resources" ? resources : scholarships;

  const filtered = useMemo(
    () =>
      list.filter((item) =>
        `${item.title} ${
          "category" in item
            ? item.category
            : "provider" in item
              ? item.provider
              : ""
        } ${item.description}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [list, query]
  );

  return (
    <Screen>
      <Heading
        title="Explore your possibilities"
        subtitle="Learning resources and funding opportunities published by Mentorship+ administrators."
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search resources, scholarships…"
        placeholderTextColor="#9AA5B5"
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 13,
          padding: 14,
          color: colors.ink,
        }}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["resources", "scholarships"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: tab === t ? colors.primary : "#fff",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: tab === t ? "#fff" : colors.ink,
                fontWeight: "700",
                fontSize: 11,
                textTransform: "capitalize",
              }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {!!loadError ? (
        <Card>
          <Text style={{ color: colors.error, fontWeight: "700" }}>
            Content could not be loaded
          </Text>
          <Text style={{ color: colors.muted }}>{loadError}</Text>
        </Card>
      ) : null}

      {filtered.map((item) => {
        const saved =
          tab === "resources"
            ? app.savedResources.includes(item.id)
            : app.savedScholarships.includes(item.id);

        const category = "category" in item ? item.category : item.level;

        return (
          <Card key={item.id}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pill label={category} />

              <Pressable
                onPress={() =>
                  tab === "resources"
                    ? app.toggleResource(item.id)
                    : app.toggleScholarship(item.id)
                }
              >
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  {saved ? "♥ Saved" : "♡ Save"}
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: colors.ink,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              {item.title}
            </Text>

            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              {item.description}
            </Text>

            {"deadline" in item && (
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                Deadline: {new Date(item.deadline).toLocaleDateString()}
              </Text>
            )}

            {"provider" in item && (
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Provider: {item.provider} · Eligibility: {item.eligibility}
              </Text>
            )}
          </Card>
        );
      })}

      {!loading && filtered.length === 0 && !loadError ? (
        <Card>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            Nothing found
          </Text>
          <Text style={{ color: colors.muted }}>
            No published items are available in this section yet.
          </Text>
        </Card>
      ) : null}

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/feature/[slug]",
            params: { slug: "saved" },
          })
        }
      >
        <Text
          style={{
            color: colors.primary,
            fontWeight: "800",
            textAlign: "center",
            padding: 10,
          }}
        >
          View saved resources and scholarships →
        </Text>
      </Pressable>
    </Screen>
  );
}
