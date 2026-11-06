/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/products/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { client as sanityClient } from "@/lib/sanity";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const LABEL_OPTIONS = [
  { title: "Trending", value: "trending" },
  { title: "New Arrival", value: "new-arrival" },
  { title: "Best Seller", value: "best-seller" },
  { title: "Limited Edition", value: "limited-edition" },
  { title: "Sale", value: "sale" },
];

const DEFAULT_SIZES = [6, 7, 8, 9, 10];

interface Shoe {
  _id: string;
  orderNumber: number;
  productName: string;
  price: number;
  stock: number;
  isDisabled: boolean;
  images?: any;
  productLabel?: string[];
  sizes?: number[];
  disabledSizes?: number[];
}

type StatusFilter = "all" | "active" | "disabled";
type LabelFilter = "all" | string;

export default function ProductsPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [editingProduct, setEditingProduct] = useState<Shoe | null>(null);
  const [editForm, setEditForm] = useState({
    productName: "",
    price: 0,
    orderNumber: 0,
    productLabel: [] as string[],
    disabledSizes: [] as number[],
  });
  const [reorderSaving, setReorderSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileView, setMobileView] = useState(false);

  // Image replacement state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setMobileView(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      // Fetch count first so we know the exact ceiling, then fetch all docs.
      // Running them in parallel would race — the docs query needs the count.
      const count = await sanityClient.fetch<number>(
        `count(*[_type == "shoe"])`,
      );
      setTotalCount(count);

      const data = await sanityClient.fetch<Shoe[]>(
        `*[_type == "shoe"] | order(orderNumber asc) [0...${count + 1}] {
          _id,
          orderNumber,
          productName,
          price,
          stock,
          isDisabled,
          images[0],
          productLabel,
          sizes,
          disabledSizes
        }`,
      );
      setShoes(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized image URL generation using Sanity CDN
  const getOptimizedImageUrl = useCallback((image: any) => {
    if (!image?.asset?._ref) return null;

    const ref = image.asset._ref;

    try {
      const parts = ref.split("-");

      if (parts.length >= 4) {
        const hash = parts[1];
        const dimensions = parts[2];
        const format = parts[3];

        const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
        if (!projectId) return null;

        return `https://cdn.sanity.io/images/${projectId}/production/${hash}-${dimensions}.${format}`;
      }

      const match = ref.match(/image-([^-]+)-(\d+x\d+)-(\w+)/);
      if (match) {
        const [, hash, dimensions, format] = match;
        const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
        return `https://cdn.sanity.io/images/${projectId}/production/${hash}-${dimensions}.${format}`;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Filter and paginate products
  const { filteredProducts, totalPages } = useMemo(() => {
    const filtered = shoes.filter((shoe) => {
      const searchTerm = search.toLowerCase();
      const isNumericSearch = !isNaN(Number(searchTerm));
      const numericValue = isNumericSearch ? Number(searchTerm) : null;

      const matchesSearch =
        shoe.productName.toLowerCase().includes(searchTerm) ||
        shoe.orderNumber.toString().includes(searchTerm) ||
        shoe._id.toLowerCase().includes(searchTerm) ||
        (isNumericSearch &&
          (shoe.orderNumber === numericValue ||
            shoe.price === numericValue ||
            shoe.stock === numericValue));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "disabled" && shoe.isDisabled) ||
        (statusFilter === "active" && !shoe.isDisabled);

      const matchesLabel =
        labelFilter === "all" ||
        (shoe.productLabel || []).includes(labelFilter);

      return matchesSearch && matchesStatus && matchesLabel;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return { filteredProducts: paginated, totalPages };
  }, [shoes, search, statusFilter, labelFilter, currentPage, itemsPerPage]);
  console.log(filteredProducts);
  // Toggle product status
  const toggleProductStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      if (
        !confirm(
          `Are you sure you want to ${currentStatus ? "enable" : "disable"} this product?`,
        )
      )
        return;

      try {
        await sanityClient
          .patch(id)
          .set({ isDisabled: !currentStatus })
          .commit();

        setShoes((prev) =>
          prev.map((shoe) =>
            shoe._id === id ? { ...shoe, isDisabled: !currentStatus } : shoe,
          ),
        );
        // Keep the open modal in sync
        setEditingProduct((prev) =>
          prev && prev._id === id
            ? { ...prev, isDisabled: !currentStatus }
            : prev,
        );
      } catch (error) {
        console.error("Error updating product:", error);
        alert("Failed to update product status");
      }
    },
    [],
  );

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await sanityClient.delete(id);
      setShoes((prev) => prev.filter((shoe) => shoe._id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  }, []);

  // Edit product
  const startEdit = (product: Shoe) => {
    setEditingProduct(product);
    setEditForm({
      productName: product.productName,
      price: product.price,
      orderNumber: product.orderNumber,
      productLabel: product.productLabel || [],
      disabledSizes: product.disabledSizes || [],
    });
    // Reset image state
    setImageFile(null);
    setImagePreview(null);
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleEditLabel = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      productLabel: prev.productLabel.includes(value)
        ? prev.productLabel.filter((v) => v !== value)
        : [...prev.productLabel, value],
    }));
  };

  const toggleEditSize = (size: number) => {
    setEditForm((prev) => ({
      ...prev,
      disabledSizes: prev.disabledSizes.includes(size)
        ? prev.disabledSizes.filter((s) => s !== size)
        : [...prev.disabledSizes, size],
    }));
  };

  // Handle image file selection
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

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveEdit = async () => {
    if (!editingProduct) return;

    try {
      // Upload new image first if one was selected
      if (imageFile) {
        setUploadingImage(true);

        const formData = new FormData();
        formData.append("image", imageFile);

        const res = await fetch(`/api/products/${editingProduct._id}/image`, {
          method: "PUT",
          body: formData,
        });

        // Guard against HTML error pages (404, 500, etc.)
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            `Upload failed (HTTP ${res.status}). Check that the API route exists at app/api/products/[id]/image/route.ts`,
          );
        }

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || "Image upload failed");
        }

        const { imageRef } = payload;

        // Update local state with new image ref
        setShoes((prev) =>
          prev.map((shoe) =>
            shoe._id === editingProduct._id
              ? {
                  ...shoe,
                  images: {
                    _type: "image",
                    asset: { _type: "reference", _ref: imageRef },
                  },
                }
              : shoe,
          ),
        );

        setUploadingImage(false);
      }

      const oldOrderNumber = editingProduct.orderNumber;
      // Clamp to [1, totalCount] — totalCount comes from Sanity directly,
      // so it's always correct even if shoes[] only partially loaded.
      const finalOrderNumber = Math.max(
        1,
        Math.min(editForm.orderNumber, totalCount),
      );
      const orderChanged = finalOrderNumber !== oldOrderNumber;

      if (orderChanged) {
        setReorderSaving(true);

        // Fetch ALL product IDs + orderNumbers straight from Sanity.
        // We cannot use the local shoes[] array for reordering because Sanity
        // silently caps fetches — shoes[] may only contain a subset of products,
        // which causes splice-based reordering to cap at the wrong maximum.
        const allShoes = await sanityClient.fetch<
          { _id: string; orderNumber: number }[]
        >(
          `*[_type == "shoe"] | order(orderNumber asc) [0...${totalCount + 100}] { _id, orderNumber }`,
        );

        // Remove the edited shoe, insert at the target position, re-sequence.
        const withoutEdited = allShoes.filter(
          (s) => s._id !== editingProduct._id,
        );
        withoutEdited.splice(finalOrderNumber - 1, 0, {
          _id: editingProduct._id,
          orderNumber: finalOrderNumber,
        });
        const reordered = withoutEdited.map((s, idx) => ({
          ...s,
          orderNumber: idx + 1,
        }));

        // Only patch docs whose orderNumber actually changed
        const changed = reordered.filter((s) => {
          const orig = allShoes.find((o) => o._id === s._id);
          return orig && orig.orderNumber !== s.orderNumber;
        });

        // Batch in groups of 50 to avoid rate-limiting Sanity
        const BATCH = 50;
        for (let i = 0; i < changed.length; i += BATCH) {
          await Promise.all(
            changed
              .slice(i, i + BATCH)
              .map((s) =>
                sanityClient
                  .patch(s._id)
                  .set({ orderNumber: s.orderNumber })
                  .commit(),
              ),
          );
        }

        // Update local state order numbers for docs we have in memory
        setShoes((prev) => {
          const orderMap = new Map(
            reordered.map((s) => [s._id, s.orderNumber]),
          );
          return prev
            .map((s) => ({
              ...s,
              orderNumber: orderMap.get(s._id) ?? s.orderNumber,
            }))
            .sort((a, b) => a.orderNumber - b.orderNumber);
        });

        setReorderSaving(false);
      }

      // Patch name + price + label + sizes + final order number for the edited shoe
      await sanityClient
        .patch(editingProduct._id)
        .set({
          productName: editForm.productName,
          price: editForm.price,
          orderNumber: finalOrderNumber,
          productLabel: editForm.productLabel,
          disabledSizes: editForm.disabledSizes,
        })
        .commit();

      setShoes((prev) =>
        prev
          .map((shoe) =>
            shoe._id === editingProduct._id
              ? {
                  ...shoe,
                  productName: editForm.productName,
                  price: editForm.price,
                  orderNumber: finalOrderNumber,
                  productLabel: editForm.productLabel,
                  disabledSizes: editForm.disabledSizes,
                }
              : shoe,
          )
          .sort((a, b) => a.orderNumber - b.orderNumber),
      );

      closeEdit();
    } catch (error: any) {
      console.error("Error updating product:", error);
      alert(error.message || "Failed to update product");
      setUploadingImage(false);
      setReorderSaving(false);
    }
  };

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      <div>
        {/* Search and Filters */}
        <div className="bg-white rounded-t-3xl p-4 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
                <input
                  type="text"
                  placeholder="Search by ID, name, or order number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm md:text-base bg-muted rounded-2xl focus:ring-2 text-muted-foreground font-semibold focus:border-transparent"
                />
              </div>
              <div>
                <Link href="/admin/products/new">
                  <Button>
                    <Plus className="h-4 w-4" />{" "}
                    <span className="md: :hidden">Add Shoe</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs md:text-sm text-muted-foreground font-semibold">
                {filteredProducts.length} of {shoes.length} products
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className="text-xs md:text-sm rounded-full bg-muted font-semibold px-2 py-1"
                >
                  <option value="all">All status</option>
                  <option value="active">Active only</option>
                  <option value="disabled">Disabled only</option>
                </select>
                <select
                  value={labelFilter}
                  onChange={(e) => {
                    setLabelFilter(e.target.value as LabelFilter);
                    setCurrentPage(1);
                  }}
                  className="text-xs md:text-sm rounded-full bg-muted font-semibold px-2 py-1"
                >
                  <option value="all">All labels</option>
                  {LABEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.title}
                    </option>
                  ))}
                </select>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs md:text-sm rounded-full bg-muted font-semibold px-2 py-1"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-2 max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold tracking-tight">
                    Edit Product
                  </h3>
                  <Button onClick={closeEdit} variant={"ghost"} size="icon">
                    <X />
                  </Button>
                </div>

                {/* Product Image with Replace Option */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Product Image
                  </label>

                  <div className="relative rounded-xl overflow-hidden border bg-gray-50 aspect-square w-full max-w-[200px] mx-auto mb-3">
                    {imagePreview ? (
                      <>
                        <Image
                          src={imagePreview}
                          alt="New image preview"
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                        {/* Clear new image selection */}
                        <button
                          onClick={clearImageSelection}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                          title="Remove selected image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-xs text-center py-1 font-medium">
                          New image selected
                        </div>
                      </>
                    ) : editingProduct.images ? (
                      <Image
                        src={getOptimizedImageUrl(editingProduct.images) || ""}
                        alt={editingProduct.productName}
                        fill
                        sizes="200px"
                        className="object-cover"
                        quality={80}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-replace-input"
                  />

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    type="button"
                  >
                    <Upload className="h-4 w-4" />
                    {imageFile ? "Change Selected Image" : "Replace Image"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-1.5">
                    JPEG, PNG, WebP or AVIF · Max 10MB
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={editForm.productName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          productName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground mb-1">
                        Order Number
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editForm.orderNumber}
                        onChange={(e) => {
                          // Allow free typing — do NOT clamp here so mid-type values work
                          const raw = parseInt(e.target.value) || 1;
                          setEditForm({ ...editForm, orderNumber: raw });
                        }}
                        onBlur={(e) => {
                          // Clamp only when the user leaves the field
                          const raw = parseInt(e.target.value) || 1;
                          const clamped = Math.max(
                            1,
                            Math.min(raw, totalCount),
                          );
                          setEditForm({ ...editForm, orderNumber: clamped });
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:border-transparent ${
                          editForm.orderNumber !== editingProduct.orderNumber
                            ? "border-amber-400 focus:ring-amber-400 bg-amber-50"
                            : "focus:ring-blue-500"
                        }`}
                      />
                      {editForm.orderNumber !== editingProduct.orderNumber && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">
                          {editForm.orderNumber > totalCount
                            ? `Max is ${totalCount} — will be placed last`
                            : shoes.find(
                                  (s) =>
                                    s.orderNumber === editForm.orderNumber &&
                                    s._id !== editingProduct._id,
                                )
                              ? `#${editForm.orderNumber} is taken — products will shift`
                              : "Other products will be re-numbered"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">
                      Product Label
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LABEL_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-xs border rounded-lg px-3 py-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.productLabel.includes(opt.value)}
                            onChange={() => toggleEditLabel(opt.value)}
                          />
                          {opt.title}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Size availability */}
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">
                      Sizes{" "}
                      <span className="font-normal">(tap to disable)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(editingProduct.sizes?.length
                        ? editingProduct.sizes
                        : DEFAULT_SIZES
                      ).map((size) => {
                        const off = editForm.disabledSizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleEditSize(size)}
                            className={`h-9 min-w-9 px-3 rounded-lg border text-sm font-semibold transition ${
                              off
                                ? "bg-red-50 border-red-300 text-red-500 line-through"
                                : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-xs text-gray-500">
                        {editingProduct.isDisabled ? "Disabled" : "Active"}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        toggleProductStatus(
                          editingProduct._id,
                          editingProduct.isDisabled,
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        editingProduct.isDisabled
                          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {editingProduct.isDisabled ? "Enable" : "Disable"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 md:gap-3 mt-6 pt-4 border-t">
                  <Button onClick={closeEdit} variant={"outline"}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEdit}
                    variant={"secondary"}
                    disabled={uploadingImage || reorderSaving}
                    className="gap-2"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : reorderSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reordering...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Table - Responsive */}
        <div className="bg-white overflow-hidden">
          {mobileView ? (
            /* Mobile Card View */
            <div className="divide-y divide-muted">
              {filteredProducts.map((shoe) => {
                const imageUrl = getOptimizedImageUrl(shoe.images);

                return (
                  <div
                    key={shoe._id}
                    className={`p-3 ${shoe.isDisabled ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {imageUrl ? (
                            <div className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0">
                              <Image
                                src={imageUrl}
                                alt={shoe.productName}
                                fill
                                sizes="(max-width: 768px) 64px, 64px"
                                className="object-cover"
                                loading="lazy"
                                quality={70}
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-foreground tracking-tight text-sm">
                              #{shoe.orderNumber} - {shoe.productName}
                            </div>
                            <div className="text-md tracking-tight text-muted-foreground font-semibold">
                              ₹{shoe.price}
                            </div>
                            {shoe.productLabel &&
                              shoe.productLabel.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {shoe.productLabel.map((label) => (
                                    <span
                                      key={label}
                                      className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-semibold"
                                    >
                                      {LABEL_OPTIONS.find(
                                        (o) => o.value === label,
                                      )?.title || label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            {!!shoe.disabledSizes?.length && (
                              <div className="text-[10px] text-red-500 font-semibold mt-1">
                                Sizes off: {shoe.disabledSizes.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <Button
                            onClick={() =>
                              toggleProductStatus(shoe._id, shoe.isDisabled)
                            }
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              shoe.isDisabled
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {shoe.isDisabled ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Disabled
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Active
                              </>
                            )}
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => startEdit(shoe)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              variant={"outline"}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteProduct(shoe._id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              size={"icon"}
                              variant={"outline"}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Order #",
                      "Product",
                      "Price",
                      "Label",
                      "Sizes off",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((shoe) => {
                    const imageUrl = getOptimizedImageUrl(shoe.images);

                    return (
                      <tr
                        key={shoe._id}
                        className={shoe.isDisabled ? "bg-gray-50" : ""}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {shoe.orderNumber}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            {imageUrl ? (
                              <div className="relative h-10 w-10 rounded overflow-hidden mr-3 flex-shrink-0">
                                <Image
                                  src={imageUrl}
                                  alt={shoe.productName}
                                  fill
                                  sizes="(max-width: 768px) 40px, 40px"
                                  className="object-cover"
                                  loading="lazy"
                                  quality={70}
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center mr-3 flex-shrink-0">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                {shoe.productName}
                              </div>
                              {shoe.isDisabled && (
                                <div className="text-xs text-gray-500">
                                  Disabled
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          ₹{shoe.price}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {(shoe.productLabel || []).map((label) => (
                              <span
                                key={label}
                                className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-semibold"
                              >
                                {LABEL_OPTIONS.find((o) => o.value === label)
                                  ?.title || label}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {shoe.disabledSizes?.length ? (
                            <span className="text-red-500 font-semibold">
                              {shoe.disabledSizes.join(", ")}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            onClick={() =>
                              toggleProductStatus(shoe._id, shoe.isDisabled)
                            }
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              shoe.isDisabled
                                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            }`}
                          >
                            {shoe.isDisabled ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Disabled
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Active
                              </>
                            )}
                          </Button>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => startEdit(shoe)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit"
                              variant={"outline"}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteProduct(shoe._id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete"
                              size={"icon"}
                              variant={"outline"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2 font-semibold">
                No products found
              </div>
              {(search || statusFilter !== "all" || labelFilter !== "all") && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setLabelFilter("all");
                  }}
                  variant={"outline"}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white md:rounded-b-3xl p-4">
            <div className="text-sm text-muted-foreground font-semibold">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant={"outline"}
                size={"icon"}
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-1 text-sm ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }`}
                    variant={"ghost"}
                    size={"icon"}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                variant={"outline"}
                size={"icon"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
