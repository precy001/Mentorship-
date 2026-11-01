import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Field, Button, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { ninRecords } from "@/src/data/seed";
import { useApp } from "@/src/context/AppContext";

export default function Verify() {
  const [nin, setNin] = useState(""); const [busy, setBusy] = useState(false); const { login, authorisedLgas } = useApp();
  const verify = async () => {
    if (!/^\d{11}$/.test(nin)) { Alert.alert("Check your NIN", "Enter exactly 11 digits to continue."); return; }
    setBusy(true);
    setTimeout(async () => {
      const record = ninRecords[nin]; setBusy(false);
      if (!record) { Alert.alert("Record not found", "This NIN is not in the mock demo database. Try one of the sample NINs in the README."); return; }
      if (!authorisedLgas.includes(record.lga)) { Alert.alert("Access not available", `${record.lga}, ${record.state} is not currently authorised for this demo. You can contact support or try another sample record.`); return; }
      await login({ name: record.name, role: "student", nin, lga: record.lga, state: record.state });
      router.replace("/(student)");
    }, 600);
  };
  return <Screen>
    <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "700" }}>← Back</Text>
    <View style={{ paddingTop: 12, gap: 12 }}>
      <Pill label="DEMO IDENTITY CHECK" tone="green" />
      <Heading title="Let’s get you started" subtitle="Enter a sample NIN to demonstrate identity lookup and LGA access checking." />
      <Card>
        <Text style={{ fontWeight: "800", color: colors.ink, fontSize: 16 }}>Verify your identity</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>For this MVP, NIN verification uses fictional records stored locally. No government service is contacted.</Text>
        <Field label="National Identification Number" value={nin} onChangeText={v => setNin(v.replace(/\D/g, "").slice(0, 11))} placeholder="Enter 11 digits" keyboardType="number-pad" />
        <Text style={{ color: colors.muted, fontSize: 12 }}>Your number is masked in profile views. Never enter your real NIN in this demo.</Text>
        <Button title={busy ? "Checking record…" : "Verify and continue"} onPress={verify} disabled={busy} />
      </Card>
      <Card style={{ backgroundColor: "#F0F7FB" }}>
        <Text style={{ fontWeight: "800", color: colors.ink }}>Sample demo records</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>12345678901 · Lagos Mainland (authorised)</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>23456789012 · Ikeja (authorised)</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>34567890123 · Kano Municipal (not authorised)</Text>
      </Card>
    </View>
  </Screen>;
}
