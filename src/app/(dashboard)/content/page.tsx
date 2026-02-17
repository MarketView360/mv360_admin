"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import EmojiPicker from "emoji-picker-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Megaphone,
  Wrench,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  Save,
  X,
  Smile,
  RotateCcw,
  Trash,
  CheckCircle2,
  FileArchive,
} from "lucide-react";
import {
  fetchBlogPosts,
  createBlogPost,
  updateBlogPost,
  moveBlogPostToTrash,
  restoreBlogPost,
  deleteBlogPostPermanently,
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  moveAnnouncementToTrash,
  restoreAnnouncement,
  deleteAnnouncementPermanently,
  fetchMaintenanceWindows,
  createMaintenanceWindow,
  updateMaintenanceWindow,
  moveMaintenanceWindowToTrash,
  restoreMaintenanceWindow,
  deleteMaintenanceWindowPermanently,
  type BlogPost,
  type Announcement,
  type MaintenanceWindow,
} from "@/lib/api";
import { formatTimezonesArray, formatDateOnly } from "@/lib/timezone";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });

type ContentStatus = "all" | "draft" | "published" | "trash";
type EditorMode = "create" | "edit";

interface BlogFormData {
  title: string;
  description: string;
  date: string;
  type: string;
  content: string;
  read_time: number;
  is_featured: boolean;
  published: boolean;
  status: string;
}

interface AnnouncementFormData {
  text: string;
  Description: string;
  isActive: boolean;
  isClickable: boolean;
  status: string;
}

interface MaintenanceFormData {
  title: string;
  description: string;
  scheduled_at: string;
  ends_at: string;
  is_Active: boolean;
  status: string;
}

