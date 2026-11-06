/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/reviews/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Trash2,
  Eye,
  EyeOff,
  Search,
  Star,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  BadgeCheck,
  Plus,
  Upload,
} from "lucide-react";
import { client as sanityClient } from "@/lib/sanity";
import { Button } from "@/components/ui/button";

interface ReviewImage {
  asset: { _ref: string };
}

interface Review {
  _id: string;
  customerName: string;
  rating: number;
  reviewText?: string;
  reviewImages?: ReviewImage[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  shoe?: { productName: string; _id: string };
}

interface Shoe {
  _id: string;
  productName: string;
}

type StatusFilter = "all" | "approved" | "pending";

interface NewReviewForm {
  customerName: string;
  rating: number;
  reviewText: string;
  shoeId: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  reviewImages: File[];
}

const initialFormState: NewReviewForm = {
  customerName: "Anonymous",
  rating: 5,
  reviewText: "",
  shoeId: "",
  isVerifiedPurchase: false,
  isApproved: true,
  reviewImages: [],
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileView, setMobileView] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<NewReviewForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  useEffect(() => {
    const check = () => setMobileView(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchShoes();
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sanityClient.fetch<Review[]>(
        `*[_type == "review"] | order(createdAt desc) {
          _id, 
          customerName, 
          rating, 
          reviewText, 
          isVerifiedPurchase, 
          isApproved, 
          createdAt,
          reviewImages,
          "shoe": shoe->{_id, productName}
        }`,
      );
      console.log("Fetched reviews:", data);
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      setDebugInfo(`Error fetching reviews: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShoes = useCallback(async () => {
    try {
      const data = await sanityClient.fetch<Shoe[]>(
        `*[_type == "shoe"] | order(productName asc) {
          _id,
          productName
        }`,
      );
      setShoes(data || []);
    } catch (error) {
      console.error("Error fetching shoes:", error);
    }
  }, []);

  const getImageUrl = useCallback((image: any) => {
    if (!image?.asset?._ref) return null;
    try {
      const ref = image.asset._ref;
      const parts = ref.split("-");
      if (parts.length >= 3) {
        const projectId =
          process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "your-project-id";
        const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
        return `https://cdn.sanity.io/images/${projectId}/${dataset}/${parts[1]}-${parts[2]}.${parts[3] || "jpg"}`;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const { filtered, totalPages } = useMemo(() => {
    const f = (reviews || []).filter((r) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        r.customerName?.toLowerCase().includes(term) ||
        r.shoe?.productName?.toLowerCase().includes(term) ||
        r.reviewText?.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && r.isApproved) ||
        (statusFilter === "pending" && !r.isApproved);
      return matchesSearch && matchesStatus;
    });
    const start = (currentPage - 1) * itemsPerPage;
    return {
      filtered: f.slice(start, start + itemsPerPage),
      totalPages: Math.ceil(f.length / itemsPerPage),
    };
  }, [reviews, search, statusFilter, currentPage, itemsPerPage]);

