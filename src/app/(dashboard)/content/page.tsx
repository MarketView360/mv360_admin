"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatTimezones, utcToLocal, formatDateOnly } from "@/lib/timezone";

export default function ContentManagementPage() {
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);

  const [blogDialog, setBlogDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: BlogPost }>({ open: false, mode: "create" });
  const [announcementDialog, setAnnouncementDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: Announcement }>({ open: false, mode: "create" });
  const [maintenanceDialog, setMaintenanceDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: MaintenanceWindow }>({ open: false, mode: "create" });

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type?: "blog" | "announcement" | "maintenance"; id?: number }>({ open: false });
  const [timezonePreview, setTimezonePreview] = useState<{ open: boolean; timestamp?: string | null }>({ open: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [blogs, ann, maint] = await Promise.all([
        fetchBlogPosts(),
        fetchAnnouncements(),
        fetchMaintenanceWindows(),
      ]);
      setBlogPosts(blogs);
      setAnnouncements(ann);
      setMaintenance(maint);
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.type || !deleteDialog.id) return;
    try {
      if (deleteDialog.type === "blog") await moveBlogPostToTrash(deleteDialog.id);
      else if (deleteDialog.type === "announcement") await moveAnnouncementToTrash(deleteDialog.id);
      else if (deleteDialog.type === "maintenance") await moveMaintenanceWindowToTrash(deleteDialog.id);
      await loadData();
      setDeleteDialog({ open: false });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Manage blog posts, announcements & maintenance windows</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="blog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="h-4 w-4" /> Blog Posts
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" /> Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Blog Posts */}
        <TabsContent value="blog">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Blog Posts</CardTitle>
                  <CardDescription>{blogPosts.length} posts total</CardDescription>
                </div>
                <Button size="sm" onClick={() => setBlogDialog({ open: true, mode: "create" })}>
                  <Plus className="mr-2 h-4 w-4" /> New Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : blogPosts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No blog posts yet. Create your first one!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{post.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{post.type || "General"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(post.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {post.published && <Badge className="bg-emerald-600/20 text-emerald-600 border-0 text-xs">Published</Badge>}
                            {post.is_featured && <Badge className="bg-amber-600/20 text-amber-600 border-0 text-xs">Featured</Badge>}
                            {!post.published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setBlogDialog({ open: true, mode: "edit", data: post })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "blog", id: post.id })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Announcements</CardTitle>
                  <CardDescription>{announcements.length} announcements total</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAnnouncementDialog({ open: true, mode: "create" })}>
                  <Plus className="mr-2 h-4 w-4" /> New Announcement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : announcements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet. Create your first one!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Text</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((ann) => (
                      <TableRow key={ann.id}>
                        <TableCell className="font-medium max-w-xs truncate">{ann.text}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{ann.Description}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {ann.isActive && <Badge className="bg-emerald-600/20 text-emerald-600 border-0 text-xs">Active</Badge>}
                            {ann.isClickable && <Badge variant="outline" className="text-xs">Clickable</Badge>}
                            {!ann.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setAnnouncementDialog({ open: true, mode: "edit", data: ann })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "announcement", id: ann.id })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Windows */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Maintenance Windows</CardTitle>
                  <CardDescription>{maintenance.length} maintenance windows total</CardDescription>
                </div>
                <Button size="sm" onClick={() => setMaintenanceDialog({ open: true, mode: "create" })}>
                  <Plus className="mr-2 h-4 w-4" /> New Window
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : maintenance.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No maintenance windows scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {maintenance.map((maint) => (
                    <Card key={maint.id} className={maint.is_Active ? "border-amber-500" : ""}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{maint.title}</h3>
                              {maint.is_Active && <Badge className="bg-amber-600/20 text-amber-600 border-0 text-xs">Active</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{maint.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <button
                                type="button"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => setTimezonePreview({ open: true, timestamp: maint.scheduled_at })}
                              >
                                <Calendar className="h-3 w-3" />
                                Starts: {maint.scheduled_at ? new Date(maint.scheduled_at).toLocaleString() : "—"}
                                <Globe className="h-3 w-3 ml-1" />
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => setTimezonePreview({ open: true, timestamp: maint.ends_at })}
                              >
                                <Clock className="h-3 w-3" />
                                Ends: {maint.ends_at ? new Date(maint.ends_at).toLocaleString() : "—"}
                                <Globe className="h-3 w-3 ml-1" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setMaintenanceDialog({ open: true, mode: "edit", data: maint })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "maintenance", id: maint.id })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Blog Dialog */}
      <BlogDialog
        open={blogDialog.open}
        mode={blogDialog.mode}
        data={blogDialog.data}
        onClose={() => setBlogDialog({ open: false, mode: "create" })}
        onSuccess={loadData}
      />

      {/* Announcement Dialog */}
      <AnnouncementDialog
        open={announcementDialog.open}
        mode={announcementDialog.mode}
        data={announcementDialog.data}
        onClose={() => setAnnouncementDialog({ open: false, mode: "create" })}
        onSuccess={loadData}
      />

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        open={maintenanceDialog.open}
        mode={maintenanceDialog.mode}
        data={maintenanceDialog.data}
        onClose={() => setMaintenanceDialog({ open: false, mode: "create" })}
        onSuccess={loadData}
        onTimezonePreview={(timestamp) => setTimezonePreview({ open: true, timestamp })}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteDialog.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timezone Preview */}
      <Dialog open={timezonePreview.open} onOpenChange={(open) => setTimezonePreview({ ...timezonePreview, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Timezone Preview</DialogTitle>
            <DialogDescription>How this timestamp appears in different timezones</DialogDescription>
          </DialogHeader>
          {timezonePreview.timestamp && (() => {
            const tz = formatTimezones(timezonePreview.timestamp);
            return tz ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="font-medium">🇮🇳 India (IST)</span>
                  <span className="font-mono">{tz.ist}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="font-medium">🇺🇸 US East (EST)</span>
                  <span className="font-mono">{tz.est}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="font-medium">🇺🇸 US West (PST)</span>
                  <span className="font-mono">{tz.pst}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="font-medium">🌍 GMT</span>
                  <span className="font-mono">{tz.gmt}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="font-medium">🌐 UTC</span>
                  <span className="font-mono">{tz.utc}</span>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Invalid timestamp</p>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlogDialog({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  data?: BlogPost;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<Partial<BlogPost>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(data || { title: "", description: "", date: formatDateOnly(new Date().toISOString()), type: "", content: "", read_time: 5, is_featured: false, published: true });
    }
  }, [open, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        await createBlogPost(form as Omit<BlogPost, "id" | "created_at">);
      } else if (data) {
        await updateBlogPost(data.id, form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Blog Post" : "Edit Blog Post"}</DialogTitle>
          <DialogDescription>Fill in the details for the blog post</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" value={form.description || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Publish Date *</Label>
              <Input id="date" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g., New feature, Redesign" />
            </div>
          </div>
          <div>
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea id="content" value={form.content || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, content: e.target.value })} rows={6} />
          </div>
          <div>
            <Label htmlFor="read_time">Read Time (minutes)</Label>
            <Input id="read_time" type="number" value={form.read_time || 5} onChange={(e) => setForm({ ...form, read_time: parseInt(e.target.value) })} min={1} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="is_featured" checked={form.is_featured || false} onCheckedChange={(checked: boolean) => setForm({ ...form, is_featured: checked })} />
              <Label htmlFor="is_featured">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="published" checked={form.published ?? true} onCheckedChange={(checked: boolean) => setForm({ ...form, published: checked })} />
              <Label htmlFor="published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create" : "Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementDialog({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  data?: Announcement;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<Partial<Announcement>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(data || { text: "", Description: "", isActive: true, isClickable: false });
    }
  }, [open, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        await createAnnouncement(form as Omit<Announcement, "id" | "created_at">);
      } else if (data) {
        await updateAnnouncement(data.id, form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Announcement" : "Edit Announcement"}</DialogTitle>
          <DialogDescription>Configure the announcement banner</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="text">Announcement Text *</Label>
            <Input id="text" value={form.text || ""} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="Description">Description</Label>
            <Textarea id="Description" value={form.Description || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, Description: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={form.isActive ?? false} onCheckedChange={(checked: boolean) => setForm({ ...form, isActive: checked })} />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isClickable" checked={form.isClickable ?? false} onCheckedChange={(checked: boolean) => setForm({ ...form, isClickable: checked })} />
              <Label htmlFor="isClickable">Clickable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create" : "Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceDialog({
  open,
  mode,
  data,
  onClose,
  onSuccess,
  onTimezonePreview,
}: {
  open: boolean;
  mode: "create" | "edit";
  data?: MaintenanceWindow;
  onClose: () => void;
  onSuccess: () => void;
  onTimezonePreview: (timestamp: string) => void;
}) {
  const [form, setForm] = useState<Partial<MaintenanceWindow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (data) {
        setForm({
          ...data,
          scheduled_at: utcToLocal(data.scheduled_at),
          ends_at: utcToLocal(data.ends_at),
        });
      } else {
        setForm({ title: "", description: "", scheduled_at: "", ends_at: "", is_Active: false });
      }
    }
  }, [open, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      
      if (mode === "create") {
        await createMaintenanceWindow(payload as Omit<MaintenanceWindow, "id" | "created_at">);
      } else if (data) {
        await updateMaintenanceWindow(data.id, payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Maintenance Window" : "Edit Maintenance Window"}</DialogTitle>
          <DialogDescription>Schedule a maintenance window with timezone-aware dates</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" value={form.description || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} rows={3} required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="scheduled_at">Scheduled Start (Local) *</Label>
              {form.scheduled_at && (
                <Button type="button" size="sm" variant="ghost" onClick={() => onTimezonePreview(new Date(form.scheduled_at!).toISOString())}>
                  <Globe className="h-3 w-3 mr-1" /> Preview TZ
                </Button>
              )}
            </div>
            <Input id="scheduled_at" type="datetime-local" value={form.scheduled_at || ""} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="ends_at">Scheduled End (Local) *</Label>
              {form.ends_at && (
                <Button type="button" size="sm" variant="ghost" onClick={() => onTimezonePreview(new Date(form.ends_at!).toISOString())}>
                  <Globe className="h-3 w-3 mr-1" /> Preview TZ
                </Button>
              )}
            </div>
            <Input id="ends_at" type="datetime-local" value={form.ends_at || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, ends_at: e.target.value })} required />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_Active" checked={form.is_Active ?? false} onCheckedChange={(checked: boolean) => setForm({ ...form, is_Active: checked })} />
            <Label htmlFor="is_Active">Active Now</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create" : "Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
