"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RotateCcw,
  Trash,
  CheckCircle2,
  FileArchive,
} from "lucide-react";
import {
  fetchBlogPosts,
  moveBlogPostToTrash,
  restoreBlogPost,
  deleteBlogPostPermanently,
  fetchAnnouncements,
  moveAnnouncementToTrash,
  restoreAnnouncement,
  deleteAnnouncementPermanently,
  fetchMaintenanceWindows,
  moveMaintenanceWindowToTrash,
  restoreMaintenanceWindow,
  deleteMaintenanceWindowPermanently,
  type BlogPost,
  type Announcement,
  type MaintenanceWindow,
} from "@/lib/api";
import { formatTimezonesArray, formatDateOnly } from "@/lib/timezone";

type ContentStatus = "all" | "draft" | "published" | "trash";

export default function ContentManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  
  const [contentTab, setContentTab] = useState<"blog" | "announcements" | "maintenance">("blog");
  const [statusFilter, setStatusFilter] = useState<ContentStatus>("all");

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

  const filterByStatus = <T extends { status: string }>(items: T[]): T[] => {
    if (statusFilter === "all") return items.filter(item => item.status !== "trash");
    return items.filter(item => item.status === statusFilter);
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
          if (contentTab === "blog") router.push("/content/blog/new");
          else if (contentTab === "announcements") router.push("/content/announcement/new");
          else router.push("/content/maintenance/new");
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
                              <Button variant="outline" size="sm" onClick={() => router.push(`/content/blog/${post.id}`)}>
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
                              <Button variant="outline" size="sm" onClick={() => router.push(`/content/announcement/${announcement.id}`)}>
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
                              <Button variant="outline" size="sm" onClick={() => router.push(`/content/maintenance/${window.id}`)}>
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
    </div>
  );
}
