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
        { error: "File gambar makanan wajib disertakan." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const genAI = new GoogleGenerativeAI(apiKey);

    const nutritionSchema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        food_name: {
          type: SchemaType.STRING,
          description: "Nama menu makanan atau minuman",
        },
        serving: {
          type: SchemaType.STRING,
          description: "Estimasi porsi (misal: 1 piring, 1 mangkok, 200g)",
        },
        calories: {
          type: SchemaType.NUMBER,
          description: "Total estimasi kalori murni (kcal)",
        },
        protein: {
          type: SchemaType.NUMBER,
          description: "Estimasi protein dalam gram",
        },
        carbs: {
          type: SchemaType.NUMBER,
          description: "Estimasi karbohidrat dalam gram",
        },
        fat: {
          type: SchemaType.NUMBER,
          description: "Estimasi lemak dalam gram",
        },
      },
      required: ["food_name", "serving", "calories", "protein", "carbs", "fat"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
      },
    });

    const prompt =
      "Analisis gambar hidangan/makanan ini. Berikan estimasi nama makanan, takaran porsi, serta rincian makronutrisinya (kalori kcal, protein gram, karbohidrat gram, dan lemak gram).";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type || "image/jpeg",
        },
      },
    ]);

    const extractedNutrition = JSON.parse(result.response.text());

    return NextResponse.json({
      success: true,
      data: extractedNutrition,
    });
  } catch (error: any) {
    console.error("Gemini Food Scanner Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengidentifikasi nutrisi makanan." },
      { status: 500 },
    );
  }
}
