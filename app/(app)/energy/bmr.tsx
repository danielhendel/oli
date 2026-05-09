import React from "react";
import { EnergyMetricDetail } from "@/lib/ui/energy/EnergyMetricDetail";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export default function EnergyBmrScreen(): React.ReactElement {
  return <EnergyMetricDetail dayKey={getTodayDayKeyLocal()} variant="bmr" />;
}
