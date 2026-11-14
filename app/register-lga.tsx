import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Button, Card } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiGetLocations } from "@/src/lib/api";

type LocationGroup = { state: string; lga: string; lcs: string[] };


export default function RegisterLga() {
  const [locations, setLocations] = useState<LocationGroup[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState("");
  useEffect(() => {
    let active = true;
    apiGetLocations().then(result => {
      const groups = new Map<string, LocationGroup>();
      for (const item of result.locations) {
        const key = `${item.state}::${item.lga}`;
        const group = groups.get(key) || { state: item.state, lga: item.lga, lcs: [] };
        group.lcs.push(item.lcda); groups.set(key, group);
      }
      if (active) { setLocations([...groups.values()]); setLocationError(""); }
    }).catch(error => { if (active) setLocationError(error instanceof Error ? error.message : "Service areas could not be loaded."); })
      .finally(() => { if (active) setLoadingLocations(false); });
    return () => { active = false; };
  }, []);
  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [selectedLcda, setSelectedLcda] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const chosen = useMemo(
    () => locations.find((item) => item.lga === selectedLga) ?? null,
    [locations, selectedLga],
  );
  const validLcda = Boolean(chosen && selectedLcda && chosen.lcs.includes(selectedLcda));

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
    <Screen style={{ gap: 18 }}>
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>
          ‹  Back
        </Text>
      </Pressable>

      <View style={{ gap: 7 }}>
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 }}>
          STEP 1 OF 2
        </Text>
        <Text style={{ color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "700", letterSpacing: -0.8 }}>
          Where are you based?
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
          Choose your Local Government Area (LGA). You’ll confirm the associated LCDA before completing your profile.
        </Text>
      </View>

      <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>
        Select your LGA / LCDA
      </Text>

      {loadingLocations ? <Text style={{ color: colors.muted }}>Loading available service areas…</Text> : null}
      {!!locationError ? <Card><Text style={{ color: colors.error, fontWeight: "800" }}>Locations unavailable</Text><Text style={{ color: colors.muted }}>{locationError}</Text></Card> : null}
      {!loadingLocations && !locationError && !locations.length ? <Card><Text style={{ color: colors.muted }}>No registration areas are currently enabled. Please contact Mentorship+ support.</Text></Card> : null}
      <View style={{ gap: 9 }}>
        {locations.map((item) => {
          const active = selectedLga === item.lga;
          return (
            <Pressable
              key={item.lga}
              onPress={() => chooseLga(item.lga)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.line,
                backgroundColor: active ? "#EDF9F6" : colors.surface,
                borderRadius: 16,
                padding: 15,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700" }}>
                  {item.lga}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {item.state} State · {item.lcs.length} LCDA options
                </Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : "#CBD5E1",
                  backgroundColor: active ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active && <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      {chosen && (
        <Card style={{ gap: 10, backgroundColor: "#F8FAFC" }}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>
            LCDA options for {chosen.lga}
          </Text>
          {chosen.lcs.map((lcda) => {
            const active = selectedLcda === lcda;
            return (
              <Pressable
                key={lcda}
                onPress={() => chooseLcda(lcda)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: active ? "#E7F5F0" : "transparent",
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.ink, fontSize: 13 }}>•  {lcda}</Text>
                <Text style={{ color: active ? colors.primary : colors.muted, fontWeight: active ? "800" : "400" }}>
                  {active ? "✓ Selected" : "Select"}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setConfirmed((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 }}
          >
            <View
              style={{
                width: 23,
                height: 23,
                borderRadius: 7,
                backgroundColor: confirmed ? colors.primary : "white",
                borderWidth: 1,
                borderColor: confirmed ? colors.primary : colors.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {confirmed && <Text style={{ color: "white", fontWeight: "900" }}>✓</Text>}
            </View>
            <Text style={{ color: colors.ink, flex: 1, fontSize: 13, lineHeight: 19 }}>
              I confirm that this is my correct LGA/LCDA area.
            </Text>
          </Pressable>
        </Card>
      )}

      <Button title="Continue to profile" onPress={continueNext} disabled={loadingLocations || !!locationError || !locations.length} />
      <Text style={{ color: colors.mutedLight, textAlign: "center", fontSize: 11, lineHeight: 16 }}>
        Choose the correct location for your profile. Location availability will be expanded before nationwide launch.
      </Text>
    </Screen>
  );
}