export default function ContentManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  
  const [contentTab, setContentTab] = useState<"blog" | "announcements" | "maintenance">("blog");
  const [statusFilter, setStatusFilter] = useState<ContentStatus>("all");
  
  const [blogDialog, setBlogDialog] = useState<{ open: boolean; mode: EditorMode; data?: BlogPost }>({ open: false, mode: "create" });
  const [announcementDialog, setAnnouncementDialog] = useState<{ open: boolean; mode: EditorMode; data?: Announcement }>({ open: false, mode: "create" });
  const [maintenanceDialog, setMaintenanceDialog] = useState<{ open: boolean; mode: EditorMode; data?: MaintenanceWindow }>({ open: false, mode: "create" });
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTargetField, setEmojiTargetField] = useState<string>("");
  const [timezonePreview, setTimezonePreview] = useState<{ open: boolean; datetime: string }>({ open: false, datetime: "" });
  
  const [blogForm, setBlogForm] = useState<BlogFormData>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    type: "update",
    content: "",
    read_time: 5,
    is_featured: false,
    published: false,
    status: "draft",
  });

  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>({
    text: "",
    Description: "",
    isActive: false,
    isClickable: false,
    status: "draft",
  });

  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormData>({
    title: "",
    description: "",
    scheduled_at: "",
    ends_at: "",
    is_Active: false,
    status: "draft",
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [blogs, anns, maint] = await Promise.all([
        fetchBlogPosts(true),
        fetchAnnouncements(true),
        fetchMaintenanceWindows(true),
      ]);
      setBlogPosts(blogs);
      setAnnouncements(anns);
      setMaintenanceWindows(maint);
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scheduleAutoSave = useCallback((saveFunction: () => Promise<void>) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveFunction();
    }, 3000);
  }, []);

  const filterByStatus = <T extends { status: string }>(items: T[]): T[] => {
    if (statusFilter === "all") return items.filter(item => item.status !== "trash");
    return items.filter(item => item.status === statusFilter);
  };

  const openBlogEditor = (mode: EditorMode, post?: BlogPost) => {
    if (mode === "edit" && post) {
      setBlogForm({
        title: post.title,
        description: post.description,
        date: post.date,
        type: post.type,
        content: post.content || "",
        read_time: post.read_time,
        is_featured: post.is_featured,
        published: post.published,
        status: post.status,
      });
    } else {
      setBlogForm({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        type: "update",
        content: "",
        read_time: 5,
        is_featured: false,
        published: false,
        status: "draft",
      });
    }
    setBlogDialog({ open: true, mode, data: post });
  };

  const openAnnouncementEditor = (mode: EditorMode, announcement?: Announcement) => {
    if (mode === "edit" && announcement) {
      setAnnouncementForm({
        text: announcement.text || "",
        Description: announcement.Description || "",
        isActive: announcement.isActive || false,
        isClickable: announcement.isClickable || false,
        status: announcement.status,
      });
    } else {
      setAnnouncementForm({
        text: "",
        Description: "",
        isActive: false,
        isClickable: false,
        status: "draft",
      });
    }
    setAnnouncementDialog({ open: true, mode, data: announcement });
  };

  const openMaintenanceEditor = (mode: EditorMode, window?: MaintenanceWindow) => {
    if (mode === "edit" && window) {
      setMaintenanceForm({
        title: window.title || "",
        description: window.description || "",
        scheduled_at: window.scheduled_at || "",
        ends_at: window.ends_at || "",
        is_Active: window.is_Active || false,
        status: window.status,
      });
    } else {
      setMaintenanceForm({
        title: "",
        description: "",
        scheduled_at: "",
        ends_at: "",
        is_Active: false,
        status: "draft",
      });
    }
    setMaintenanceDialog({ open: true, mode, data: window });
  };

  const handleBlogSave = async () => {
    setSaving(true);
    try {
      if (blogDialog.mode === "edit" && blogDialog.data) {
        await updateBlogPost(blogDialog.data.id, blogForm);
      } else {
        await createBlogPost(blogForm);
      }
      await loadData();
      setBlogDialog({ open: false, mode: "create" });
    } catch (err) {
      console.error("Failed to save blog post:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAnnouncementSave = async () => {
    setSaving(true);
    try {
      if (announcementDialog.mode === "edit" && announcementDialog.data) {
        await updateAnnouncement(announcementDialog.data.id, announcementForm);
      } else {
        await createAnnouncement(announcementForm);
      }
      await loadData();
      setAnnouncementDialog({ open: false, mode: "create" });
    } catch (err) {
      console.error("Failed to save announcement:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceSave = async () => {
    setSaving(true);
    try {
      if (maintenanceDialog.mode === "edit" && maintenanceDialog.data) {
        await updateMaintenanceWindow(maintenanceDialog.data.id, maintenanceForm);
      } else {
        await createMaintenanceWindow(maintenanceForm);
      }
      await loadData();
      setMaintenanceDialog({ open: false, mode: "create" });
    } catch (err) {
      console.error("Failed to save maintenance window:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleTrash = async (type: "blog" | "announcement" | "maintenance", id: number) => {
    try {
      if (type === "blog") await moveBlogPostToTrash(id);
      else if (type === "announcement") await moveAnnouncementToTrash(id);
      else await moveMaintenanceWindowToTrash(id);
      await loadData();
    } catch (err) {
      console.error("Failed to move to trash:", err);
    }
  };

  const handleRestore = async (type: "blog" | "announcement" | "maintenance", id: number) => {
    try {
      if (type === "blog") await restoreBlogPost(id);
      else if (type === "announcement") await restoreAnnouncement(id);
      else await restoreMaintenanceWindow(id);
      await loadData();
    } catch (err) {
      console.error("Failed to restore:", err);
    }
  };

  const handlePermanentDelete = async (type: "blog" | "announcement" | "maintenance", id: number) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    try {
      if (type === "blog") await deleteBlogPostPermanently(id);
      else if (type === "announcement") await deleteAnnouncementPermanently(id);
      else await deleteMaintenanceWindowPermanently(id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete permanently:", err);
    }
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    if (emojiTargetField === "blogTitle") {
      setBlogForm(prev => ({ ...prev, title: prev.title + emojiData.emoji }));
    } else if (emojiTargetField === "announcementText") {
      setAnnouncementForm(prev => ({ ...prev, text: prev.text + emojiData.emoji }));
    } else if (emojiTargetField === "maintenanceTitle") {
      setMaintenanceForm(prev => ({ ...prev, title: prev.title + emojiData.emoji }));
    }
    setShowEmojiPicker(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === "published") return <Badge className="bg-green-500">Published</Badge>;
    if (status === "draft") return <Badge variant="secondary">Draft</Badge>;
    if (status === "trash") return <Badge variant="destructive">Trash</Badge>;
    return <Badge>{status}</Badge>;
  };

  const getStatusCount = (items: { status: string }[], status: ContentStatus) => {
    if (status === "all") return items.filter(item => item.status !== "trash").length;
    return items.filter(item => item.status === status).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Manage blog posts, announcements, and maintenance windows</p>
        </div>
        <Button onClick={() => {
          if (contentTab === "blog") openBlogEditor("create");
          else if (contentTab === "announcements") openAnnouncementEditor("create");
          else openMaintenanceEditor("create");
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

      <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as typeof contentTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Blog Posts ({blogPosts.filter(b => b.status !== "trash").length})
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements ({announcements.filter(a => a.status !== "trash").length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance ({maintenanceWindows.filter(m => m.status !== "trash").length})
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filter by Status</CardTitle>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All ({getStatusCount(contentTab === "blog" ? blogPosts : contentTab === "announcements" ? announcements : maintenanceWindows, "all")})
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                <FileArchive className="h-4 w-4 mr-1" />
                Drafts ({getStatusCount(contentTab === "blog" ? blogPosts : contentTab === "announcements" ? announcements : maintenanceWindows, "draft")})
              </Button>
              <Button
                variant={statusFilter === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("published")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Published ({getStatusCount(contentTab === "blog" ? blogPosts : contentTab === "announcements" ? announcements : maintenanceWindows, "published")})
              </Button>
              <Button
                variant={statusFilter === "trash" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("trash")}
              >
                <Trash className="h-4 w-4 mr-1" />
                Trash ({getStatusCount(contentTab === "blog" ? blogPosts : contentTab === "announcements" ? announcements : maintenanceWindows, "trash")})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="blog" className="m-0">
              <div className="space-y-4">
                {filterByStatus(blogPosts).map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{post.title}</CardTitle>
                            {getStatusBadge(post.status)}
                            {post.is_featured && <Badge variant="outline">Featured</Badge>}
                          </div>
                          <CardDescription>{post.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {post.status === "trash" ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleRestore("blog", post.id)}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete("blog", post.id)}>
                                <Trash className="h-4 w-4 mr-1" />
                                Delete Forever
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openBlogEditor("edit", post)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleTrash("blog", post.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Trash
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateOnly(post.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.read_time} min read
                        </span>
                        <span className="capitalize">{post.type}</span>
                        {post.updated_at && (
                          <span className="text-xs">Updated: {new Date(post.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {filterByStatus(blogPosts).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No blog posts found in this category
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="announcements" className="m-0">
              <div className="space-y-4">
                {filterByStatus(announcements).map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{announcement.text}</CardTitle>
                            {getStatusBadge(announcement.status)}
                            {announcement.isActive && <Badge className="bg-blue-500">Active</Badge>}
                            {announcement.isClickable && <Badge variant="outline">Clickable</Badge>}
                          </div>
                          <CardDescription>{announcement.Description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {announcement.status === "trash" ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleRestore("announcement", announcement.id)}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete("announcement", announcement.id)}>
                                <Trash className="h-4 w-4 mr-1" />
                                Delete Forever
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openAnnouncementEditor("edit", announcement)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleTrash("announcement", announcement.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Trash
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Created: {new Date(announcement.created_at).toLocaleString()}
                        {announcement.updated_at && (
                          <span className="ml-4">Updated: {new Date(announcement.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {filterByStatus(announcements).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No announcements found in this category
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0">
              <div className="space-y-4">
                {filterByStatus(maintenanceWindows).map((window) => (
                  <Card key={window.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{window.title}</CardTitle>
                            {getStatusBadge(window.status)}
                            {window.is_Active && <Badge className="bg-orange-500">Active</Badge>}
                          </div>
                          <CardDescription>{window.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {window.status === "trash" ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleRestore("maintenance", window.id)}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete("maintenance", window.id)}>
                                <Trash className="h-4 w-4 mr-1" />
                                Delete Forever
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openMaintenanceEditor("edit", window)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleTrash("maintenance", window.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Trash
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {window.scheduled_at && (
                          <div className="text-sm">
                            <span className="font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Scheduled Start:
                            </span>
                            <div className="ml-5 space-y-1 text-muted-foreground">
                              {formatTimezonesArray(window.scheduled_at).map((tz) => (
                                <div key={tz.zone}>{tz.zone}: {tz.time}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {window.ends_at && (
                          <div className="text-sm">
                            <span className="font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Scheduled End:
                            </span>
                            <div className="ml-5 space-y-1 text-muted-foreground">
                              {formatTimezonesArray(window.ends_at).map((tz) => (
                                <div key={tz.zone}>{tz.zone}: {tz.time}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {filterByStatus(maintenanceWindows).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No maintenance windows found in this category
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Full-Screen Blog Editor Dialog */}
      <Dialog open={blogDialog.open} onOpenChange={(open) => setBlogDialog({ ...blogDialog, open })}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{blogDialog.mode === "edit" ? "Edit Blog Post" : "Create New Blog Post"}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmojiTargetField("blogTitle");
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                {blogDialog.mode === "edit" && blogDialog.data && (
                  <span className="text-sm text-muted-foreground">
                    Last saved: {blogDialog.data.updated_at ? new Date(blogDialog.data.updated_at).toLocaleString() : "Never"}
                  </span>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              Auto-saves after 3 seconds of inactivity
            </DialogDescription>
          </DialogHeader>

          {showEmojiPicker && emojiTargetField === "blogTitle" && (
            <div className="absolute top-20 right-4 z-50">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          )}

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={blogForm.status} onValueChange={(value) => setBlogForm({ ...blogForm, status: value })}>
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
              <Label>Title</Label>
              <Input
                value={blogForm.title}
                onChange={(e) => {
                  setBlogForm({ ...blogForm, title: e.target.value });
                  scheduleAutoSave(handleBlogSave);
                }}
                placeholder="Enter blog post title"
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={blogForm.description}
                onChange={(e) => {
                  setBlogForm({ ...blogForm, description: e.target.value });
                  scheduleAutoSave(handleBlogSave);
                }}
                placeholder="Brief description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={blogForm.date}
                  onChange={(e) => setBlogForm({ ...blogForm, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={blogForm.type} onValueChange={(value) => setBlogForm({ ...blogForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="bugfix">Bug Fix</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Read Time (minutes)</Label>
                <Input
                  type="number"
                  value={blogForm.read_time}
                  onChange={(e) => setBlogForm({ ...blogForm, read_time: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={blogForm.is_featured}
                  onCheckedChange={(checked) => setBlogForm({ ...blogForm, is_featured: checked })}
                />
                <Label>Featured Post</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={blogForm.published}
                  onCheckedChange={(checked) => setBlogForm({ ...blogForm, published: checked })}
                />
                <Label>Published</Label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Content (Markdown Supported)</Label>
              <div className="border rounded-md">
                <SimpleMDE
                  value={blogForm.content}
                  onChange={(value) => {
                    setBlogForm({ ...blogForm, content: value });
                    scheduleAutoSave(handleBlogSave);
                  }}
                  options={{
                    spellChecker: false,
                    placeholder: "Write your blog post content here...",
                    status: false,
                    toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"],
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlogDialog({ open: false, mode: "create" })}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleBlogSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Announcement Editor Dialog */}
      <Dialog open={announcementDialog.open} onOpenChange={(open) => setAnnouncementDialog({ ...announcementDialog, open })}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{announcementDialog.mode === "edit" ? "Edit Announcement" : "Create New Announcement"}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmojiTargetField("announcementText");
                  setShowEmojiPicker(!showEmojiPicker);
                }}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {showEmojiPicker && emojiTargetField === "announcementText" && (
            <div className="absolute top-20 right-4 z-50">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          )}

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={announcementForm.status} onValueChange={(value) => setAnnouncementForm({ ...announcementForm, status: value })}>
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
              <Label>Announcement Text</Label>
              <Input
                value={announcementForm.text}
                onChange={(e) => {
                  setAnnouncementForm({ ...announcementForm, text: e.target.value });
                  scheduleAutoSave(handleAnnouncementSave);
                }}
                placeholder="Enter announcement text"
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={announcementForm.Description}
                onChange={(e) => {
                  setAnnouncementForm({ ...announcementForm, Description: e.target.value });
                  scheduleAutoSave(handleAnnouncementSave);
                }}
                placeholder="Additional details"
                rows={4}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={announcementForm.isActive}
                  onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, isActive: checked })}
                />
                <Label>Active (Show on site)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={announcementForm.isClickable}
                  onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, isClickable: checked })}
                />
                <Label>Clickable</Label>
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone Display (for reference)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {formatTimezonesArray(new Date().toISOString()).map((tz) => (
                  <div key={tz.zone}>{tz.zone}: {tz.time}</div>
                ))}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialog({ open: false, mode: "create" })}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAnnouncementSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Maintenance Window Editor Dialog */}
      <Dialog open={maintenanceDialog.open} onOpenChange={(open) => setMaintenanceDialog({ ...maintenanceDialog, open })}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{maintenanceDialog.mode === "edit" ? "Edit Maintenance Window" : "Create New Maintenance Window"}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmojiTargetField("maintenanceTitle");
                  setShowEmojiPicker(!showEmojiPicker);
                }}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {showEmojiPicker && emojiTargetField === "maintenanceTitle" && (
            <div className="absolute top-20 right-4 z-50">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          )}

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={maintenanceForm.status} onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, status: value })}>
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
              <Label>Title</Label>
              <Input
                value={maintenanceForm.title}
                onChange={(e) => {
                  setMaintenanceForm({ ...maintenanceForm, title: e.target.value });
                  scheduleAutoSave(handleMaintenanceSave);
                }}
                placeholder="Enter maintenance window title"
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={maintenanceForm.description}
                onChange={(e) => {
                  setMaintenanceForm({ ...maintenanceForm, description: e.target.value });
                  scheduleAutoSave(handleMaintenanceSave);
                }}
                placeholder="Describe the maintenance work"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Scheduled Start (UTC)</Label>
                <Input
                  type="datetime-local"
                  value={maintenanceForm.scheduled_at ? maintenanceForm.scheduled_at.slice(0, 16) : ""}
                  onChange={(e) => {
                    const value = e.target.value ? new Date(e.target.value).toISOString() : "";
                    setMaintenanceForm({ ...maintenanceForm, scheduled_at: value });
                  }}
                />
                {maintenanceForm.scheduled_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimezonePreview({ open: true, datetime: maintenanceForm.scheduled_at })}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    View Timezones
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Scheduled End (UTC)</Label>
                <Input
                  type="datetime-local"
                  value={maintenanceForm.ends_at ? maintenanceForm.ends_at.slice(0, 16) : ""}
                  onChange={(e) => {
                    const value = e.target.value ? new Date(e.target.value).toISOString() : "";
                    setMaintenanceForm({ ...maintenanceForm, ends_at: value });
                  }}
                />
                {maintenanceForm.ends_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimezonePreview({ open: true, datetime: maintenanceForm.ends_at })}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    View Timezones
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={maintenanceForm.is_Active}
                onCheckedChange={(checked) => setMaintenanceForm({ ...maintenanceForm, is_Active: checked })}
              />
              <Label>Active (Show on site)</Label>
            </div>

            {(maintenanceForm.scheduled_at || maintenanceForm.ends_at) && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Timezone Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {maintenanceForm.scheduled_at && (
                    <div>
                      <div className="font-semibold mb-2">Start Time:</div>
                      <div className="space-y-1">
                        {formatTimezonesArray(maintenanceForm.scheduled_at).map((tz) => (
                          <div key={tz.zone}>{tz.zone}: {tz.time}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {maintenanceForm.ends_at && (
                    <div>
                      <div className="font-semibold mb-2">End Time:</div>
                      <div className="space-y-1">
                        {formatTimezonesArray(maintenanceForm.ends_at).map((tz) => (
                          <div key={tz.zone}>{tz.zone}: {tz.time}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialog({ open: false, mode: "create" })}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleMaintenanceSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timezone Preview Dialog */}
      <Dialog open={timezonePreview.open} onOpenChange={(open) => setTimezonePreview({ ...timezonePreview, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Timezone Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {formatTimezonesArray(timezonePreview.datetime).map((tz) => (
              <div key={tz.zone} className="flex justify-between p-2 rounded border">
                <span className="font-semibold">{tz.zone}</span>
                <span>{tz.time}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
