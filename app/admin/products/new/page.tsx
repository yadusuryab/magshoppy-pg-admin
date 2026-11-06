/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/products/new/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { client as sanityClient } from "@/lib/sanity";
import { ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const LABEL_OPTIONS = [
  { title: "Trending", value: "trending" },
  { title: "New Arrival", value: "new-arrival" },
  { title: "Best Seller", value: "best-seller" },
  { title: "Limited Edition", value: "limited-edition" },
  { title: "Sale", value: "sale" },
];

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    orderNumber: 0,
    productName: "",
    price: 0,
  });

  const [productLabel, setProductLabel] = useState<string[]>([]);

  const [images, setImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");

  const toggleLabel = (value: string) => {
    setProductLabel((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).slice(0, 10); // Limit to 10 images
    setImages((prev) => [...prev, ...newImages]);
    setImageError("");

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images to Sanity
  const uploadImagesToSanity = async (): Promise<any[]> => {
    if (images.length === 0) return [];

    setUploadingImages(true);
    setUploadProgress(0);

    const uploaded: any[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];

      try {
        // Upload image to Sanity
        const asset = await sanityClient.assets.upload("image", file, {
          filename: file.name,
          contentType: file.type,
        });

        uploaded.push({
          _type: "image",
          asset: {
            _type: "reference",
            _ref: asset._id,
          },
        });

        // Update progress
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      } catch (err) {
        console.error("Failed to upload image:", err);
        throw new Error(`Failed to upload image: ${file.name}`);
      }
    }

    setUploadingImages(false);
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate images before form submission
    if (images.length === 0) {
      setImageError("Please upload at least one image");
      setLoading(false);
      return;
    }

    // Validate other fields
    if (formData.orderNumber <= 0) {
      setError("Order number must be greater than 0");
      setLoading(false);
      return;
    }

    if (formData.price <= 0) {
      setError("Price must be greater than 0");
      setLoading(false);
      return;
    }

    if (!formData.productName.trim()) {
      setError("Product name is required");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Upload images
      const uploadedImages = await uploadImagesToSanity();

      // Step 2: Fetch all products to find conflicts
      const allProducts = await sanityClient.fetch(`
        *[_type == "shoe"] | order(orderNumber asc) {
          _id,
          orderNumber
        }
      `);

      // Step 3: Find products that need to be shifted
      const productsToShift = allProducts.filter(
        (product: any) => product.orderNumber >= formData.orderNumber,
      );

      // Step 4: Create transaction for all updates
      const transaction = sanityClient.transaction();

      // Add shift operations in reverse order (to avoid conflicts)
      productsToShift
        .sort((a: any, b: any) => b.orderNumber - a.orderNumber) // Sort descending
        .forEach((product: any) => {
          transaction.patch(product._id, {
            set: { orderNumber: product.orderNumber + 1 },
          });
        });

      // Add create operation for new product
      transaction.create({
        _type: "shoe",
        orderNumber: formData.orderNumber,
        productName: formData.productName,
        price: formData.price,
        images: uploadedImages,
        productLabel,
        buyOneGetOne: true,
        sizes: [6, 7, 8, 9, 10],
        stock: 10,
        isDisabled: false,
        category: "sneakers",
        shoeBrand: "MagShoppy",
      });

      // Step 5: Commit the transaction
      await transaction.commit();

      // Show success message
      console.log(`✅ Created product at order ${formData.orderNumber}`);
      console.log(`➡️  Shifted ${productsToShift.length} products forward`);

      // Step 6: Redirect
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      console.error("Error creating product:", err);

      // Provide specific error messages
      if (err.message.includes("already exists")) {
        setError(
          "A product with this order number already exists. Try a different order number.",
        );
      } else if (err.message.includes("unique")) {
        setError("Order number conflict. Please try a different order number.");
      } else {
        setError(err.message || "Failed to create product");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/" className="text-gray-600 hover:text-gray-900">
          <Button size="icon" variant={"outline"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Shoe</h1>
          <p className="text-muted-foreground font-semibold tracking-tight">
            Fill name, order number, price and images
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white p-3">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Simple 3-field form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Order Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number *
              </label>
              <input
                type="number"
                value={formData.orderNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    orderNumber: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border  rounded-lg"
                placeholder="e.g., 472"
                required
                min="1"
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                className="w-full px-3 py-2 border  rounded-lg"
                placeholder="Name of the product."
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border  rounded-lg"
                placeholder="e.g., 999"
                required
                min="0.01"
              />
            </div>
          </div>

          {/* Product Label Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Label
            </label>
            <div className="flex flex-wrap gap-3">
              {LABEL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={productLabel.includes(opt.value)}
                    onChange={() => toggleLabel(opt.value)}
                  />
                  {opt.title}
                </label>
              ))}
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images *
            </label>

            {imageError && (
              <p className="text-red-600 text-sm mb-2">{imageError}</p>
            )}

            {/* Upload Area */}
            <div className="mt-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed  rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Click to upload images or drag and drop
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PNG, JPG, GIF up to 10MB
                </p>
                {/* REMOVED required attribute from file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Selected Images ({images.length})
                </h3>

                {/* Upload Progress */}
                {uploadingImages && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Uploading images...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {image.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Default Settings Info */}

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link href="/admin">
              <Button variant={"outline"}>Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || uploadingImages}
              className="disabled:opacity-50"
            >
              {loading || uploadingImages ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {uploadingImages ? "Uploading..." : "Creating..."}
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
