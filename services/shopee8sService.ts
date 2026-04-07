import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ScriptParts } from "../types";
import { getAiClient, callWithRetry } from "./keyService";
import { getScriptLengthInstruction, getPersonaContext, getLanguageLabel } from "../utils/languageUtils";

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json|```/g, "").trim();
};

const SHOPEE_8S_HOOKS = [
  "Phải công nhận thật 1 điều là cái [sản phẩm] nó quá là [đặc điểm] luôn.",
  "Không cần tốn quá nhiều chi phí cho [vấn đề] nữa bởi vì chỉ cần 1 [sản phẩm] này thôi.",
  "Khi dùng món đồ này thì [lợi ích] ở khắp mọi nơi luôn anh em ạ.",
  "Nếu anh em là tín đồ [sở thích] thì cái [sản phẩm] này đúng là không thể thiếu.",
  "Mình vẫn đang thắc mắc là vẫn có những anh em đang sử dụng [cách cũ] để [mục tiêu].",
  "Mình dám cá là anh em sẽ bất ngờ với con [sản phẩm], bởi vì nhìn nó [vẻ ngoài] mà [tính năng].",
  "Khi dùng cái [sản phẩm] này thì mấy cái [đồ cũ] anh em cũng vứt hết đi cho mà xem.",
  "Đây là lý do mà anh em chắc chắn không nên bỏ qua chiếc [sản phẩm] này.",
  "Một chiếc [sản phẩm] mà mình rất thích bởi vì đơn giản là khi dùng nó mình không thấy [cảm giác khó chịu].",
  "Anh em đã sai lầm khi nghĩ rằng [quan điểm sai] và đây là [sự thật/sản phẩm].",
  "Cái [sản phẩm] nó quá là tiện anh em ạ, anh em có thể [công dụng 1] hay [công dụng 2].",
  "Việc [nhiệm vụ] bây giờ trở nên quá là đơn giản và đây là [sản phẩm].",
  "Đau đầu vì [vấn đề] quá là [mệt mỏi] trong khi dùng [sản phẩm] thì [kết quả].",
  "Một con [sản phẩm] không bao giờ hết hot, và đây là lý do.",
  "Sau khi đã dùng qua rất nhiều loại thì cuối cùng mình vẫn quyết định quay lại với em [sản phẩm] này.",
  "Top những mẫu [dòng sản phẩm] không thể thiếu ở trong nhà các anh em ngay lúc này.",
  "Mình vẫn chưa bao giờ đánh giá một con [sản phẩm] nào mà cao như con này trong tầm giá.",
  "Anh em có công nhận với mình là cái [sản phẩm] nó quá là [đặc điểm] đúng không?",
  "Hay phải [hành động] thì chắc chắn anh em không nên bỏ qua món đồ này.",
  "Mình đã thực sự hối hận khi không biết đến cái [sản phẩm] này sớm anh em ạ.",
  "Mình đã tìm ra món đồ sẽ giúp anh em cực kỳ [lợi ích] với cái [vấn đề] này.",
  "Gia đình bác nào mà [tình trạng] thì nên sử dụng cái [sản phẩm] để [mục tiêu].",
  "Thay vì sử dụng [cách cũ] thì chúng ta sử dụng [sản phẩm] đây các bạn, cực kỳ là [đặc điểm].",
  "Nếu bạn đang chán với cái [sản phẩm] thông thường thì nhớ tìm mua cái này nha.",
  "Bạn đang cần [nhu cầu] thì làm thế nào? Giới thiệu với các bạn đây là [sản phẩm] chuyên dụng.",
  "Một cái [sản phẩm] mà mình cảm thấy ưng ý nhất, ổn áp trong tầm giá.",
  "Lý do các [đối tượng] không thể [thành công] là do cái này, đây là [sản phẩm].",
  "Mua 1 cái [sản phẩm] mà có n tác dụng, quá tiện lợi rồi còn gì nữa.",
  "Một chiếc [sản phẩm] đa năng mình chắc chắn anh em nào cũng nên có.",
  "Chào mọi người, mình đã quay lại review cho mọi người đây, không thể bỏ qua món này.",
  "Cuối cùng cũng săn được [sản phẩm] với giá hời rồi.",
  "Sau khi dùng hết [số lượng] [đơn vị], mình đã quay lại review cho mọi người đây.",
  "Gần đây mọi người săn lùng [sản phẩm] này dữ quá, có đáng để chị em liên tục tag bạn bè vào không?",
  "Mình đã đợi rất lâu và cuối cùng [sản phẩm] đã giảm giá rồi mọi người ơi.",
  "Nhà anh chị có ai bị [vấn đề] thì gửi ngay clip này cho họ nhé.",
  "Mọi người có biết [vấn đề] là nguyên nhân chính gây ra [hậu quả nghiêm trọng] không?",
  "3 mẹo sau đây giúp [kết quả] ngay khi xem hết video này.",
  "Sau một thời gian, mấy đứa bạn bảo mình [vấn đề] đã phải xin lỗi mình vì [kết quả].",
  "Cái gì làm cho [đối tượng] từ thế này thành thế này? (Show hình ảnh so sánh)",
  "Đừng để [vấn đề] quanh năm nữa, đừng để [hậu quả] rồi mới tìm cách chữa.",
  "3 cách để [mục tiêu] dành cho [đối tượng cụ thể].",
  "Ai hay [vấn đề] bị [phiền toái] thì nên có [sản phẩm] này.",
  "Có bạn nào đang khổ sở vì [vấn đề] không? Thử ngay [giải pháp] này đi!",
  "Ai hay bị [vấn đề] thì coi gấp video này nhé!",
  "Món đồ này đã giúp mình tiết kiệm được [thời gian/công sức] mỗi ngày.",
  "Làm thế nào để [đạt mục tiêu] mà không cần đến [cách làm cũ]?",
  "Cách nhanh nhất để [xử lý vấn đề] bằng [sản phẩm] chuyên dụng.",
  "Cuối cùng thì mình cũng tìm được cách để xử lý [nỗi lo lâu nay].",
  "Ai nghĩ [quan điểm cũ] thì có lẽ là chưa biết tới [giải pháp mới] rồi.",
  "Ước gì mình biết [điều này/món này] sớm hơn thì đã không phải [hậu quả].",
  "Đáng lý [sản phẩm] này phải được chú ý từ lâu vì độ tiện dụng của nó.",
  "Sự thật thú vị có thể bạn chưa biết về việc [chủ đề].",
  "Điều mà [đối tượng chuyên gia] không muốn bạn biết.",
  "Thay vì mua [nhiều thứ rẻ], mình chọn [một thứ đa năng] này.",
  "Món đồ này đã hỗ trợ mình rất nhiều lần khi gặp tình huống [khó khăn].",
  "Mình từng không tin vào quảng cáo cho tới khi tự trải nghiệm [sản phẩm] này.",
  "Một trong những món đồ đáng giá mình từng mua vì [lợi ích cụ thể].",
  "Hiếm khi mình đánh giá thứ gì tới lần thứ hai, trừ [tên sản phẩm] này.",
  "Mình đã thử qua nhiều dòng [sản phẩm], nhưng đây là món mình giữ lại.",
  "Mình đã cải thiện [vấn đề] chỉ nhờ [giải pháp đơn giản].",
  "Cách để đạt được [phong cách/kết quả] như [người nổi tiếng].",
  "Bí mật để [đạt kết quả tốt] mà không cần tốn quá nhiều công sức.",
  "Cẩn thận mất tiền oan khi mua [sản phẩm], dễ gặp tình trạng [vấn đề].",
  "Dừng ngay việc [hành động sai] nếu không muốn [hậu quả xấu].",
  "Trước khi đầu tư vào [sản phẩm], bạn cần lưu ý điều này.",
  "Bạn vẫn chưa biết đến [giải pháp/xu hướng] này sao?",
  "Có ai gặp tình trạng [vấn đề khó chịu] giống như mình không?",
  "Sẽ thế nào nếu bạn áp dụng [giải pháp] này vào [tình huống]?",
  "Tại sao bạn càng [cố gắng làm X] thì kết quả lại càng [tệ]?",
  "Đố bạn biết đâu là nguyên nhân khiến [vấn đề] trở nên nghiêm trọng?",
  "Kiểm chứng lời đồn về loại [sản phẩm] đang quảng cáo là [công dụng].",
  "Những lưu ý không thể bỏ qua khi bạn chọn mua [dòng sản phẩm].",
];

export const fileToGenerativePart = async (file: File) => {
  return new Promise<{ mimeType: string, data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({ mimeType: file.type, data: (reader.result as string).split(',')[1] });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getVoiceDetailedInstruction = (voiceLabel: string) => {
  const isNorth = voiceLabel.includes("Bắc");
  
  const dialectInstruction = isNorth ? `
    VĂN PHONG MIỀN BẮC (HÀ NỘI):
    - Sử dụng từ đệm: "nhé", "ạ", "thế", "đấy", "vậy", "vâng", "chứ".
    - Cách dùng từ: "không", "vẫn", "thế này".
    - TUYỆT ĐỐI KHÔNG dùng các từ miền Nam như: nha, nè, nghen, thiệt, hông, vầy, bển, trển.
  ` : `
    VĂN PHONG MIỀN NAM (SÀI GÒN):
    - Sử dụng từ đệm: "nha", "nè", "nghen", "hen", "đó", "vầy", "nghen", "ha".
    - Cách dùng từ: "hông" (thay cho không), "thiệt" (thay cho thật), "dễ thương dữ thần", "hết sảy".
    - TUYỆT ĐỐI KHÔNG dùng các từ miền Bắc như: nhé, ạ, thế, đấy, chả, vâng.
  `;

  const mapping: Record<string, string> = {
    "Giọng Bắc 20-40 tuổi": "20-40 tuổi, giọng miền Bắc, năng động, nhịp độ nhanh, vui vẻ, tông cao, hào hứng.",
    "Giọng Nam 20-40 tuổi": "20-40 tuổi, giọng miền Nam, năng động, nhịp độ nhanh, vui vẻ, tông cao, hào hứng.",
    "Giọng Bắc 50-60 tuổi": "50-60 tuổi, giọng miền Bắc, giọng trầm, vang, ổn định, uy quyền, đáng tin cậy.",
    "Giọng Nam 50-60 tuổi": "50-60 tuổi, giọng miền Nam, giọng trầm, vang, ổn định, uy quyền, đáng tin cậy.",
    "Giọng Bắc 60-80 tuổi": "60-80 tuổi, giọng miền Bắc, khàn, hào sảng, chân chất, thực tế.",
    "Giọng Nam 60-80 tuổi": "60-80 tuổi, giọng miền Nam, khàn, hào sảng, chân chất, thực tế."
  };
  
  return (mapping[voiceLabel] || voiceLabel) + "\n" + dialectInstruction;
};

export const extractOutfitImage = async (outfitPart: any): Promise<string> => {
  const ai = getAiClient('image');
  const prompt = `
    Tạo một hình ảnh chụp ảnh sản phẩm chuyên nghiệp CHỈ bao gồm trang phục được hiển thị trong ảnh tham chiếu.
    1. XÓA hoàn toàn người/nhân vật.
    2. XÓA hoàn toàn bối cảnh.
    3. Trang phục phải được hiển thị một mình trên nền trắng tinh khiết (#FFFFFF).
    4. Giữ nguyên chính xác hoa văn, màu sắc và kết cấu của quần áo 100%.
    5. Sắp xếp quần áo tự nhiên như thể trên một ma-nơ-canh tàng hình hoặc đặt trên mặt phẳng sạch sẽ.
    6. Đảm bảo kết quả là một hình ảnh sắc nét, chất lượng cao chỉ chứa quần áo.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts: [{ text: prompt }, { inlineData: outfitPart }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Thất bại");
  } catch (error) { 
    console.error("Lỗi trích xuất ảnh trang phục:", error);
    throw error; 
  }
};

