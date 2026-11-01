import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button, Card } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";

const locations = [
  { state: "Lagos", lga: "Ikeja", lcs: ["Ikeja LCDA", "Ojodu LCDA", "Onigbongbo LCDA"] },
  { state: "Lagos", lga: "Alimosho", lcs: ["Agbado/Oke-Odo LCDA", "Ayobo-Ipaja LCDA", "Egbe-Idimu LCDA", "Ikotun-Igando LCDA", "Mosan-Okunola LCDA"] },
  { state: "Lagos", lga: "Eti-Osa", lcs: ["Ikoyi-Obalende LCDA", "Lekki LCDA", "Iru/Victoria Island LCDA"] },
  { state: "Lagos", lga: "Lagos Mainland", lcs: ["Yaba LCDA", "Odi-Olowo/Ojuwoye LCDA"] },
  { state: "Lagos", lga: "Surulere", lcs: ["Itire-Ikate LCDA", "Coker-Aguda LCDA"] },
  { state: "Lagos", lga: "Kosofe", lcs: ["Ikosi-Isheri LCDA", "Agboyi-Ketu LCDA"] },
  { state: "Lagos", lga: "Oshodi-Isolo", lcs: ["Isolo LCDA", "Ejigbo LCDA"] },
  { state: "Lagos", lga: "Other / not listed", lcs: ["Other LCDA"] },
];
export default function RegisterLga() {
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  const [selected, setSelected] = useState(""); const [checked, setChecked] = useState(false);
  const chosen = locations.find(x => x.lga === selected);
  const continueNext = () => {
    if (!chosen) return Alert.alert("Choose your LGA", "Select the Local Government Area where you reside.");
    if (!checked) return Alert.alert("Confirm your LCDA", "Please confirm that the selected LGA/LCDA is correct.");
    router.push({ pathname: "/register-biodata", params: { email: params.email || "", password: params.password || "", state: chosen.state, lga: chosen.lga, lcda: chosen.lcs[0] } });
  };
  return <Screen style={{ gap: 18 }}>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>‹  Back</Text></Pressable>
    <View style={{ gap: 7 }}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 }}>STEP 1 OF 2</Text><Text style={{ color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "700", letterSpacing: -0.8 }}>Where are you based?</Text><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>Choose your Local Government Area (LGA). You’ll confirm the associated LCDA before completing your profile.</Text></View>
    <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>Select your LGA / LCDA</Text>
    <View style={{ gap: 9 }}>{locations.map(item => { const active = selected === item.lga; return <Pressable key={item.lga} onPress={() => { setSelected(item.lga); setChecked(false); }} style={{ borderWidth: 1, borderColor: active ? colors.primary : colors.line, backgroundColor: active ? "#EDF9F6" : colors.surface, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700" }}>{item.lga}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{item.state} State · {item.lcs.length} LCDA options</Text></View><View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: active ? colors.primary : "#CBD5E1", backgroundColor: active ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>{active && <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>✓</Text>}</View></Pressable>; })}</View>
    {chosen && <Card style={{ gap: 10, backgroundColor: "#F8FAFC" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>LCDA options for {chosen.lga}</Text>{chosen.lcs.map(lcda => <Text key={lcda} style={{ color: colors.muted, fontSize: 13 }}>•  {lcda}</Text>)}<Pressable onPress={() => setChecked(!checked)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 }}><View style={{ width: 23, height: 23, borderRadius: 7, backgroundColor: checked ? colors.primary : "white", borderWidth: 1, borderColor: checked ? colors.primary : colors.line, alignItems: "center", justifyContent: "center" }}>{checked && <Text style={{ color: "white", fontWeight: "900" }}>✓</Text>}</View><Text style={{ color: colors.ink, flex: 1, fontSize: 13, lineHeight: 19 }}>I confirm that this is my correct LGA/LCDA area.</Text></Pressable></Card>}
    <Button title="Continue to profile" onPress={continueNext} />
    <Text style={{ color: colors.mutedLight, textAlign: "center", fontSize: 11, lineHeight: 16 }}>Demo location list currently contains sample Lagos locations only.</Text>
  </Screen>;
}
