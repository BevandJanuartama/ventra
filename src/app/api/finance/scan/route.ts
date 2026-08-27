import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum disetel di .env.local" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File gambar struk wajib disertakan." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const genAI = new GoogleGenerativeAI(apiKey);

    const receiptSchema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        merchant: {
          type: SchemaType.STRING,
          description: "Nama merchant/toko",
        },
        date: { type: SchemaType.STRING, description: "Format: YYYY-MM-DD" },
        total: {
          type: SchemaType.NUMBER,
          description: "Total harga transaksi angka murni",
        },
        category: {
          type: SchemaType.STRING,
          description:
            "Kategori: Food & Drink, Groceries, Shopping, Transport, Utilities, Lainnya",
        },
        description: {
          type: SchemaType.STRING,
          description: "Ringkasan item pembelian",
        },
      },
      required: ["merchant", "total", "category"],
    };

    // Menggunakan Gemini 3.1 Flash / 3 Flash series
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      },
    });

    const prompt =
      "Ekstrak data transaksi dari struk berikut: nama merchant, tanggal (YYYY-MM-DD), total nominal harga, kategori, dan deskripsi singkat item.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type || "image/jpeg",
        },
      },
    ]);

    const extractedData = JSON.parse(result.response.text());

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses struk dengan AI" },
      { status: 500 },
    );
  }
}
