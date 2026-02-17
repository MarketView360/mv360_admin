"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import EmojiPicker from "emoji-picker-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Smile, Globe } from "lucide-react";
import { fetchMaintenanceWindows, createMaintenanceWindow, updateMaintenanceWindow } from "@/lib/api";
import { formatTimezonesArray } from "@/lib/timezone";

export default function MaintenanceEditorPage() {
  const router = useRouter();
  const params = useParams();
  const maintenanceId = params?.id as string;
  const isNew = maintenanceId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    ends_at: "",
    is_Active: false,
    status: "draft",
  });

  useEffect(() => {
    if (!isNew) {
      loadMaintenance();
    }
  }, [isNew, maintenanceId]);

  const loadMaintenance = async () => {
    try {
      const windows = await fetchMaintenanceWindows(true);
      const window = windows.find(w => w.id.toString() === maintenanceId);
      if (window) {
        setForm({
          title: window.title || "",
          description: window.description || "",
          scheduled_at: window.scheduled_at || "",
          ends_at: window.ends_at || "",
          is_Active: window.is_Active || false,
          status: window.status,
        });
      }
    } catch (err) {
      console.error("Failed to load maintenance window:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAutoSaveStatus("Saving...");
    try {
      if (isNew) {
        await createMaintenanceWindow(form);
      } else {
        await updateMaintenanceWindow(parseInt(maintenanceId), form);
      }
      setAutoSaveStatus("Saved ✓");
      setTimeout(() => setAutoSaveStatus(""), 2000);
      if (isNew) {
        router.push("/content");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      setAutoSaveStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    setForm(prev => ({ ...prev, title: prev.title + emojiData.emoji }));
    setShowEmojiPicker(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/content")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">{isNew ? "Create New Maintenance Window" : "Edit Maintenance Window"}</h1>
            </div>
            <div className="flex items-center gap-3">
              {autoSaveStatus && <span className="text-sm text-muted-foreground">{autoSaveStatus}</span>}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Window Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Title</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter maintenance window title"
                  className="text-lg"
                />
                {showEmojiPicker && (
                  <div className="absolute right-0 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} />
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the maintenance work"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Scheduled Start (UTC)</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ""}
                    onChange={(e) => {
                      const value = e.target.value ? new Date(e.target.value).toISOString() : "";
                      setForm({ ...form, scheduled_at: value });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Scheduled End (UTC)</Label>
                  <Input
                    type="datetime-local"
                    value={form.ends_at ? form.ends_at.slice(0, 16) : ""}
                    onChange={(e) => {
                      const value = e.target.value ? new Date(e.target.value).toISOString() : "";
                      setForm({ ...form, ends_at: value });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_Active}
                  onCheckedChange={(checked) => setForm({ ...form, is_Active: checked })}
                />
                <Label>Active (Show on site)</Label>
              </div>
            </CardContent>
          </Card>

          {(form.scheduled_at || form.ends_at) && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {form.scheduled_at && (
                  <div>
                    <div className="font-semibold mb-2">Start Time:</div>
                    <div className="space-y-1">
                      {formatTimezonesArray(form.scheduled_at).map((tz) => (
                        <div key={tz.zone} className="flex justify-between">
                          <span className="font-medium">{tz.zone}:</span>
                          <span className="text-muted-foreground">{tz.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {form.ends_at && (
                  <div>
                    <div className="font-semibold mb-2">End Time:</div>
                    <div className="space-y-1">
                      {formatTimezonesArray(form.ends_at).map((tz) => (
                        <div key={tz.zone} className="flex justify-between">
                          <span className="font-medium">{tz.zone}:</span>
                          <span className="text-muted-foreground">{tz.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
