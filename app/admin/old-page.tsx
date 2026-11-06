/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/products/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Menu,
  Download,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { client as sanityClient } from "@/lib/sanity";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Shoe {
  _id: string;
  orderNumber: number;
  productName: string;
  price: number;
  stock: number;
  isDisabled: boolean;
  images?: any;
}

export default function ProductsPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Shoe | null>(null);
  const [editForm, setEditForm] = useState({ productName: "", price: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileView, setMobileView] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
      // Fixed query - get the full image object, not just the ref
      const query = `*[_type == "shoe"] | order(orderNumber asc) {
        _id,
        orderNumber,
        productName,
        price,
        stock,
        isDisabled,
        images[0]
      }`;

      const data = await sanityClient.fetch(query);
      setShoes(data);
      console.log("Fetched products:", data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized image URL generation using Sanity CDN
  // app/admin/products/page.tsx - Update the getOptimizedImageUrl function:
  const getOptimizedImageUrl = useCallback(
    (image: any) => {
      if (!image?.asset?._ref) {
        console.log("No image ref found:", image);
        return null;
      }

      const ref = image.asset._ref;
      console.log("Image ref:", ref); // Debug log

      // Try different parsing methods
      try {
        // Method 1: Direct parsing
        // Format: image-{hash}-{width}x{height}-{format}
        const parts = ref.split("-");
        console.log("Parts:", parts); // Debug log

        if (parts.length >= 4) {
          const hash = parts[1]; // The hash/id part
          const dimensions = parts[2]; // e.g., 1024x1024
          const format = parts[3]; // e.g., jpg, png, etc

          const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
          if (!projectId) {
            console.error("Project ID not found");
            return null;
          }

          // Build URL: https://cdn.sanity.io/images/{projectId}/{dataset}/{hash}-{dimensions}.{format}
          const url = `https://cdn.sanity.io/images/${projectId}/production/${hash}-${dimensions}.${format}`;
          console.log("Built URL:", url); // Debug log
          return url;
        }

        // Method 2: If format is different
        const match = ref.match(/image-([^-]+)-(\d+x\d+)-(\w+)/);
        if (match) {
          const [, hash, dimensions, format] = match;
          const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
          const url = `https://cdn.sanity.io/images/${projectId}/production/${hash}-${dimensions}.${format}`;
          console.log("Built URL (method 2):", url);
          return url;
        }

        console.log("Could not parse image ref:", ref);
        return null;
      } catch (error) {
        console.error("Error parsing image URL:", error);
        return null;
      }
    },
    [mobileView],
  );

  // Filter and paginate products
  // Filter and paginate products
  const { filteredProducts, totalPages } = useMemo(() => {
    const filtered = shoes.filter((shoe) => {
      const searchTerm = search.toLowerCase();

      // Check if search is a number (could be ID or order number)
      const isNumericSearch = !isNaN(Number(searchTerm));
      const numericValue = isNumericSearch ? Number(searchTerm) : null;

      return (
        // Search by product name
        shoe.productName.toLowerCase().includes(searchTerm) ||
        // Search by order number (exact match or partial)
        shoe.orderNumber.toString().includes(searchTerm) ||
        // Search by Sanity document ID (partial match)
        shoe._id.toLowerCase().includes(searchTerm) ||
        // Exact numeric matches
        (isNumericSearch &&
          (shoe.orderNumber === numericValue ||
            shoe.price === numericValue ||
            shoe.stock === numericValue))
      );
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return { filteredProducts: paginated, totalPages };
  }, [shoes, search, currentPage, itemsPerPage]);

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
    });
  };

  const saveEdit = async () => {
    if (!editingProduct) return;

    try {
      await sanityClient
        .patch(editingProduct._id)
        .set({
          productName: editForm.productName,
          price: editForm.price,
        })
        .commit();

      setShoes((prev) =>
        prev.map((shoe) =>
          shoe._id === editingProduct._id
            ? {
                ...shoe,
                productName: editForm.productName,
                price: editForm.price,
              }
            : shoe,
        ),
      );

      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product");
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
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between  p-2 md:p-4">
        <div className="flex items-center gap-3">
          {/* {mobileView && (
              <Button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )} */}
          <div>
            <h1 className="text-4xl  text-secondary font-bold tracking-tighter">
              MagShoppy
            </h1>
            <p className="text-xs md:text-sm text-gray-50 bg-secondary px-2 p-1 rounded tracking-tight font-semibold">
              Manage Products
            </p>
          </div>
        </div>

        {mobileView && (
          <div className="flex items-center gap-2">
            <Link href="/admin/products/new">
              <Button variant={"secondary"}>
                <Plus />
                Add Shoe
              </Button>
            </Link>
          </div>
        )}
        {!mobileView && (
          <div className="flex items-center gap-3">
            <Link href="/admin/products/new">
              <Button variant={"secondary"}>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className=" ">
        {/* Mobile Menu */}

        {/* Search and Filters - Responsive */}
        <div className="bg-white rounded-t-3xl p-4 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
              <input
                type="text"
                placeholder="Search by ID, name, or order number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm md:text-base  bg-muted rounded-2xl focus:ring-2 text-muted-foreground font-semibold focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs md:text-sm text-muted-foreground font-semibold">
                {filteredProducts.length} of {shoes.length} products
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs md:text-sm   rounded-full bg-muted font-semibold px-2 py-1"
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-2">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold tracking-tight">
                    Edit Product
                  </h3>
                  <Button
                    onClick={() => setEditingProduct(null)}
                    variant={"ghost"}
                    size="icon"
                  >
                    <X />
                  </Button>
                </div>

                {/* Product Image */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Product Image
                  </label>
                  <div className="flex items-center gap-4">
                    {editingProduct.images ? (
                      <div className="relative h-24 w-24 rounded-xl overflow-hidden border">
                        <Image
                          src={
                            getOptimizedImageUrl(editingProduct.images) || ""
                          }
                          alt={editingProduct.productName}
                          fill
                          sizes="96px"
                          className="object-cover"
                          quality={80}
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-xl bg-gray-100 border flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">
                        Current product image
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        To change image, delete and re-add product
                      </p>
                    </div>
                  </div>
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
                        value={editingProduct.orderNumber}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-xl border bg-gray-50 text-gray-500"
                      />
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
                  <Button
                    onClick={() => setEditingProduct(null)}
                    variant={"outline"}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} variant={"secondary"}>
                    Save Changes
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
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
              {search && (
                <Button onClick={() => setSearch("")} variant={"outline"}>
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination - Responsive */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white md:rounded-b-3xl  p-4">
            <div className="text-sm text-muted-foreground font-semibold">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant={"outline"}
                size={"icon"}
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 "
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
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 "
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
