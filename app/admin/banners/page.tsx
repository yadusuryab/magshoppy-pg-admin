/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/banners/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  X,
  Upload,
  Loader2,
  GripVertical,
} from "lucide-react";
import { client as sanityClient } from "@/lib/sanity";
import { Button } from "@/components/ui/button";

interface Banner {
  _id: string;
  title?: string;
  subtitle?: string;
  link?: string;
  orderNumber: number;
  isActive: boolean;
  image?: any;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    subtitle: "",
    link: "",
    orderNumber: 1,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      const data = await sanityClient.fetch<Banner[]>(
        `*[_type == "banner"] | order(orderNumber asc) {
          _id, title, subtitle, link, orderNumber, isActive, image
        }`,
      );
      setBanners(data);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getImageUrl = useCallback((image: any) => {
    const ref = image?.asset?._ref;
    if (!ref) return null;
    try {
      const parts = ref.split("-");
      if (parts.length >= 3) {
        const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
        return `https://cdn.sanity.io/images/${projectId}/production/${parts[1]}-${parts[2]}.${parts[3] || "jpg"}`;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    try {
      await sanityClient.patch(id).set({ isActive: !current }).commit();
      setBanners((prev) =>
        prev.map((b) => (b._id === id ? { ...b, isActive: !current } : b)),
      );
    } catch (error) {
      console.error("Error updating banner:", error);
      alert("Failed to update banner status");
    }
  }, []);

  const deleteBanner = useCallback(async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await sanityClient.delete(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Failed to delete banner");
    }
  }, []);

  const startEdit = (banner: Banner) => {
    setIsNew(false);
    setEditingBanner(banner);
    setEditForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      link: banner.link || "",
      orderNumber: banner.orderNumber,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const startNew = () => {
    setIsNew(true);
    setEditingBanner({
      _id: "",
      orderNumber: banners.length + 1,
      isActive: true,
    } as Banner);
    setEditForm({
      title: "",
      subtitle: "",
      link: "",
      orderNumber: banners.length + 1,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const closeEdit = () => {
    setEditingBanner(null);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum size is 10MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    if (!editingBanner) return;
    try {
      setSaving(true);
      let imageRef: string | undefined;

      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        const endpoint = isNew
          ? `/api/banners/image`
          : `/api/banners/${editingBanner._id}/image`;
        const res = await fetch(endpoint, {
          method: isNew ? "POST" : "PUT",
          body: formData,
        });
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Upload failed (HTTP ${res.status}).`);
        }
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Image upload failed");
        imageRef = payload.imageRef;
        setUploadingImage(false);
      } else if (isNew) {
        throw new Error("Please select a banner image");
      }

      if (isNew) {
        const created = await sanityClient.create({
          _type: "banner",
          title: editForm.title,
          subtitle: editForm.subtitle,
          link: editForm.link,
          orderNumber: editForm.orderNumber,
          isActive: true,
          image: imageRef
            ? { _type: "image", asset: { _type: "reference", _ref: imageRef } }
            : undefined,
        });
        setBanners((prev) =>
          [...prev, created as unknown as Banner].sort(
            (a, b) => a.orderNumber - b.orderNumber,
          ),
        );
      } else {
        const patch = sanityClient.patch(editingBanner._id).set({
          title: editForm.title,
          subtitle: editForm.subtitle,
          link: editForm.link,
          orderNumber: editForm.orderNumber,
        });
        if (imageRef) {
          patch.set({
            image: {
              _type: "image",
              asset: { _type: "reference", _ref: imageRef },
            },
          });
        }
        await patch.commit();

        setBanners((prev) =>
          prev
            .map((b) =>
              b._id === editingBanner._id
                ? {
                    ...b,
                    title: editForm.title,
                    subtitle: editForm.subtitle,
                    link: editForm.link,
                    orderNumber: editForm.orderNumber,
                    ...(imageRef
                      ? {
                          image: {
                            _type: "image",
                            asset: { _type: "reference", _ref: imageRef },
                          },
                        }
                      : {}),
                  }
                : b,
            )
            .sort((a, b) => a.orderNumber - b.orderNumber),
        );
      }

      closeEdit();
    } catch (error: any) {
      console.error("Error saving banner:", error);
      alert(error.message || "Failed to save banner");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 md:p-4 bg-primary">
      <div className="flex items-center justify-between p-2 md:p-4">
        <div>
          <h1 className="text-4xl text-secondary font-bold tracking-tighter">
            MagShoppy
          </h1>
          <p className="text-xs md:text-sm text-gray-50 bg-secondary px-2 p-1 rounded tracking-tight font-semibold">
            Manage Banners
          </p>
        </div>
        <Button onClick={startNew} variant={"secondary"}>
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {/* Edit/Create Modal */}
      {editingBanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-2 max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold tracking-tight">
                  {isNew ? "Add Banner" : "Edit Banner"}
                </h3>
                <Button onClick={closeEdit} variant={"ghost"} size="icon">
                  <X />
                </Button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Banner Image
                </label>
                <div className="relative rounded-xl overflow-hidden border bg-gray-50 aspect-[2/1] w-full mb-3">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="New banner"
                      fill
                      sizes="400px"
                      className="object-cover"
                    />
                  ) : editingBanner.image ? (
                    <Image
                      src={getImageUrl(editingBanner.image) || ""}
                      alt={editingBanner.title || "Banner"}
                      fill
                      sizes="400px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full gap-2"
                  type="button"
                >
                  <Upload className="h-4 w-4" />
                  {imageFile ? "Change Selected Image" : "Upload Image"}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Banner title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={editForm.subtitle}
                    onChange={(e) =>
                      setEditForm({ ...editForm, subtitle: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Banner subtitle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">
                    Redirect Link
                  </label>
                  <input
                    type="text"
                    value={editForm.link}
                    onChange={(e) =>
                      setEditForm({ ...editForm, link: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="/offer?price=1199"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.orderNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        orderNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {!isNew && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-xs text-gray-500">
                        {editingBanner.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        toggleActive(editingBanner._id, editingBanner.isActive)
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        editingBanner.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      {editingBanner.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 md:gap-3 mt-6 pt-4 border-t">
                <Button onClick={closeEdit} variant={"outline"}>
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  variant={"secondary"}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadingImage ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl overflow-hidden divide-y divide-muted">
        {banners.map((b) => {
          const imageUrl = getImageUrl(b.image);
          return (
            <div
              key={b._id}
              className={`p-3 md:p-4 flex items-center gap-3 ${!b.isActive ? "bg-muted/50" : ""}`}
            >
              <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 hidden md:block" />
              <span className="text-sm font-semibold text-muted-foreground w-6 text-center flex-shrink-0">
                {b.orderNumber}
              </span>
              {imageUrl ? (
                <div className="relative h-14 w-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={imageUrl}
                    alt={b.title || "Banner"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-14 w-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {b.title || "Untitled banner"}
                </p>
                {b.link && (
                  <p className="text-xs text-muted-foreground truncate">
                    {b.link}
                  </p>
                )}
              </div>
              <Button
                onClick={() => toggleActive(b._id, b.isActive)}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  b.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {b.isActive ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => startEdit(b)}
                  variant={"outline"}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => deleteBanner(b._id)}
                  variant={"outline"}
                  size={"icon"}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          );
        })}

        {banners.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2 font-semibold">
              No banners yet
            </div>
            <Button onClick={startNew} variant={"outline"}>
              Add your first banner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