  const toggleApproval = useCallback(async (id: string, current: boolean) => {
    try {
      await sanityClient.patch(id).set({ isApproved: !current }).commit();
      setReviews((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isApproved: !current } : r)),
      );
    } catch (error) {
      console.error("Error updating review:", error);
      alert("Failed to update review status");
    }
  }, []);

  const deleteReview = useCallback(async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await sanityClient.delete(id);
      setReviews((prev) => prev.filter((r) => r._id !== id));
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review");
    }
  }, []);

  const handleImageUpload = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const newPreviews: string[] = [];

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === fileArray.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setFormData((prev) => ({
      ...prev,
      reviewImages: [...prev.reviewImages, ...fileArray],
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      reviewImages: prev.reviewImages.filter((_, i) => i !== index),
    }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadImagesToSanity = async (files: File[]): Promise<any[]> => {
    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      try {
        setUploadProgress(`Uploading image ${i + 1} of ${files.length}...`);
        const asset = await sanityClient.assets.upload("image", files[i]);
        uploadedImages.push({
          _type: "image",
          asset: {
            _type: "reference",
            _ref: asset._id,
          },
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
      }
    }
    return uploadedImages;
  };

  const handleSubmitReview = async () => {
    // Only require at least one image
    if (formData.reviewImages.length === 0) {
      alert("Please upload at least one review image");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("");

    try {
      // Upload images first
      const reviewImages = await uploadImagesToSanity(formData.reviewImages);

      // Create the review document with defaults for optional fields
      const reviewDoc: any = {
        _type: "review",
        customerName: formData.customerName || "Anonymous",
        rating: formData.rating || 5,
        reviewText: formData.reviewText || "",
        isVerifiedPurchase: formData.isVerifiedPurchase,
        isApproved: true, // Always approved by default for quick display
        createdAt: new Date().toISOString(),
        reviewImages: reviewImages,
      };

      // Only add shoe reference if a shoe was selected
      if (formData.shoeId) {
        reviewDoc.shoe = {
          _type: "reference",
          _ref: formData.shoeId,
        };
      }

      console.log("Creating review:", reviewDoc);

      const createdReview = await sanityClient.create(reviewDoc);
      console.log("Created review:", createdReview);

      // Reset form and close modal
      setFormData(initialFormState);
      setImagePreviews([]);
      setShowAddModal(false);
      setUploadProgress("");

      // Refresh reviews list
      await fetchReviews();
      alert("Review added successfully!");
    } catch (error: any) {
      console.error("Error adding review:", error);
      setDebugInfo(`Error adding review: ${error.message}`);
      alert("Failed to add review. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

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
      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
          {debugInfo}
        </div>
      )}

      <div>
        <div className="bg-white rounded-t-3xl p-4 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center   gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm md:text-base bg-muted rounded-2xl focus:ring-2 text-muted-foreground font-semibold focus:border-transparent"
                />
              </div>
              <Button
                onClick={() => {
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Review Image
              </Button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs md:text-sm text-muted-foreground font-semibold">
                {filtered.length} of {reviews.length} reviews
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className="text-xs md:text-sm rounded-full bg-muted font-semibold px-2 py-1"
                >
                  <option value="all">All status</option>
                  <option value="approved">Approved only</option>
                  <option value="pending">Pending only</option>
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

        {/* Simplified Add Review Modal - Only Image Required */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Review Image
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Image Upload - Primary Focus */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Images * (Required)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          Click to upload review images
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          You can select multiple images
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleImageUpload(e.target.files);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden"
                        >
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Fields - Collapsed/Simplified */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    <span>Optional Details</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>

                  <div className="mt-4 space-y-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Anonymous"
                      />
                    </div>

                    {/* Shoe Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product (Optional)
                      </label>
                      <select
                        value={formData.shoeId}
                        onChange={(e) =>
                          setFormData({ ...formData, shoeId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">No product</option>
                        {shoes.map((shoe) => (
                          <option key={shoe._id} value={shoe._id}>
                            {shoe.productName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating (Optional)
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, rating: star })
                            }
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-8 w-8 ${
                                star <= formData.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Text (Optional)
                      </label>
                      <textarea
                        value={formData.reviewText}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reviewText: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter review text"
                      />
                    </div>

                    {/* Verified Purchase */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isVerifiedPurchase}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isVerifiedPurchase: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Verified Purchase
                      </span>
                    </label>
                  </div>
                </details>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  className="text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || formData.reviewImages.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? "Uploading..." : "Add Review"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-2 text-sm text-gray-700">
            {uploadProgress}
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="relative w-full max-w-sm aspect-[9/16]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={previewImage}
                alt="Review"
                fill
                className="object-contain rounded-xl"
                sizes="100vw"
              />
            </div>
          </div>
        )}

        <div className="bg-white overflow-hidden divide-y divide-muted">
          {filtered.map((r) => {
            const firstImage = r.reviewImages?.[0]
              ? getImageUrl(r.reviewImages[0])
              : null;
            return (
              <div
                key={r._id}
                className={`p-3 md:p-4 ${!r.isApproved ? "bg-muted/50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {firstImage ? (
                    <button
                      onClick={() => setPreviewImage(firstImage)}
                      className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={firstImage}
                        alt={r.customerName}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ) : (
                    <div className="h-16 w-16 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {r.customerName || "Anonymous"}
                      </span>
                      {r.isVerifiedPurchase && (
                        <BadgeCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                      {r.rating && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    {r.shoe?.productName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.shoe.productName}
                      </p>
                    )}
                    {r.reviewText && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {r.reviewText}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <Button
                        onClick={() => toggleApproval(r._id, r.isApproved)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          r.isApproved
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {r.isApproved ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => deleteReview(r._id)}
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
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2 font-semibold">
                {reviews.length === 0
                  ? "No review images yet. Click 'Add Review Image' to upload."
                  : "No reviews found"}
              </div>
              {(search || statusFilter !== "all") && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  variant={"outline"}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

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
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }
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
