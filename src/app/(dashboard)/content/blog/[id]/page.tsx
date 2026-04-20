"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import EmojiPicker from "emoji-picker-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Smile, Eye, Upload, X, Link2, Image as ImageIcon } from "lucide-react";
import { fetchBlogPosts, createBlogPost, updateBlogPost, uploadBlogThumbnail, type BlogPost } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export default function BlogEditorPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  const isNew = postId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    type: "update",
    content: "",
    read_time: 5,
    is_featured: false,
    published: false,
    status: "draft",
    thumbnail: null as string | null,
  });

  useEffect(() => {
    if (!isNew) {
      loadPost();
    }
  }, [isNew, postId]);

  const loadPost = async () => {
    try {
      const posts = await fetchBlogPosts(true);
      const post = posts.find(p => p.id.toString() === postId);
      if (post) {
        setForm({
          title: post.title,
          description: post.description,
          date: post.date,
          type: post.type,
          content: post.content || "",
          read_time: post.read_time,
          is_featured: post.is_featured,
          published: post.published,
          status: post.status,
          thumbnail: post.thumbnail,
        });
        if (post.thumbnail) setThumbnailUrl(post.thumbnail);
      }
    } catch (err) {
      console.error("Failed to load post:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAutoSaveStatus("Saving...");
    try {
      if (isNew) {
        await createBlogPost(form);
      } else {
        await updateBlogPost(parseInt(postId), form);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAutoSaveStatus('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAutoSaveStatus('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setAutoSaveStatus('Uploading image...');
    try {
      const url = await uploadBlogThumbnail(file);
      setForm(prev => ({ ...prev, thumbnail: url }));
      setThumbnailUrl(url);
      setAutoSaveStatus('Image uploaded ✓');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setAutoSaveStatus('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
      setForm(prev => ({ ...prev, thumbnail: thumbnailUrl }));
      setAutoSaveStatus('Thumbnail URL set ✓');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    }
  };

  const handleRemoveThumbnail = () => {
    setForm(prev => ({ ...prev, thumbnail: null }));
    setThumbnailUrl('');
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
              <h1 className="text-2xl font-bold">{isNew ? "Create New Blog Post" : "Edit Blog Post"}</h1>
            </div>
            <div className="flex items-center gap-3">
              {autoSaveStatus && <span className="text-sm text-muted-foreground">{autoSaveStatus}</span>}
              <Button variant="outline" size="sm" onClick={() => router.push("/content")}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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
                  placeholder="Enter blog post title"
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
                  placeholder="Brief description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
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
                    value={form.read_time}
                    onChange={(e) => setForm({ ...form, read_time: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })}
                  />
                  <Label>Featured Post</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.published}
                    onCheckedChange={(checked) => setForm({ ...form, published: checked })}
                  />
                  <Label>Published</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.thumbnail ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                    <img src={form.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveThumbnail}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{form.thumbnail}</p>
                </div>
              ) : (
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="url">
                      <Link2 className="h-4 w-4 mr-2" />
                      URL
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="space-y-3">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </TabsContent>
                  <TabsContent value="url" className="space-y-3">
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://example.com/image.jpg"
                          value={thumbnailUrl}
                          onChange={(e) => setThumbnailUrl(e.target.value)}
                        />
                        <Button onClick={handleUrlSubmit} disabled={!thumbnailUrl}>
                          Set
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter a direct link to an image hosted elsewhere
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content (Markdown)</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-color-mode="light" className="dark:hidden">
                <MDEditor
                  value={form.content}
                  onChange={(val) => setForm({ ...form, content: val || "" })}
                  height={600}
                  preview="live"
                />
              </div>
              <div data-color-mode="dark" className="hidden dark:block">
                <MDEditor
                  value={form.content}
                  onChange={(val) => setForm({ ...form, content: val || "" })}
                  height={600}
                  preview="live"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
