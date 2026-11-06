// app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// POST /api/reviews — create a new review document.
// Body: { customerName, shoeId?, rating, reviewText?, imageRefs?, isVerifiedPurchase?, isApproved? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      shoeId,
      rating,
      reviewText,
      imageRefs = [],
      isVerifiedPurchase = false,
      isApproved = false,
    } = body;

    if (!customerName || typeof customerName !== "string") {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const doc: any = {
      _type: "review",
      customerName,
      rating,
      reviewText: reviewText || "",
      isVerifiedPurchase,
      isApproved,
      createdAt: new Date().toISOString(),
    };

    if (shoeId) {
      doc.shoe = { _type: "reference", _ref: shoeId };
    }

    if (Array.isArray(imageRefs) && imageRefs.length > 0) {
      doc.reviewImages = imageRefs.map((ref: string) => ({
        _type: "image",
        _key: ref,
        asset: { _type: "reference", _ref: ref },
      }));
    }

    const created = await writeClient.create(doc);

    return NextResponse.json({ review: created });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create review" },
      { status: 500 }
    );
  }
}