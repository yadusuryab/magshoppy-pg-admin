/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/settings/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame, SprayCan, Loader2, Save } from "lucide-react";
import { client as sanityClient } from "@/lib/sanity";
import { Button } from "@/components/ui/button";

interface Settings {
  _id: string;
  freeSocksOffer: boolean;
  shoeCleanerAddon: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      let data = await sanityClient.fetch<Settings>(
        `*[_type == "settings"][0]{ _id, freeSocksOffer, shoeCleanerAddon }`,
      );
      if (!data) {
        // Create the singleton settings doc if it doesn't exist yet
        const created = await sanityClient.create({
          _type: "settings",
          title: "Global Settings",
          freeSocksOffer: false,
          shoeCleanerAddon: false,
        });
        data = created as unknown as Settings;
      }
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSetting = useCallback(
    async (key: "freeSocksOffer" | "shoeCleanerAddon") => {
      if (!settings) return;
      const newValue = !settings[key];
      setSettings({ ...settings, [key]: newValue });
      setSaving(true);
      try {
        await sanityClient
          .patch(settings._id)
          .set({ [key]: newValue })
          .commit();
      } catch (error) {
        console.error("Error updating setting:", error);
        alert("Failed to update setting");
        setSettings({ ...settings, [key]: !newValue });
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  if (loading || !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 md:p-4 h-screen bg-white rounded-t-3xl">
      {/* <div className="flex items-center justify-between p-2 md:p-4">
        <div>
          <h1 className="text-4xl text-secondary font-bold tracking-tighter">MagShoppy</h1>
          <p className="text-xs md:text-sm text-gray-50 bg-secondary px-2 p-1 rounded tracking-tight font-semibold">
            Site Settings
          </p>
        </div>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </span>
        )}
      </div> */}

      <div className="bg-white rounded-3xl p-4 md:p-6 space-y-4">
        {/* Free Socks Offer */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Free Socks Offer</p>
              <p className="text-xs text-muted-foreground">
                Show free flame socks offer across the storefront and checkout
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting("freeSocksOffer")}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
              settings.freeSocksOffer ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 bg-white rounded-full shadow transition-transform ${
                settings.freeSocksOffer ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Shoe Cleaner Addon */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-500">
              <SprayCan className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Shoe Cleaner Addon</p>
              <p className="text-xs text-muted-foreground">
                Allow customers to add the premium shoe cleaner at checkout
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting("shoeCleanerAddon")}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
              settings.shoeCleanerAddon ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 bg-white rounded-full shadow transition-transform ${
                settings.shoeCleanerAddon ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
