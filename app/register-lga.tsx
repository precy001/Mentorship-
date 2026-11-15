import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen, Button, Card, BackLink, Heading, StepProgress, ErrorState, LoadingBlock, EmptyState, SearchField } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { pluralize } from "@/src/lib/format";
import { apiGetLocations } from "@/src/lib/api";

type LocationGroup = { state: string; lga: string; lcs: string[] };

export default function RegisterLga() {
  const [locations, setLocations] = useState<LocationGroup[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [search, setSearch] = useState("");

  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const result = await apiGetLocations();
      const groups = new Map<string, LocationGroup>();
      for (const item of result.locations) {
        const key = `${item.state}::${item.lga}`;
        const group = groups.get(key) || { state: item.state, lga: item.lga, lcs: [] };
        group.lcs.push(item.lcda);
        groups.set(key, group);
      }
      setLocations([...groups.values()]);
      setLocationError("");
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Service areas could not be loaded.");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => { void loadLocations(); }, [loadLocations]);

  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [selectedLcda, setSelectedLcda] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const chosen = useMemo(
    () => locations.find((item) => item.lga === selectedLga) ?? null,
    [locations, selectedLga],
  );
  const validLcda = Boolean(chosen && selectedLcda && chosen.lcs.includes(selectedLcda));
  const term = search.trim().toLowerCase();
  const visible = term ? locations.filter((item) => `${item.lga} ${item.state}`.toLowerCase().includes(term)) : locations;

  const chooseLga = (lga: string) => {
    setSelectedLga(lga);
    setSelectedLcda(null);
    setConfirmed(false);
  };

  const chooseLcda = (lcda: string) => {
    setSelectedLcda(lcda);
    setConfirmed(false);
  };

  const continueNext = () => {
    if (!chosen) {
      Alert.alert("Choose your LGA", "Select the Local Government Area where you reside.");
      return;
    }
    if (!validLcda || !selectedLcda) {
      Alert.alert("Choose your LCDA", "Select one of the LCDA options shown for your LGA.");
      return;
    }
    if (!confirmed) {
      Alert.alert("Confirm your LCDA", "Please confirm that the selected LGA/LCDA is correct.");
      return;
    }

    router.push({
      pathname: "/register-biodata",
      params: { state: chosen.state, lga: chosen.lga, lcda: selectedLcda },
    });
  };


  return (
    <Screen>
      <BackLink />
      <StepProgress step={1} total={2} label="Your location" />
      <Heading
        title="Where are you based?"
        subtitle="Choose your Local Government Area (LGA), then the LCDA that applies to you. You’ll complete your profile next."
      />

      {loadingLocations ? <LoadingBlock label="Loading available service areas…" /> : null}
      {!!locationError && !loadingLocations ? (
        <ErrorState title="Locations unavailable" message={locationError} onRetry={() => void loadLocations()} />
      ) : null}
      {!loadingLocations && !locationError && !locations.length ? (
        <EmptyState icon="location-outline" title="No areas available yet" message="No registration areas are currently enabled. Please contact Mentorship+ support." />
      ) : null}

      {locations.length > 8 ? <SearchField value={search} onChangeText={setSearch} placeholder="Search your LGA" accessibilityLabel="Search LGAs" /> : null}

      <View style={{ gap: 10 }}>
        {visible.map((item) => {
          const active = selectedLga === item.lga;
          return (
            <View
              key={`${item.state}-${item.lga}`}
              style={{
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.line,
                backgroundColor: active ? colors.brandSurface : colors.surface,
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => chooseLga(item.lga)}
                accessibilityRole="radio"
                accessibilityLabel={`${item.lga}, ${item.state} State, ${pluralize(item.lcs.length, "LCDA option")}`}
                accessibilityState={{ selected: active, checked: active }}
                style={({ pressed }) => ({ minHeight: 64, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.88 : 1 })}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>{item.lga}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.state} State · {pluralize(item.lcs.length, "LCDA option")}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: active ? colors.primary : "#CBD5E1", backgroundColor: active ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
              </Pressable>

              {active ? (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13, paddingHorizontal: 4, paddingTop: 4 }}>Select your LCDA</Text>
                  {item.lcs.map((lcda) => {
                    const picked = selectedLcda === lcda;
                    return (
                      <Pressable
                        key={lcda}
                        onPress={() => chooseLcda(lcda)}
                        accessibilityRole="radio"
                        accessibilityLabel={lcda}
                        accessibilityState={{ selected: picked, checked: picked }}
                        style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: picked ? colors.accentTint : colors.surface, borderWidth: 1, borderColor: picked ? colors.primary : colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, opacity: pressed ? 0.88 : 1 })}
                      >
                        <Text style={{ color: colors.ink, fontSize: 14, fontWeight: picked ? "800" : "500", flex: 1 }}>{lcda}</Text>
                        {picked ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setConfirmed((value) => !value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmed }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 4 }}
                  >
                    <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: confirmed ? colors.primary : colors.white, borderWidth: 1.5, borderColor: confirmed ? colors.primary : "#CBD5E1", alignItems: "center", justifyContent: "center" }}>
                      {confirmed ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                    </View>
                    <Text style={{ color: colors.ink, flex: 1, fontSize: 13, lineHeight: 19 }}>I confirm that this is my correct LGA/LCDA area.</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
        {!!term && !visible.length && locations.length ? (
          <Card><Text style={{ color: colors.muted, textAlign: "center" }}>No LGA matches “{search.trim()}”.</Text></Card>
        ) : null}
      </View>

      <Button title="Continue to profile" onPress={continueNext} disabled={loadingLocations || !!locationError || !locations.length} />
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 17 }}>
        Location availability will be expanded before nationwide launch.
      </Text>
    </Screen>
  );
}