export const generateShopee8sScript = async (productName: string, usp: string, voice: string, addressing: string, gender: string, language: string = 'vi'): Promise<ScriptParts> => {
  const ai = getAiClient('text');
  const voiceDetail = getVoiceDetailedInstruction(voice);
  const targetLang = getLanguageLabel(language);
  const { persona, context } = getPersonaContext(language);
  const lengthInstruction = getScriptLengthInstruction(language);

  const hooksInstruction = `
  QUY TẮC MỞ ĐẦU (HOOK):
  Mỗi video (v1 và v3) PHẢI bắt đầu bằng một câu Hook ấn tượng. 
  Hãy chọn NGẪU NHIÊN một trong các mẫu Hook dưới đây và biến đổi linh hoạt cho phù hợp với sản phẩm "${productName}":
  ${SHOPEE_8S_HOOKS.map(h => `- ${h}`).join('\n')}
  `;

  const ctaInstruction = `
  QUY TẮC KẾT THÚC (CTA):
  Mỗi video (v2 và v4) PHẢI kết thúc bằng một câu kêu gọi hành động (CTA) hướng dẫn người xem nhấn vào giỏ hàng ở góc trái màn hình để mua hàng. 
  Ví dụ: "Giỏ hàng em để góc trái!", "Click vào giỏ hàng góc trái".
  `;

  const prompt = `Bạn là chuyên gia content Shopee chuyên nghiệp chuyên tạo video viral. 
  Nhiệm vụ: Tạo kịch bản cho 2 video quảng cáo Shopee (mỗi video dài 16 giây).
  
  CẤU TRÚC:
  - VIDEO 1: Chia thành v1 (8s đầu) và v2 (8s sau). v1 và v2 phải kết nối thành 1 câu chuyện liền mạch.
  - VIDEO 2: Chia thành v3 (8s đầu) và v4 (8s sau). v3 và v4 phải kết nối thành 1 câu chuyện liền mạch.
  
  ${hooksInstruction}
  ${ctaInstruction}

  YÊU CẦU ĐỘ DÀI (QUAN TRỌNG):
  - ${lengthInstruction}
  
  NỘI DUNG:
  - Sản phẩm: "${productName}".
  - USP (Keyword quan trọng): "${usp}".
  - Nhân vật: ${persona}, Giới tính ${gender}, Đặc điểm giọng nói & Văn phong: ${voiceDetail}.
  - Bối cảnh: ${context}.
  - XƯNG HÔ (BẮT BUỘC): Sử dụng cặp xưng hô "${addressing}" (Người nói - Người nghe) xuyên suốt 100%.
  - Ngôn ngữ trẻ trung, thu hút, đánh thẳng vào USP.
  - Ngôn ngữ đầu ra: ${targetLang} (100% chính xác ngữ pháp và chính tả).
  - Không dùng từ cấm: Shopee, Lazada, Tiki, TikTok Shop.
  
  Trả về duy nhất JSON: { "v1": "...", "v2": "...", "v3": "...", "v4": "..." }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { 
            v1: { type: Type.STRING }, 
            v2: { type: Type.STRING }, 
            v3: { type: Type.STRING }, 
            v4: { type: Type.STRING } 
          },
          required: ["v1", "v2", "v3", "v4"]
        }
      }
    });
    return JSON.parse(cleanJsonResponse(response.text || '{}'));
  } catch (error) {
    return { v1: '', v2: '', v3: '', v4: '' };
  }
};

export const generateShopee8sScriptsBulk = async (
  products: { id: number, name: string, usp: string }[],
  voice: string,
  addressing: string,
  gender: string,
  language: string = 'vi'
): Promise<{ id: number, script: ScriptParts }[]> => {
  const ai = getAiClient('text');
  const voiceDetail = getVoiceDetailedInstruction(voice);
  const targetLang = getLanguageLabel(language);
  const { persona, context } = getPersonaContext(language);
  const lengthInstruction = getScriptLengthInstruction(language);

  const hooksInstruction = `
  QUY TẮC MỞ ĐẦU (HOOK):
  Mỗi video của mỗi sản phẩm (v1 và v3) PHẢI bắt đầu bằng một câu Hook ấn tượng. 
  Hãy chọn NGẪU NHIÊN một trong các mẫu Hook dưới đây và biến đổi linh hoạt cho phù hợp với từng sản phẩm cụ thể:
  ${SHOPEE_8S_HOOKS.map(h => `- ${h}`).join('\n')}
  `;

  const ctaInstruction = `
  QUY TẮC KẾT THÚC (CTA):
  Mỗi video (v2 và v4) của mỗi sản phẩm PHẢI kết thúc bằng một câu kêu gọi hành động (CTA) hướng dẫn người xem nhấn vào giỏ hàng ở góc trái màn hình để mua hàng.
  `;

  const productList = products.map(p => `- ID ${p.id}: Sản phẩm "${p.name}", USP: "${p.usp}"`).join('\n');

  const prompt = `Bạn là chuyên gia content Shopee chuyên nghiệp chuyên tạo video viral. 
  Nhiệm vụ: Tạo kịch bản cho các sản phẩm sau đây. Mỗi sản phẩm cần 2 video (mỗi video 16s, chia làm 2 phần 8s).
  
  DANH SÁCH SẢN PHẨM:
  ${productList}
  
  CẤU TRÚC MỖI SẢN PHẨM:
  - v1 (8s đầu video 1), v2 (8s sau video 1)
  - v3 (8s đầu video 2), v4 (8s sau video 2)
  
  ${hooksInstruction}
  ${ctaInstruction}

  YÊU CẦU ĐỘ DÀI (QUAN TRỌNG):
  - ${lengthInstruction}
  
  NỘI DUNG CHUNG:
  - Nhân vật: ${persona}, Giới tính ${gender}, Đặc điểm giọng nói & Văn phong: ${voiceDetail}.
  - Bối cảnh: ${context}.
  - XƯNG HÔ (BẮT BUỘC): Sử dụng cặp xưng hô "${addressing}" xuyên suốt.
  - Ngôn ngữ trẻ trung, thu hút, đánh thẳng vào USP.
  - Ngôn ngữ đầu ra: ${targetLang} (100% chính xác ngữ pháp và chính tả).
  
  Trả về JSON là một mảng các đối tượng:
  [
    { "id": 1, "v1": "...", "v2": "...", "v3": "...", "v4": "..." },
    ...
  ]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              v1: { type: Type.STRING },
              v2: { type: Type.STRING },
              v3: { type: Type.STRING },
              v4: { type: Type.STRING }
            },
            required: ["id", "v1", "v2", "v3", "v4"]
          }
        }
      }
    });
    
    const results = JSON.parse(cleanJsonResponse(response.text || '[]'));
    return results.map((r: any) => ({
      id: r.id,
      script: { v1: r.v1, v2: r.v2, v3: r.v3, v4: r.v4 }
    }));
  } catch (error) {
    console.error("Bulk script error:", error);
    return [];
  }
};

