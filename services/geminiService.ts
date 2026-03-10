import { GoogleGenAI, Modality, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

const getAI = (): GoogleGenAI => {
    const customKey = localStorage.getItem('custom_gemini_api_key');
    const keyToUse = customKey || process.env.API_KEY;
    
    if (!keyToUse) {
        throw new Error('MISSING_API_KEY');
    }

    if (!aiInstance || currentApiKey !== keyToUse) {
        aiInstance = new GoogleGenAI({ apiKey: keyToUse as string });
        currentApiKey = keyToUse as string;
    }
    return aiInstance;
};

const getImageModel = () => {
    return localStorage.getItem('custom_gemini_image_model') || 'gemini-2.5-flash-image';
};

const getTextModel = () => {
    return localStorage.getItem('custom_gemini_text_model') || 'gemini-2.5-flash';
};

// A custom error class for better error identification
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Centralized error handler to provide more specific user-facing messages
const handleError = (error: any, context: string): never => {
  console.error(`Lỗi trong ${context}:`, error);
  // Log the full error object for easier debugging in the browser console
  console.error(`Full error object for context "${context}":`, error);

  let message = `Đã xảy ra lỗi không xác định khi ${context}. Vui lòng thử lại sau.`;

  if (error instanceof Error) {
    // Start with the original error message and refine it
    let specificMessage = error.message;
    const errorMessageLower = specificMessage.toLowerCase();
    
    if (errorMessageLower.includes('missing_api_key')) {
      specificMessage = 'Vui lòng nhập API Key trong phần "Nhập API Key" ở góc trên bên phải để sử dụng tính năng này.';
    } else if (errorMessageLower.includes('safety')) {
      specificMessage = 'Yêu cầu của bạn đã bị từ chối vì lý do an toàn. Vui lòng thử một mô tả hoặc hình ảnh khác.';
    } else if (errorMessageLower.includes('429') || errorMessageLower.includes('rate limit')) {
      specificMessage = 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.';
    } else if (errorMessageLower.includes('api key not valid')) {
      specificMessage = 'Lỗi cấu hình hệ thống (API Key không hợp lệ). Vui lòng liên hệ quản trị viên.';
    } else if (specificMessage.startsWith('model returned a text response')) {
      const modelResponse = specificMessage.substring(specificMessage.indexOf(':') + 1).trim();
      specificMessage = `AI không thể thực hiện yêu cầu và đã phản hồi: "${modelResponse}"`;
    } else if (errorMessageLower.includes('no image was generated') || errorMessageLower.includes('no edited image was returned')) {
      specificMessage = 'AI không thể tạo hoặc chỉnh sửa ảnh từ yêu cầu này. Vui lòng thử một mô tả khác, có thể chi tiết hơn.';
    } else if (errorMessageLower.includes('no valid image data') || errorMessageLower.includes('no valid edited image data') || errorMessageLower.includes('no valid ad creative data')) {
      specificMessage = 'AI đã trả về dữ liệu ảnh không hợp lệ hoặc trống. Vui lòng thử lại, có thể với một mô tả khác.';
    } else if (errorMessageLower.includes('failed to fetch')) {
        specificMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet và thử lại.'
    } else if (errorMessageLower.includes('deadline_exceeded')) {
        specificMessage = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.'
    }
    message = specificMessage;
  }
  
  throw new ApiError(message);
};


export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type VideoStyle = 'Mặc định' | 'Điện ảnh' | 'Sống động' | 'Tối giản';
export type BilingualPrompt = {
    vi: string;
    en: string;
};
export type ImageInput = {
    base64: string;
    mimeType: string;
};
// Fix: Add VideoScript type definition
export type VideoScript = {
  title: string;
  summary: string;
  scenes: {
    scene_number: number;
    visuals: string;
    voiceover: string;
    imageUrl?: string | 'loading' | 'failed';
  }[];
};
/**
 * Generates images from a text prompt using the 'imagen-4.0-generate-001' model.
 * @param prompt The text description of the image to generate.
 * @param aspectRatio The desired aspect ratio of the generated image.
 * @param numberOfImages The number of images to generate.
 * @returns A promise that resolves to an array of data URLs (base64) of the generated images.
 */
export const generateImageFromText = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number = 1): Promise<string[]> => {
  try {
    const enhancedPrompt = `${prompt}, 8k resolution, photorealistic, highly detailed, sharp focus, professional photography quality. Do not include any text, logos, or watermarks.`;
    const modelName = getImageModel();

    if (modelName.includes('imagen')) {
      const response = await getAI().models.generateImages({
        model: modelName,
        prompt: enhancedPrompt,
        config: {
          numberOfImages: numberOfImages,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
          throw new Error('No images were generated by the API.');
      }

      const imageUrls = response.generatedImages.map(img => {
          const base64ImageBytes = img?.image?.imageBytes;
          if (base64ImageBytes) {
              return `data:image/png;base64,${base64ImageBytes}`;
          }
          return null;
      });
      
      const validImageUrls = imageUrls.filter((url): url is string => !!url);
      
      if (validImageUrls.length !== numberOfImages) {
          throw new Error(`Expected ${numberOfImages} images, but only received ${validImageUrls.length}.`);
      }

      return validImageUrls;
    } else {
      // Use generateContent for gemini-*-image models
      const generationPromises = Array.from({ length: numberOfImages }).map(() => 
          getAI().models.generateContent({
              model: modelName,
              contents: enhancedPrompt,
              config: {
                  imageConfig: {
                      aspectRatio: aspectRatio,
                  }
              },
          })
      );

      const responses = await Promise.all(generationPromises);

      const imageUrls = responses.map((response, index) => {
          const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
          if (imagePart?.inlineData?.data) {
              const newBase64ImageBytes: string = imagePart.inlineData.data;
              const newMimeType = imagePart.inlineData.mimeType;
              return `data:${newMimeType};base64,${newBase64ImageBytes}`;
          } else {
              const textPart = response.candidates?.[0]?.content?.parts.find(part => part.text);
              if (textPart?.text) {
                   throw new Error(`Model returned a text response for image ${index + 1}: ${textPart.text}`);
              }
              throw new Error(`No valid image data was returned from the API for image ${index + 1}.`);
          }
      });
      
      const validImageUrls = imageUrls.filter((url): url is string => !!url);

      if (validImageUrls.length !== numberOfImages) {
          throw new Error(`Expected ${numberOfImages} images, but only received ${validImageUrls.length}.`);
      }

      return validImageUrls;
    }

  } catch (error) {
    return handleError(error, 'tạo ảnh từ văn bản');
  }
};

/**
 * Edits an image based on a text prompt using the 'gemini-2.5-flash-image' model.
 * @param base64ImageData The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @param prompt The text description of the desired edit.
 * @returns A promise that resolves to a data URL (base64) of the edited image.
 */
export const editImageWithText = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const enhancedPrompt = `${prompt}. The final image must be of high quality, photorealistic, with sharp details, and look professional. Do not add any text, logos, or watermarks unless explicitly requested in the prompt.`;
        const response = await getAI().models.generateContent({
            model: getImageModel(),
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: enhancedPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

        if (imagePart?.inlineData?.data) { // Check for non-empty data string
            const newBase64ImageBytes: string = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64ImageBytes}`;
        } else {
            // Check for text part for potential error message from model
            const textPart = response.candidates?.[0]?.content?.parts.find(part => part.text);
            if (textPart?.text) {
                 throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid edited image data was returned from the API.');
        }
    } catch (error) {
        return handleError(error, 'chỉnh sửa ảnh');
    }
};

/**
 * Removes the background from an image.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to a data URL (base64) of the image with a transparent background.
 */
export const removeBackground = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Remove the background of this image completely. The final image should have a transparent background. Isolate the main subject perfectly with clean edges.";
    try {
        return await editImageWithText(base64ImageData, mimeType, prompt);
    } catch (error) {
        return handleError(error, 'xóa nền');
    }
};

/**
 * Restores an old, damaged photograph.
 * @param base64ImageData The base64 encoded string of the old photo.
 * @param mimeType The MIME type of the old photo.
 * @returns A promise that resolves to a data URL (base64) of the restored photo.
 */
export const restoreOldPhoto = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = `CRITICAL TASK: Restore and colorize this old photograph.
1.  **Colorization**: This is the most important step. **Colorize the photo with natural, realistic colors.** The final image MUST be in full color, not black and white or sepia.
2.  **Damage Repair**: Fix all visible damage including scratches, tears, creases, stains, and fading.
3.  **Detail Enhancement**: Sharpen the details, improve the focus, and enhance the overall clarity to make it look like a modern, high-quality photograph.
4.  **No Cropping**: Do not crop or change the original composition of the image.`;
    try {
        return await editImageWithText(base64ImageData, mimeType, prompt);
    } catch (error) {
        return handleError(error, 'phục hồi ảnh cũ');
    }
};

/**
 * Upscales an image to a higher resolution.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to a data URL (base64) of the upscaled image.
 */
export const upscaleImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Upscale this image to a higher resolution. Enhance the details, sharpen the focus, and improve the overall quality without adding artifacts. Make it look like a high-resolution photograph.";
    try {
        return await editImageWithText(base64ImageData, mimeType, prompt);
    } catch (error) {
        return handleError(error, 'nâng cấp ảnh');
    }
};

/**
 * Generates multiple edited image variations from a single image and prompt.
 * @param base64ImageData The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @param prompt The text description of the desired edit.
 * @param numberOfImages The number of image variations to generate.
 * @returns A promise that resolves to an array of data URLs (base64) of the edited images.
 */
export const generateMultipleImageEdits = async (
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    numberOfImages: number
): Promise<string[]> => {
    try {
        const enhancedPrompt = `${prompt}. The resulting image must be photorealistic, high-resolution, with professional studio lighting and sharp focus. The quality should be exceptional. Do not include any text, logos, or watermarks.`;
        const generationPromises = Array.from({ length: numberOfImages }).map(() => 
            getAI().models.generateContent({
                model: getImageModel(),
                contents: {
                    parts: [
                        { inlineData: { data: base64ImageData, mimeType: mimeType } },
                        { text: enhancedPrompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            })
        );

        const responses = await Promise.all(generationPromises);

        const imageUrls = responses.map((response, index) => {
            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData?.data) {
                const newBase64ImageBytes: string = imagePart.inlineData.data;
                const newMimeType = imagePart.inlineData.mimeType;
                return `data:${newMimeType};base64,${newBase64ImageBytes}`;
            } else {
                const textPart = response.candidates?.[0]?.content?.parts.find(part => part.text);
                if (textPart?.text) {
                     throw new Error(`Model returned a text response for image ${index + 1}: ${textPart.text}`);
                }
                throw new Error(`No valid edited image data was returned from the API for image ${index + 1}.`);
            }
        });
        
        const validImageUrls = imageUrls.filter((url): url is string => !!url);

        if (validImageUrls.length !== numberOfImages) {
            throw new Error(`Expected ${numberOfImages} images, but only received ${validImageUrls.length}.`);
        }

        return validImageUrls;

    } catch (error) {
        return handleError(error, 'tạo nhiều ảnh profile');
    }
};

/**
 * Generates a descriptive bilingual prompt for creating a video from an image.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @param userWish An optional user-provided description to guide the prompt.
 * @returns A promise that resolves to an object containing Vietnamese and English prompts.
 */
export const generatePromptFromImage = async (
    base64ImageData: string, 
    mimeType: string, 
    userWish?: string
): Promise<BilingualPrompt> => {
    try {
        let textPrompt = `Dựa vào hình ảnh này, hãy tạo một prompt cực kỳ sáng tạo, chi tiết và đầy cảm hứng để tạo một video clip quảng cáo ngắn (khoảng 5-10 giây), hấp dẫn và sống động. Prompt chỉ tập trung mô tả phần hình ảnh (cảnh, hành động, chuyển động camera, không khí) và KHÔNG bao gồm bất kỳ lời thoại/lời bình nào. Prompt không được dài quá 1000 từ. Prompt phải phù hợp cho một AI tạo video cao cấp.`;
        
        if (userWish && userWish.trim()) {
            textPrompt += ` Người dùng có mong muốn sau: "${userWish.trim()}". Hãy kết hợp ý tưởng này vào prompt cuối cùng.`;
        }

        textPrompt += ' Cung cấp prompt bằng cả tiếng Việt và tiếng Anh. Trả về dưới dạng một đối tượng JSON có key "vi" và "en".';
        
        const response = await getAI().models.generateContent({
            model: getTextModel(),
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: textPrompt,
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vi: {
                            type: Type.STRING,
                            description: 'Prompt video bằng tiếng Việt.',
                        },
                        en: {
                            type: Type.STRING,
                            description: 'The video prompt in English.',
                        },
                    },
                    required: ['vi', 'en'],
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        return handleError(error, 'tạo prompt từ ảnh');
    }
};

/**
 * Suggests a suitable background based on model and clothing images.
 * @param model The model's image data.
 * @param clothing The clothing's image data.
 * @returns A promise that resolves to a string describing the suggested background.
 */
export const suggestBackground = async (model: ImageInput | null, clothing: ImageInput | null): Promise<string> => {
    try {
        const parts: any[] = [];
        const promptText = "Phân tích người mẫu và trang phục trong (các) hình ảnh được cung cấp. Đề xuất một bối cảnh chụp ảnh quảng cáo chuyên nghiệp, chân thực và phù hợp. Ví dụ: 'một bãi biển yên tĩnh lúc hoàng hôn', 'nội thất quán cà phê hiện đại và sang trọng', 'một bức tường nghệ thuật đường phố rực rỡ sắc màu'. Chỉ trả về MỘT dòng văn bản thuần túy mô tả bối cảnh đó bằng tiếng Việt.";
        
        if (model) {
             parts.push({ inlineData: { data: model.base64, mimeType: model.mimeType } });
        }
        if (clothing) {
             parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType } });
        }
        
        if(parts.length === 0) {
            return "bối cảnh studio tối giản với ánh sáng chuyên nghiệp";
        }
        
        parts.push({text: promptText});

        const response = await getAI().models.generateContent({
            model: getTextModel(),
            contents: { parts },
        });

        return response.text.trim();

    } catch(error) {
        // Don't use handleError here as this is an internal/optional call.
        // Failing here shouldn't stop the main process.
        console.error("Lỗi khi gợi ý bối cảnh:", error);
        // Fallback
        return "bối cảnh studio tối giản với ánh sáng chuyên nghiệp";
    }
}

/**
 * Generates an ad creative by combining a model, clothing, and accessory image.
 * This version generates two images in parallel for user choice.
 * @param model The model's image data.
 * @param clothing The clothing's image data.
 * @param accessory The accessory's image data.
 * @param userPrompt A user-provided prompt for the background/context.
 * @param aspectRatio The desired aspect ratio.
 * @returns A promise that resolves to an array of two data URLs (base64) of the generated ad images.
 */
export const generateAdCreative = async (
    model: ImageInput | null,
    clothing: ImageInput | null,
    accessory: ImageInput | null,
    userPrompt: string,
    aspectRatio: AspectRatio
): Promise<string[]> => {
    try {
        const parts: any[] = [];
        let promptText = "Create a photorealistic, high-resolution advertising image suitable for a fashion brand. ";

        if (model) {
            parts.push({ inlineData: { data: model.base64, mimeType: model.mimeType } });
            promptText += "Use the provided person as the model. ";
        }
        if (clothing) {
            parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType } });
            promptText += "The model should be wearing the provided clothing. ";
        }
        if (accessory) {
            parts.push({ inlineData: { data: accessory.base64, mimeType: accessory.mimeType } });
            promptText += "The provided accessory/product should be prominently and attractively featured. ";
        }

        let backgroundPrompt = '';
        if (userPrompt.trim()) {
            backgroundPrompt = userPrompt.trim();
        } else {
            // If no user prompt, get a suggestion from AI
            backgroundPrompt = await suggestBackground(model, clothing);
        }

        promptText += `Place them in the following setting: '${backgroundPrompt}'. The final image must have professional studio lighting, sharp focus, and be of exceptional quality. Ensure the model's face is clear and well-lit. Do not include any text, logos, or watermarks. IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio. Do not alter this aspect ratio.`;

        parts.push({ text: promptText });
        
        const generateSingleImage = () => getAI().models.generateContent({
            model: getImageModel(),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Generate two images in parallel
        const responses = await Promise.all([generateSingleImage(), generateSingleImage()]);

        const imageUrls = responses.map((response, index) => {
            const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
                const newBase64 = imagePart.inlineData.data;
                const newMimeType = imagePart.inlineData.mimeType;
                return `data:${newMimeType};base64,${newBase64}`;
            } else {
                const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
                 if (textPart?.text) {
                     throw new Error(`Model returned a text response for image ${index + 1}: ${textPart.text}`);
                }
                throw new Error(`No valid ad creative data was returned for image ${index + 1}.`);
            }
        });

        const validUrls = imageUrls.filter((url): url is string => !!url);
        if (validUrls.length !== 2) {
             throw new Error(`Expected 2 images, but only received ${validUrls.length}.`);
        }
        
        return validUrls;

    } catch (error) {
        return handleError(error, 'tạo ảnh quảng cáo');
    }
};

/**
 * Generates professional product photoshoot images.
 * @param productImage The product's image data.
 * @param scenePrompt A prompt describing the desired background/scene.
 * @param aspectRatio The desired aspect ratio.
 * @param numberOfImages The number of images to generate.
 * @returns A promise that resolves to an array of data URLs for the generated images.
 */
export const generateProductPhotoshoot = async (
    productImage: ImageInput,
    scenePrompt: string,
    aspectRatio: AspectRatio,
    numberOfImages: number
): Promise<string[]> => {
    try {
        const parts: any[] = [
            { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } }
        ];

        const fullPrompt = `
        Task: Create a professional product photoshoot image.
        1.  **Product Isolation**: Take the primary product from the provided image and perfectly remove its original background. Do not alter the product itself.
        2.  **Scene Integration**: Place the isolated product into a new, photorealistic scene described as: "${scenePrompt}".
        3.  **Realism**: The lighting, shadows, and reflections on the product must perfectly match the new scene, making it look completely natural.
        4.  **Quality**: The final image must be high-resolution, sharp, and of professional quality.

        **CRITICAL RULES (MUST BE FOLLOWED):**
        -   **NO TEXT OR LOGOS**: Absolutely no text, letters, numbers, watermarks, or logos are allowed in the final image. The image must be clean.
        -   **ASPECT RATIO**: The final output image's aspect ratio MUST be exactly ${aspectRatio}. This is a strict requirement. For example, if the ratio is 9:16, the image must be tall (vertical), not wide. Adhere strictly to this instruction.
        `;

        parts.push({ text: fullPrompt });

        const generateSingleImage = () => getAI().models.generateContent({
            model: getImageModel(),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const responses = await Promise.all(
            Array.from({ length: numberOfImages }).map(generateSingleImage)
        );

        const imageUrls = responses.map((response, index) => {
            const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
                return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            } else {
                const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
                if (textPart?.text) {
                    throw new Error(`Model returned a text response for image ${index + 1}: ${textPart.text}`);
                }
                throw new Error(`No valid image data was returned for image ${index + 1}.`);
            }
        });

        const validUrls = imageUrls.filter((url): url is string => !!url);
        if (validUrls.length !== numberOfImages) {
            throw new Error(`Expected ${numberOfImages} images, but only received ${validUrls.length}.`);
        }
        
        return validUrls;

    } catch (error) {
        return handleError(error, 'tạo ảnh sản phẩm');
    }
};

export const extractFashionProduct = async (
    modelImage: ImageInput,
    itemsToExtract: string[]
): Promise<string> => {
    try {
        const itemList = itemsToExtract.join(', ');
        const promptText = `
        From the provided image of a person, perform the following tasks:
        1.  Precisely identify and segment the following fashion item(s): ${itemList}.
        2.  Isolate only the clothing item(s), removing the model and any other background elements completely.
        3.  Return a single image containing ONLY the extracted item(s) on a transparent background.
        4.  If multiple items are extracted, place them side-by-side with a small amount of space between them.
        5.  The final output must be clean, high-quality, and ready for commercial use (e.g., for an e-commerce catalog). Do not include any shadows or parts of the model's body.
        `;

        const response = await getAI().models.generateContent({
            model: getImageModel(),
            contents: {
                parts: [
                    { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const newBase64 = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned from the extraction process.');
        }
    } catch (error) {
        return handleError(error, 'tách sản phẩm thời trang');
    }
};

export const dressOnModel = async (
    clothingImage: ImageInput,
    modelImage: ImageInput,
    aspectRatio: AspectRatio,
    userPrompt: string
): Promise<string> => {
    try {
        const promptText = `
        Task: Realistically dress the provided model with the provided clothing item.
        1.  **Clothing Application**: Take the isolated clothing item and fit it perfectly onto the model's body, respecting their pose, shape, and contours.
        2.  **Realism Integration**: Adjust the lighting, shadows, wrinkles, and texture of the clothing to flawlessly match the model's photo environment. The result must look like a real photograph, not an edit.
        3.  **Preserve Identity**: Maintain the model's original facial features, hair, and body. Do not change the model.
        4.  **User Guidance**: Incorporate this specific instruction if provided: "${userPrompt}".
        5.  **Quality**: The final image must be high-resolution, sharp, and professional.
        6.  **Clean Output**: Do not add any text, watermarks, or logos.
        7.  **Aspect Ratio**: The final output image's aspect ratio MUST be exactly ${aspectRatio}. This is a strict requirement.
        `;

        const response = await getAI().models.generateContent({
            model: getImageModel(),
            contents: {
                parts: [
                    { inlineData: { data: clothingImage.base64, mimeType: clothingImage.mimeType } },
                    { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned from the dressing process.');
        }
    } catch (error) {
        return handleError(error, 'mặc đồ lên mẫu');
    }
};

export const displayFashionProduct = async (
    clothingImage: ImageInput,
    scenePrompt: string,
    aspectRatio: AspectRatio
): Promise<string> => {
    try {
        const promptText = `
        Task: Create a professional photoshoot image for a fashion product.
        1.  **Product Placement**: Take the isolated clothing item and place it naturally within the described scene: "${scenePrompt}". The item could be on a hanger, on a mannequin, or neatly folded, as appropriate for the scene.
        2.  **Scene Integration**: The lighting, shadows, and reflections on the product must perfectly match the new scene, making it look completely natural and photorealistic.
        3.  **Quality**: The final image must be high-resolution, sharp, and of professional e-commerce quality.
        4.  **Clean Output**: Do not include any text, watermarks, or logos.
        5.  **Aspect Ratio**: The final output image's aspect ratio MUST be exactly ${aspectRatio}. This is a strict requirement.
        `;
        
        const response = await getAI().models.generateContent({
            model: getImageModel(),
            contents: {
                parts: [
                    { inlineData: { data: clothingImage.base64, mimeType: clothingImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned from the display process.');
        }
    } catch (error) {
        return handleError(error, 'trưng bày sản phẩm');
    }
};


// Fix: Add generateVideoScript function
export const generateVideoScript = async (
    images: (ImageInput | null)[], 
    productName: string, 
    productInfo: string, 
    industry: string, 
    brandTone: string, 
    targetAudience: string, 
    duration: string, 
    cta: string
): Promise<VideoScript> => {
    try {
        const parts: any[] = [];
        images.filter(img => img).forEach(img => {
            parts.push({ inlineData: { data: img!.base64, mimeType: img!.mimeType } });
        });

        const sceneCount = parseInt(duration.split('-')[0], 10) || 3;

        const textPrompt = `
        You are an expert scriptwriter for short video ads. Create a compelling video script based on the following information. The output MUST be a valid JSON object.

        Product Information:
        - Product Name: ${productName}
        - Description: ${productInfo}
        - Industry: ${industry}
        - Target Audience: ${targetAudience}

        Ad requirements:
        - Brand Tone: ${brandTone}
        - Number of scenes: ${sceneCount}
        - Call to Action (CTA): ${cta}

        Instructions:
        1.  Analyze any provided images for context about the product's appearance and use cases.
        2.  Write a script with a clear title and a brief summary.
        3.  The script must contain exactly ${sceneCount} scenes.
        4.  For each scene, provide:
            - "scene_number": An integer starting from 1.
            - "visuals": A detailed, creative description of the visuals for an AI image generator. The description should be in Vietnamese.
            - "voiceover": The voiceover text for the scene, also in Vietnamese.
        5.  The final voiceover should naturally lead into the call to action: "${cta}".
        6.  The tone of the entire script must match "${brandTone}".
        7.  Return ONLY the JSON object, with no surrounding text or markdown.
        `;

        parts.push({ text: textPrompt });
        
        const response = await getAI().models.generateContent({
            model: getTextModel(),
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    scene_number: { type: Type.INTEGER },
                                    visuals: { type: Type.STRING },
                                    voiceover: { type: Type.STRING },
                                },
                                required: ['scene_number', 'visuals', 'voiceover'],
                            },
                        },
                    },
                    required: ['title', 'summary', 'scenes'],
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        return handleError(error, 'tạo kịch bản video');
    }
};

// Fix: Add generateImageForScene function
export const generateImageForScene = async (
    visuals: string,
    brandTone: string,
    productName: string,
    productImage: ImageInput | null,
    aspectRatio: AspectRatio
): Promise<string> => {
    try {
        const parts: any[] = [];
        
        if (productImage) {
            parts.push({ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } });
        }
        
        const promptText = `
        Based on the provided product image (if any) and the following description, create a single, photorealistic, high-resolution advertising image.

        Visual Description: "${visuals}"

        Context:
        - Product Name: ${productName}
        - Desired Tone: ${brandTone}

        Instructions:
        - The image must be of exceptional quality, with professional lighting and sharp focus.
        - If a product image is provided, ensure the product is recognizable in the final image.
        - Do not include any text, logos, or watermarks.
        - IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio.
        `;
        
        parts.push({ text: promptText });
        
        const response = await getAI().models.generateContent({
            model: getImageModel(),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const newBase64 = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                 throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned for the scene.');
        }
    } catch (error) {
        return handleError(error, `tạo ảnh cho cảnh`);
    }
};

// Fix: Add generateAdCopyFromScript function
export const generateAdCopyFromScript = async (script: VideoScript): Promise<string> => {
    try {
        const scriptSummary = script.scenes.map(s => `Cảnh ${s.scene_number}: ${s.voiceover}`).join('\n');
        const prompt = `
        You are an expert copywriter. Based on the following video script, write a short, engaging, and persuasive ad copy for social media (like Facebook or TikTok).

        Video Script Title: ${script.title}
        Video Summary: ${script.summary}
        Voiceovers:
        ${scriptSummary}

        Instructions:
        - The ad copy should be in Vietnamese.
        - Keep it concise and impactful.
        - Include relevant hashtags.
        - End with a strong call to action.
        - Return only the ad copy text, without any introductory phrases.
        `;
        
        const response = await getAI().models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });
        
        return response.text.trim();

    } catch (error) {
        // This is a non-critical function, so return a fallback message instead of throwing an error.
        console.error("Lỗi khi tạo nội dung quảng cáo:", error);
        return "Không thể tạo nội dung quảng cáo. Vui lòng thử lại.";
    }
};

export const startVideoGeneration = async (prompt: string, style: VideoStyle, aspectRatio: AspectRatio, image: ImageInput | null) => {
    try {
        const enhancedPrompt = `${prompt}. Create the video in a ${aspectRatio} aspect ratio. Style: ${style}.`;
        const requestPayload: any = {
            model: 'veo-2.0-generate-001',
            prompt: enhancedPrompt,
            config: { 
                numberOfVideos: 1,
            }
        };

        if (image) {
            requestPayload.image = {
                imageBytes: image.base64,
                mimeType: image.mimeType,
            };
        }

        return await getAI().models.generateVideos(requestPayload);
    } catch (error) {
        return handleError(error, 'bắt đầu tạo video');
    }
};

export const pollVideoGeneration = async (operation: any) => {
    try {
        return await getAI().operations.getVideosOperation({ operation });
    } catch (error) {
        return handleError(error, 'kiểm tra tiến trình tạo video');
    }
};

export const translateTextToEnglish = async (text: string): Promise<string> => {
    try {
        const prompt = `Translate the following Vietnamese text to English. Return only the translated text, without any introductory phrases.\n\nVietnamese text: "${text}"`;
        const response = await getAI().models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        return handleError(error, 'dịch văn bản');
    }
};

export const generateSpeechFromText = async (text: string, voiceName: string): Promise<string> => {
    try {
        const response = await getAI().models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            return audioData;
        } else {
            throw new Error("Không nhận được dữ liệu âm thanh từ API.");
        }
    } catch (error) {
        return handleError(error, 'tạo giọng nói');
    }
};
