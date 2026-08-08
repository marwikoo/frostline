"use client";

import { useQuery } from "@tanstack/react-query";
import {
  dashboardQueryKey,
  readDashboard,
  readShipment,
  readTimeline,
  shipmentQueryKey,
  timelineQueryKey,
} from "@/lib/genlayer";

export function useFrostlineDashboard() {
  return useQuery({
    queryKey: dashboardQueryKey,
    queryFn: readDashboard,
    refetchInterval: 30_000,
  });
}

export function useFrostlineShipment(id: string) {
  return useQuery({
    queryKey: shipmentQueryKey(id),
    queryFn: () => readShipment(id),
    enabled: Boolean(id),
  });
}

export function useFrostlineTimeline(id: string) {
  return useQuery({
    queryKey: timelineQueryKey(id),
    queryFn: () => readTimeline(id),
    enabled: Boolean(id),
  });
}