export const generateShopee8sImage = async (
  imageParts: any[], 
  productName: string, 
  scriptPart: string, 
  charDesc: string,
  facePart: any | null,
  outfitPart: any | null = null,
  isFollowUp: boolean = false,
  imageStyle: 'Realistic' | '3D' = 'Realistic',
  gender: string = 'Nữ',
  language: string = 'vi'
): Promise<string> => {
  const ai = getAiClient('image');
  const is3D = imageStyle === '3D';
  const { persona, context } = getPersonaContext(language);
  
  const faceFidelityRule = facePart 
    ? `IDENTITY MANDATE: You MUST use the EXACT facial features, hair, and look from the provided FACE_REFERENCE image. 1:1 match.
       CRITICAL: DO NOT use the face of any person found in the product images. ONLY use the FACE_REFERENCE for the character's head.`
    : `SUBJECT: Adult ${persona}. Gender: ${gender}. ${charDesc}`;

  const outfitRule = outfitPart
    ? `OUTFIT MANDATE: The character MUST wear the EXACT outfit shown in the OUTFIT_REFERENCE image. 
       Maintain 100% consistency in colors, patterns, and style of the clothing.`
    : "";

  const baseStyle = is3D 
    ? "High-quality 3D Animation Pixar/Disney style, vibrant colors, expressive 3D character design, polished CGI, masterpiece."
    : "Photorealistic high-end commercial RAW PHOTO, 8k resolution, cinematic lighting, authentic skin textures.";

  const visualRules = `
    CRITICAL VISUAL RULES (STRICT NO-TEXT POLICY):
    1. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO CHARACTERS.
    2. The background must be CLEAN and FREE of signage, posters, labels, or written words.
    3. If the context implies a screen or sign, leave it BLANK or Abstract.
    4. NO UI elements, NO speech bubbles, NO watermarks, NO subtitles.
    5. The image must be purely visual storytelling.
    6. ABSOLUTELY NO ICONS, NO GRAPHICS, NO EMOJIS, NO VISUAL EFFECTS, NO OVERLAYS.
    7. Do NOT simulate TikTok UI or video editing effects. It must look like a RAW PHOTO.
    
    CRITICAL RESTRICTIONS & RULES: 
    1. NO CHILDREN, NO KIDS, NO BABIES. The subject must be an adult.
    2. ${is3D ? "Must look like high-quality 3D CGI." : "Must look like a real photo."}
    
    STRICT PRODUCT FIDELITY (MANDATORY - TUYỆT ĐỐI):
       - The product "${productName}" MUST MATCH the input reference image 1:1.
       - PRESERVE PATTERNS & TEXTURES: Any pattern (họa tiết), logo, or design on the product surface must be preserved.
       - PRESERVE DIMENSIONS: Do not resize or distort the product logic.
       - DO NOT change shape, proportions, or physical parts.
       - LOCK the product appearance exactly to the original photo provided.
       - If it's adult fashion, it must be worn, and the reference image must be 100% identical to the sample product.
       - If it's children's fashion, it must still be held in the hand.
  `;

  const consistencyRule = isFollowUp 
    ? "CRITICAL: Maintain ABSOLUTE consistency in character appearance, outfit, and background environment as the previous scene."
    : "Establish a clear character appearance and background setting.";

  const prompt = `
    STYLE: ${baseStyle} 
    RATIO: 9:16 aspect ratio.
    ${faceFidelityRule}
    ${outfitRule}
    ${visualRules}
    ${consistencyRule}
    SCENE: Action/Scenario: ${scriptPart}. Additional Character Note: ${charDesc}.
  `;
  
  const contents: any[] = [{ text: prompt }];
  if (facePart) {
    contents.push({ text: "FACE_REFERENCE:" });
    contents.push({ inlineData: facePart });
  }
  if (outfitPart) {
    contents.push({ text: "OUTFIT_REFERENCE:" });
    contents.push({ inlineData: outfitPart });
  }
  if (imageParts.length > 0) {
    contents.push({ text: "PRODUCT_REFERENCE:" });
    contents.push({ inlineData: imageParts[0] });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts: contents },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });
    
    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : "";
  } catch (error) { throw error; }
};

