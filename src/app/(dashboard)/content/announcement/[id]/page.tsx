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
import { fetchAnnouncements, createAnnouncement, updateAnnouncement } from "@/lib/api";
import { formatTimezonesArray } from "@/lib/timezone";

export default function AnnouncementEditorPage() {
  const router = useRouter();
  const params = useParams();
  const announcementId = params?.id as string;
  const isNew = announcementId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");

  const [form, setForm] = useState({
    text: "",
    Description: "",
    isActive: false,
    isClickable: false,
    status: "draft",
  });

  useEffect(() => {
    if (!isNew) {
      loadAnnouncement();
    }
  }, [isNew, announcementId]);

  const loadAnnouncement = async () => {
    try {
      const announcements = await fetchAnnouncements(true);
      const announcement = announcements.find(a => a.id.toString() === announcementId);
      if (announcement) {
        setForm({
          text: announcement.text || "",
          Description: announcement.Description || "",
          isActive: announcement.isActive || false,
          isClickable: announcement.isClickable || false,
          status: announcement.status,
        });
      }
    } catch (err) {
      console.error("Failed to load announcement:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAutoSaveStatus("Saving...");
    try {
      if (isNew) {
        await createAnnouncement(form);
      } else {
        await updateAnnouncement(parseInt(announcementId), form);
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
    setForm(prev => ({ ...prev, text: prev.text + emojiData.emoji }));
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
              <h1 className="text-2xl font-bold">{isNew ? "Create New Announcement" : "Edit Announcement"}</h1>
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
              <CardTitle>Announcement Details</CardTitle>
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
                  <Label>Announcement Text</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Enter announcement text"
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
                  value={form.Description}
                  onChange={(e) => setForm({ ...form, Description: e.target.value })}
                  placeholder="Additional details about this announcement"
                  rows={5}
                />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <Label>Active (Show on site)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.isClickable}
                    onCheckedChange={(checked) => setForm({ ...form, isClickable: checked })}
                  />
                  <Label>Clickable</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Current Time in Different Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {formatTimezonesArray(new Date().toISOString()).map((tz) => (
                <div key={tz.zone} className="flex justify-between">
                  <span className="font-medium">{tz.zone}:</span>
                  <span className="text-muted-foreground">{tz.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
