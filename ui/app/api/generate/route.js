import { NextResponse } from 'next/server';
import { getTokens, getFbTokens, getUnipileTokens } from '@/lib/tokens';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';
export const maxDuration = 50;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  let userGeminiApiKey = null;
  let isUserAuthenticated = false;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const userRes = await fetch(`${apiBase}/auth/me`, {
        headers: { 'Authorization': authHeader }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user) {
          userGeminiApiKey = userData.user.geminiApiKey;
          isUserAuthenticated = true;
        }
      }
    } catch (err) {
      console.error('[Generate] Failed to fetch user profile:', err.message);
    }
  }

  // Fallback to checking social token cookies if no authHeader / invalid token
  if (!isUserAuthenticated) {
    const igTokens = await getTokens();
    const fbTokens = await getFbTokens();
    const unipileTokens = await getUnipileTokens();
    isUserAuthenticated = igTokens.accessToken || fbTokens.pageToken || unipileTokens.accountId;
  }

  if (!isUserAuthenticated) {
    return NextResponse.json(
      { error: 'Not authenticated. Please connect at least one account.' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const prompt = formData.get('prompt')?.trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const apiKey = userGeminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    // Step 1: Analyze the product in the uploaded image using Gemini Multimodal
    const base64Data = Buffer.from(bytes).toString('base64');
    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text: "Analyze the product in the foreground of this image. Describe the product itself in detail (e.g., its color, shape, materials, style, branding, and labels) so a text-to-image generator can accurately recreate it. Do not describe the background scene at all, focus only on the product. Keep it concise, under 60 words."
            },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini Multimodal API failed: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const productDescription = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!productDescription) {
      throw new Error('Gemini returned an empty product description.');
    }

    console.log('[Generate] Product description:', productDescription);

    // Step 2: Generate the final creative image using Imagen
    const finalPrompt = `Product photography: A high-quality commercial photo of ${productDescription} placed in ${prompt}. Studio lighting, clean composition, professional commercial photography, sharp focus on the product, 8k resolution, photorealistic.`;
    
    const imagenPayload = {
      instances: [{ prompt: finalPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1"
      }
    };

    const modelOptions = [
      'imagen-4.0-generate-001',
      'imagen-4.0-fast-generate-001',
      'imagen-3.0-generate-002'
    ];

    let base64Image = null;

    for (const modelName of modelOptions) {
      try {
        console.log(`[Generate] Trying model: ${modelName}`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imagenPayload)
        });

        if (response.ok) {
          const imagenData = await response.json();
          base64Image = imagenData.predictions?.[0]?.bytesBase64Encoded;
          if (base64Image) {
            console.log(`[Generate] Success using model: ${modelName}`);
            break;
          }
        } else {
          const errText = await response.text();
          console.warn(`[Generate] Model ${modelName} failed:`, errText);
        }
      } catch (err) {
        console.error(`[Generate] Error calling model ${modelName}:`, err.message);
      }
    }

    if (!base64Image) {
      throw new Error('All image generation models failed or returned empty predictions.');
    }

    // Step 3: Upload the generated image to Cloudinary
    const upload = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`, {
      folder: 'engage-socially/ai-generated',
      resource_type: 'image',
    });

    console.log('[Generate] Uploaded to Cloudinary:', upload.secure_url);

    return NextResponse.json({ status: 'ready', imageUrl: upload.secure_url });
  } catch (err) {
    console.error('[Generate error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}