export const generateShopee8sImagePrompt = async (
  productName: string,
  scriptPart: string,
  imageStyle: 'Realistic' | '3D' = 'Realistic',
  gender: string,
  voice: string,
  backgroundNote: string = "",
  visualNote: string = "",
  userCustomPrompt: string | undefined = "",
  poseLabel: string = "",
  isNoProductRequested: boolean = false,
  language: string = 'vi'
): Promise<string> => {
  const ai = getAiClient('text');
  const is3D = imageStyle === '3D';
  const targetLang = getLanguageLabel(language);
  const { persona, context } = getPersonaContext(language);
  const baseStyle = is3D ? "Phong cách Hoạt hình 3D Pixar/Disney chất lượng cao, CGI tinh xảo, màu sắc rực rỡ" : "Ảnh chụp RAW PHOTO chân thực, 8k, ánh sáng tự nhiên mang tính điện ảnh";

  const productInteractionRule = isNoProductRequested
    ? `ABSOLUTELY NO appearance of the product "${productName}". Character performs actions according to the script "${scriptPart}".`
    : `Extremely detailed description of how the character holds/uses "${productName}", matching the script "${scriptPart}". The product must maintain realistic size and be fixed relative to the character.`;

  const instructionText = `
    Mission: Write an extremely detailed Prompt in English to create high-quality (8k) AI images for SHOPEE 8S videos.
    
    CRITICAL VISUAL RULES:
    1. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO CHARACTERS.
    2. NO UI elements, NO speech bubbles, NO watermarks, NO subtitles, NO EMOJI.
    3. FRAMING: Character occupies 3/4 of the vertical frame.
    
    PROMPT STRUCTURE:
    - [Style & Lighting]: ${baseStyle}.
    - [Subject Description]: ${persona} adult ${gender}. Detailed description of appearance and outfit suitable for short review videos.
    - [Subject Interaction/Action]: ${poseLabel ? `Pose: "${poseLabel}". ` : ""}${productInteractionRule}
    - [Environment]: Background closely follows "${backgroundNote || context || 'studio or natural setting'}".
    - [Visual Rules]: ${visualNote ? `VISUAL COMPOSITION: ${visualNote}.` : ""}
    
    OUTPUT REQUIREMENT:
    - Return ONLY a single English paragraph describing the entire scene, character, outfit, action, and background in extreme detail.
    - NO titles, NO explanations, NO line breaks.
    - Smoothly combine the above requirements into a complete, detailed, and vivid prompt.
    ${userCustomPrompt ? `- MAXIMUM PRIORITY FOR ACTION/LAYOUT DESCRIPTION ACCORDING TO THIS NOTE: "${userCustomPrompt}"` : ""}
  `;

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: instructionText }] }
    }));
    return response.text?.trim().replace(/\n/g, ' ') || "";
  } catch (error: any) {
    if (error.message?.includes("429")) {
      throw new Error("Lỗi tạo prompt ảnh AI:\n{\"error\":{\"code\":429,\"message\":\"Resource has been exhausted (e.g. check quota).\",\"status\":\"RESOURCE_EXHAUSTED\"}}");
    }
    return "Lỗi tạo prompt ảnh.";
  }
};

