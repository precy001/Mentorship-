import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Screen, Button, Card, BackLink, Heading, StepProgress, ErrorState, LoadingBlock, EmptyState, SearchField } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { pluralize } from "@/src/lib/format";
import { apiGetServiceLcdas, apiGetServiceLgas } from "@/src/lib/api";

type LgaOption = { state: string; lga: string; lcdaCount: number };

export default function RegisterLga() {
  const [lgas, setLgas] = useState<LgaOption[]>([]);
  const [loadingLgas, setLoadingLgas] = useState(true);
  const [lgaError, setLgaError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [selectedLcda, setSelectedLcda] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [lcdas, setLcdas] = useState<string[]>([]);
  const [loadingLcdas, setLoadingLcdas] = useState(false);
  const [lcdaError, setLcdaError] = useState("");
  // Only the most recent LCDA request may update the screen (a slow earlier tap must not overwrite it).
  const lcdaRequest = useRef(0);

  const loadLgas = useCallback(async () => {
    setLoadingLgas(true);
    try {
      const result = await apiGetServiceLgas();
      setLgas(result.lgas);
      setLgaError("");
      // An administrator may have disabled the LGA the person already picked.
      setSelectedLga((current) => (current && result.lgas.some((item) => item.lga === current) ? current : null));
    } catch (error) {
      setLgaError(error instanceof Error ? error.message : "Service areas could not be loaded.");
    } finally {
      setLoadingLgas(false);
    }
  }, []);

  const loadLcdas = useCallback(async (item: LgaOption) => {
    const request = ++lcdaRequest.current;
    setLoadingLcdas(true);
    setLcdaError("");
    try {
      const result = await apiGetServiceLcdas(item.state, item.lga);
      if (request !== lcdaRequest.current) return;
      const names = result.lcdas.map((area) => area.lcda);
      setLcdas(names);
      setSelectedLcda((current) => (current && names.includes(current) ? current : null));
    } catch (error) {
      if (request !== lcdaRequest.current) return;
      setLcdas([]);
      setLcdaError(error instanceof Error ? error.message : "LCDAs could not be loaded.");
    } finally {
      if (request === lcdaRequest.current) setLoadingLcdas(false);
    }
  }, []);

  // Fetch whenever the screen is shown, so admin changes appear without rebuilding or reinstalling the app.
  useFocusEffect(useCallback(() => { void loadLgas(); }, [loadLgas]));

  const chosen = useMemo(() => lgas.find((item) => item.lga === selectedLga) ?? null, [lgas, selectedLga]);
  const validLcda = Boolean(chosen && selectedLcda && lcdas.includes(selectedLcda));
  const term = search.trim().toLowerCase();
  const visible = term ? lgas.filter((item) => `${item.lga} ${item.state}`.toLowerCase().includes(term)) : lgas;

  const chooseLga = (item: LgaOption) => {
    if (selectedLga === item.lga) return;
    setSelectedLga(item.lga);
    setSelectedLcda(null);
    setLcdas([]);
    setConfirmed(false);
    void loadLcdas(item);
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

      {loadingLgas && !lgas.length ? <LoadingBlock label="Loading available service areas…" /> : null}
      {!!lgaError && !loadingLgas ? (
        <ErrorState title="Locations unavailable" message={lgaError} onRetry={() => void loadLgas()} />
      ) : null}
      {!loadingLgas && !lgaError && !lgas.length ? (
        <EmptyState icon="location-outline" title="No areas available yet" message="No registration areas are currently enabled. Please contact Mentorship+ support." />
      ) : null}

      {lgas.length > 8 ? <SearchField value={search} onChangeText={setSearch} placeholder="Search your LGA" accessibilityLabel="Search LGAs" /> : null}

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
                onPress={() => chooseLga(item)}
                accessibilityRole="radio"
                accessibilityLabel={`${item.lga}, ${item.state} State, ${pluralize(item.lcdaCount, "LCDA option")}`}
                accessibilityState={{ selected: active, checked: active }}
                style={({ pressed }) => ({ minHeight: 64, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.88 : 1 })}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>{item.lga}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.state} State · {pluralize(item.lcdaCount, "LCDA option")}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: active ? colors.primary : "#CBD5E1", backgroundColor: active ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
              </Pressable>

              {active ? (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13, paddingHorizontal: 4, paddingTop: 4 }}>Select your LCDA</Text>
                  {loadingLcdas ? <LoadingBlock label="Loading LCDAs…" /> : null}
                  {!!lcdaError && !loadingLcdas ? <ErrorState title="LCDAs unavailable" message={lcdaError} onRetry={() => void loadLcdas(item)} /> : null}
                  {!loadingLcdas && !lcdaError && !lcdas.length ? (
                    <EmptyState icon="location-outline" title="No LCDAs available" message="This LGA has no enabled LCDAs right now. Choose another LGA or try again shortly." actionLabel="Refresh" onAction={() => void loadLgas().then(() => loadLcdas(item))} />
                  ) : null}
                  {!loadingLcdas && !lcdaError ? lcdas.map((lcda) => {
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
                  }) : null}
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
        {!!term && !visible.length && lgas.length ? (
          <Card><Text style={{ color: colors.muted, textAlign: "center" }}>No LGA matches “{search.trim()}”.</Text></Card>
        ) : null}
      </View>

      <Button title="Continue to profile" onPress={continueNext} disabled={loadingLgas || !!lgaError || !lgas.length || loadingLcdas} />
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 17 }}>
        Location availability will be expanded before nationwide launch.
      </Text>
    </Screen>
  );
}
