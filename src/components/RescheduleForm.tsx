import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, ButtonRow, Card, Chip } from "@/src/components/UI";
import { DatePickerField } from "@/src/components/Forms";
import { colors } from "@/src/lib/theme";
import { formatTimeRange } from "@/src/lib/format";
import { toDateString } from "@/src/lib/validation";

const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const labelFor = (slot: string) => {
  const hour = Number(slot.slice(0, 2));
  return `${hour > 12 ? hour - 12 : hour}:${slot.slice(3)} ${hour >= 12 ? "PM" : "AM"}`;
};

/** Proposes a new time for an existing appointment. The original length is kept. */
export function RescheduleForm({ startsAt, endsAt, busy, onSubmit, onClose }: { startsAt: string; endsAt: string; busy?: boolean; onSubmit: (startsAtIso: string, endsAtIso: string) => void; onClose: () => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(toDateString(tomorrow));
  const [slot, setSlot] = useState("10:00");
  const duration = new Date(endsAt).getTime() - new Date(startsAt).getTime();

  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, Number(slot.slice(0, 2)), Number(slot.slice(3)), 0, 0);
  const end = new Date(start.getTime() + duration);
  const valid = Number.isFinite(start.getTime()) && start.getTime() > Date.now();

  return (
    <Card style={{ gap: 12, backgroundColor: colors.brandSurface, borderColor: colors.brandBorder }}>
      <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>Choose a new time</Text>
      <DatePickerField label="New date" value={date} onChange={setDate} minDate={toDateString(tomorrow)} maxDate={`${new Date().getFullYear() + 2}-12-31`} required />
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SLOTS.map(value => <Chip key={value} label={labelFor(value)} accessibilityRole="radio" selected={slot === value} onPress={() => setSlot(value)} />)}
      </View>
      {valid ? <Text style={{ color: colors.muted, fontSize: 13 }}>New time: {formatTimeRange(start.toISOString(), end.toISOString())}. The other person will be asked to confirm it.</Text> : null}
      <ButtonRow>
        <Button grow title="Send new time" loading={busy} disabled={!valid || busy} onPress={() => onSubmit(start.toISOString(), end.toISOString())} />
        <Button grow title="Close" variant="secondary" disabled={busy} onPress={onClose} />
      </ButtonRow>
    </Card>
  );
}