export const generateShopee8sVeoPrompt = async (
  productName: string, 
  scriptText: string, 
  gender: string, 
  voice: string,
  productImageBase64?: string,
  generatedImageBase64?: string,
  isNoProductRequested: boolean = false,
  imageStyle: 'Realistic' | '3D' = 'Realistic',
  language: string = 'vi'
): Promise<string> => {
  const ai = getAiClient('text');
  const is3D = imageStyle === '3D';
  const targetLang = getLanguageLabel(language);
  const { persona, context } = getPersonaContext(language);
  const voiceDetail = getVoiceDetailedInstruction(voice);
  const voiceGender = gender === 'Nữ' ? 'Nữ' : 'Nam';
  
  const productInteractionRule = isNoProductRequested
    ? `PHẦN 2: HÀNH ĐỘNG & TƯƠNG TÁC (QUAN TRỌNG):
      - TUYỆT ĐỐI KHÔNG xuất hiện sản phẩm "${productName}".
      - Cách nhân vật di chuyển, nói chuyện và tương tác phù hợp với kịch bản: "${scriptText}".`
    : `PHẦN 2: HÀNH ĐỘNG & TƯƠNG TÁC (QUAN TRỌNG):
      - Nhân vật đang cầm trên tay sản phẩm "${productName}".
      - Cách nhân vật di chuyển, nói chuyện và tương tác phù hợp với kịch bản: "${scriptText}".
      - [SẢN PHẨM PHẢI GIỐNG ẢNH THAM CHIẾU 100%, KHÔNG BIẾN DẠNG]`

  const instructionPrompt = `
  Nhiệm vụ: Viết một lời nhắc (Prompt) chi tiết bằng ${targetLang} để tạo video AI (VEO-3) dài 8 giây cho video Shopee Affiliate.
  PHONG CÁCH VIDEO: ${is3D ? "Hoạt hình 3D / Phong cách CGI" : "Ảnh chụp thực tế / Phong cách đời thực"}.
  !!! QUY TẮC TRUNG THỰC QUAN TRỌNG !!!: Duy trì sự nhất quán 100% về khuôn mặt, tóc và TRANG PHỤC với các hình ảnh tham chiếu được cung cấp. Nhân vật phải mặc CHÍNH XÁC cùng một bộ quần áo như được hiển thị trong khung hình bắt đầu.

!!! CRITICAL RULE: ONE CONTINUOUS SHOT (QUAN TRỌNG: MỘT CÚ MÁY LIỀN MẠCH) !!!
  - Video phải là một cảnh quay liên tục (Single Take).
  - TUYỆT ĐỐI KHÔNG CẮT CẢNH (NO CUTS).
  - TUYỆT ĐỐI KHÔNG CHUYỂN CẢNH (NO SCENE TRANSITIONS).
  - Duy trì 100% sự nhất quán về khuôn mặt, tóc và trang phục với hình ảnh tham chiếu.

  CẤU TRÚC LỜI NHẮC:
  PHẦN 1: NHÂN VẬT & DIỆN MẠO (BẮT BUỘC NHẤT QUÁN). Mô tả nhân vật (${persona}), trang phục và khuôn mặt y hệt ảnh tham chiếu.
  ${productInteractionRule}
  PHẦN 3: BỐI CẢNH & ÁNH SÁNG. Không gian đồng nhất với bối cảnh ảnh tham chiếu (${context}).
  PHẦN 4: CHUYỂN ĐỘNG MÁY ẢNH (9:16). Chuyển động chậm (slow motion) vào nhân vật hoặc sản phẩm. Tuyệt đối không thay đổi bối cảnh, nhân vật và trang phục trong suốt 8 giây.
  PHẦN 5: LỜI THOẠI (DÙNG CHO ĐỒNG BỘ GIỌNG NÓI CHI TIẾT): 
  - GIỚI TÍNH: ${voiceGender}.
  - NHÃN GIỌNG NÓI: "${voice}".
  - ĐẶC ĐIỂM CHI TIẾT (VÙNG MIỀN & ĐỘ TUỔI): "${voiceDetail}".
  - NỘI DUNG LỜI THOẠI: "${scriptText}"
  => Yêu cầu: Khớp môi (Lip-sync) hoàn hảo và biểu cảm khuôn mặt cực kỳ tự nhiên theo ngữ điệu vùng miền được chỉ định.
  PHẦN 6: CHẤT LƯỢNG KỸ THUẬT: 4K, 60fps, Không có nhạc nền, Không hiệu ứng chuyển cảnh, không chèn chữ hay icon trong suốt 8s.

  YÊU CẦU: Trả về 1 đoạn văn bản Tiếng Anh duy nhất mô tả chi tiết toàn bộ video. Không xuống dòng.`;

  const contents: any[] = [{ text: instructionPrompt }];
  if (productImageBase64) {
    contents.push({ inlineData: { mimeType: 'image/png', data: productImageBase64.split(',')[1] || productImageBase64 } });
  }
  if (generatedImageBase64) {
    contents.push({ inlineData: { mimeType: 'image/png', data: generatedImageBase64.split(',')[1] || generatedImageBase64 } });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Lỗi tạo lời nhắc video:", error);
    return "Lỗi khi tạo lời nhắc video.";
  }
};