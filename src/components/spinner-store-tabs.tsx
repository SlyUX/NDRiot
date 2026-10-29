"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Tabs for a store's two surfaces — the rack (default) and earnings/payouts.
 * A thin client shell: both panels are rendered by the server page and handed
 * in as nodes, so the earnings forms stay server-action-driven.
 */
export function SpinnerStoreTabs({
  rack,
  earnings,
}: {
  rack: ReactNode;
  earnings: ReactNode;
}) {
  return (
    <Tabs defaultValue="rack">
      <TabsList>
        <TabsTrigger value="rack">The Rack</TabsTrigger>
        <TabsTrigger value="earnings">Earnings &amp; Payouts</TabsTrigger>
      </TabsList>
      <TabsContent value="rack">{rack}</TabsContent>
      <TabsContent value="earnings">{earnings}</TabsContent>
    </Tabs>
  );
}
