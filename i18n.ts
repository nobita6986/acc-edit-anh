



import React, { createContext, useContext, ReactNode, PropsWithChildren } from 'react';

// Define translations
const translations = {
  vi: {
    common: {
      square: 'Vuông',
      wide: 'Ngang',
      tall: 'Dọc',
      ratio: 'Tỉ lệ',
      generating: 'Đang tạo',
      results: 'Kết quả',
      edit: 'Sửa',
      previewAndDownload: 'Xem & Tải',
      copiedPromptEn: 'Đã sao chép (English)!',
      copyPromptEn: 'Sao chép (English)',
      processing: 'Đang xử lý',
      close: 'Đóng',
      retry: 'Thử lại',
      save: 'Lưu',
    },
    header: {
      tagline: 'Sáng tạo không giới hạn',
      greeting: 'Xin chào',
      logout: 'Đăng xuất',
      trialCreations: 'Lượt tạo thử',
      pricing: 'Bảng giá',
      affiliate: 'Tiếp thị',
      buyAccount: 'Mua tài khoản',
      login: 'Đăng nhập',
    },
    nav: {
        fashionStudio: 'Tách ảnh',
        adCreative: 'Ghép ảnh quảng cáo',
        productPhotoshoot: 'Chụp ảnh sản phẩm',
        onlineTravel: 'Du lịch online',
        profileImage: 'Ảnh đại diện',
        textToImage: 'Tạo ảnh từ chữ',
        imageEditor: 'Sửa ảnh',
        promptFromImage: 'Prompt từ ảnh',
        textToSpeech: 'Văn bản thành Giọng nói',
        adminPanel: 'Quản trị'
    },
    modals: {
        buyAccountTitle: 'Mua tài khoản',
        buyAccountDescription: 'Để sử dụng không giới hạn và truy cập tất cả các tính năng, vui lòng liên hệ Zalo để mua tài khoản.',
        buyAccountZaloButton: 'Chat qua Zalo',
        affiliateTitle: 'Chương trình Tiếp thị Liên kết',
        affiliateDescription: 'Kiếm hoa hồng hấp dẫn bằng cách giới thiệu khách hàng. Liên hệ Zalo để biết thêm chi tiết.',
        affiliateZaloButton: 'Tham gia qua Zalo',
        tier1Name: 'Gói 1 Tháng',
        tier1Price: '200,000',
        tier1Desc: 'Sử dụng không giới hạn trong 1 tháng.',
        tier2Name: 'Gói 3 Tháng',
        tier2Price: '350,000',
        tier2Desc: 'Tiết kiệm hơn cho nhu cầu sử dụng dài hạn.',
        tier2Bonus: 'Tặng 1 tháng',
        tier3Name: 'Gói 1 Năm',
        tier3Price: '990,000',
        tier3Desc: 'Giải pháp tối ưu cho người dùng thường xuyên.',
        tier3Bonus: 'Tặng 3 tháng',
        pricingTitle: 'Bảng giá Dịch vụ',
        pricingDescription: 'Chọn gói phù hợp với nhu cầu sáng tạo của bạn.',
        contactPrompt: 'Để đăng ký, vui lòng liên hệ qua Zalo:',
        zaloContactNumber: '0913 275 768',
        zaloChatButton: 'Chat ngay',
    },
    placeholder: {
        adminLoginTitle: 'Yêu cầu đăng nhập Admin',
        upgradeDescription: 'Tính năng này đang được phát triển và sẽ sớm ra mắt. Vui lòng nâng cấp tài khoản để trải nghiệm khi có sẵn.',
        contactSupport: 'Mọi thắc mắc vui lòng liên hệ bộ phận hỗ trợ.',
        contactButton: 'Liên hệ qua Zalo',
    },
    textToImage: {
        title: 'Tạo ảnh từ văn bản',
        description: 'Biến ý tưởng của bạn thành hình ảnh độc đáo chỉ trong vài giây.',
        placeholder: 'Mô tả hình ảnh bạn muốn tạo, ví dụ: "một chú mèo phi hành gia trên sao hỏa"...',
        generateButton: 'Tạo 2 ảnh',
        resultsPlaceholder: 'Kết quả của bạn sẽ xuất hiện ở đây.',
        generateVideoPrompt: 'Prompt Video'
    },
    imageEditor: {
        title: 'Chỉnh sửa ảnh bằng AI',
        description: 'Tải lên một bức ảnh và sử dụng các công cụ AI để biến đổi hình ảnh của bạn.',
        uploadTitle: 'Tải ảnh để chỉnh sửa',
        uploadSubtitle: 'PNG, JPG',
        editDescription: 'Mô tả chỉnh sửa của bạn',
        editPlaceholder: 'Ví dụ: "thêm một chiếc mũ cao bồi", "biến nền thành bãi biển"...',
        execute: 'Thực hiện',
        resultsPlaceholder: 'Ảnh đã chỉnh sửa sẽ xuất hiện ở đây.',
        filters: 'Bộ lọc & Hiệu ứng',
        editingTools: 'Công cụ chỉnh sửa',
        editWithDescription: 'Chỉnh sửa bằng mô tả',
        removeBackground: 'Xóa nền',
        restoreOldPhoto: 'Phục hồi ảnh cũ',
        upscaleImage: 'Nâng cấp ảnh',
        expandImage: 'Mở rộng ảnh',
        orSelectNewAspectRatio: 'Hoặc chọn "Tỷ lệ khung hình" mới bên dưới và...',
        statusRemovingBg: 'Đang xóa nền...',
        statusRestoring: 'Đang phục hồi ảnh...',
        statusUpscaling: 'Đang nâng cấp ảnh...',
    },
    profileImage: {
        title: 'Tạo ảnh đại diện AI',
        description: 'Tải lên ảnh chân dung của bạn và biến nó thành các phong cách độc đáo.',
        errorStyle: 'Vui lòng chọn một phong cách.',
        errorImage: 'Vui lòng tải ảnh của bạn lên trước.',
        errorTrial: 'Bạn cần ít nhất {cost} lượt tạo. Vui lòng đăng nhập.',
        errorGeneral: 'Đã xảy ra lỗi khi tạo ảnh. Vui lòng thử lại.',
        statusPrepare: 'Đang chuẩn bị...',
        statusProcess: 'Đang xử lý ảnh của bạn...',
        statusApplyStyle: 'Đang áp dụng phong cách {style}...',
        statusFinalize: 'Đang hoàn thiện các chi tiết cuối cùng...',
        statusSuccess: 'Tạo ảnh thành công!',
        uploadLabel: 'Tải ảnh của bạn',
        uploadButton: 'Nhấn để tải ảnh chân dung',
        styleLabel: 'Chọn phong cách',
        detailsLabel: 'Thêm chi tiết (tùy chọn)',
        detailsPlaceholder: 'Ví dụ: "thêm kính râm", "tóc màu xanh"...',
        generateLabel: 'Tạo ảnh',
        generatingButton: 'Đang tạo ảnh...',
        generateButton: 'Tạo 2 ảnh đại diện',
        resultsPlaceholder: 'Ảnh đại diện của bạn sẽ xuất hiện ở đây.',
    },
    trialEnded: {
        title: 'Đã hết lượt dùng thử!',
        description: 'Vui lòng đăng nhập hoặc mua tài khoản để tiếp tục.',
        loginButton: 'Đăng nhập',
    },
    login: {
        close: 'Đóng',
        title: 'Đăng nhập vào tài khoản của bạn',
        usernameLabel: 'Tên đăng nhập',
        usernamePlaceholder: 'Nhập tên đăng nhập',
        passwordLabel: 'Mật khẩu',
        passwordPlaceholder: 'Nhập mật khẩu',
        loginButton: 'Đăng nhập',
        contactAdmin: 'Chưa có tài khoản? Liên hệ quản trị viên qua Zalo {zalo} để được cấp.',
    },
    videoIdea: {
        title: 'Lên ý tưởng Video Quảng cáo',
        description: 'Cung cấp thông tin sản phẩm và để AI tạo ra kịch bản, hình ảnh và nội dung quảng cáo.',
        uploadProduct: 'Ảnh sản phẩm chính',
        uploadBack: 'Ảnh mặt sau (tùy chọn)',
        uploadDetail: 'Ảnh chi tiết (tùy chọn)',
        productNameLabel: 'Tên sản phẩm (Bắt buộc)',
        productNamePlaceholder: 'Ví dụ: Nước hoa "Dấu Ấn"',
        productInfoLabel: 'Thông tin sản phẩm (Bắt buộc)',
        productInfoPlaceholder: 'Ví dụ: Mùi hương gỗ đàn hương và hoa nhài, lưu hương 8 tiếng, thiết kế sang trọng...',
        industryLabel: 'Ngành hàng',
        brandToneLabel: 'Tông giọng thương hiệu',
        audienceLabel: 'Đối tượng khách hàng (Bắt buộc)',
        audiencePlaceholder: 'Ví dụ: Phụ nữ văn phòng 25-40 tuổi, yêu thích sự tinh tế',
        durationLabel: 'Độ dài (Số cảnh)',
        ctaLabel: 'Kêu gọi hành động (Bắt buộc)',
        ctaPlaceholder: 'Ví dụ: "Mua ngay tại website!", "Nhắn tin để được tư vấn"',
        ratioLabel: 'Tỉ lệ Video',
        generatingButton: 'Đang sáng tạo...',
        generateButton: 'Tạo ý tưởng Video',
        resultsTitle: 'Ý tưởng được tạo ra',
        copiedScriptButton: 'Đã sao chép kịch bản!',
        copyScriptButton: 'Sao chép kịch bản',
        adCopyTitle: 'Nội dung quảng cáo gợi ý',
        copiedAdCopyButton: 'Đã sao chép!',
        copyAdCopyButton: 'Sao chép',
        generatingAdCopy: 'Đang viết nội dung quảng cáo...',
        audioPreviewTitle: 'Nghe thử lời thoại (TTS)',
        sceneTitle: 'Cảnh',
        visualsLabel: 'Hình ảnh:',
        voiceoverLabel: 'Lời thoại:',
        listenButton: 'Nghe',
        imageGenError: 'Lỗi tạo ảnh',
        copiedPromptVisuals: 'Đã sao chép!',
        copyPromptVisuals: 'Sao chép prompt ảnh',
        resultsPlaceholderTitle: 'Kịch bản và storyboard của bạn sẽ xuất hiện ở đây.',
    },
    fashionStudio: {
      title: 'Studio Thời trang AI',
      description: 'Tách sản phẩm, thử đồ lên người mẫu mới, hoặc trưng bày sản phẩm một cách chuyên nghiệp.',
      tabExtract: 'Tách Sản Phẩm',
      tabDress: 'Mặc Lên Mẫu Mới',
      tabHang: 'Treo Trên Giá Kệ',
      uploadModelLabel: 'Tải ảnh gốc người mẫu (Bắt buộc)',
      uploadPlaceholder: 'Tải ảnh lên hoặc kéo thả',
      uploadSubtitle: 'PNG, JPG, WEBP',
      itemsToExtractLabel: 'Sản Phẩm Cần Tách (Chọn Một Hoặc Nhiều)',
      itemTop: 'áo',
      itemBottom: 'quần',
      itemDress: 'váy',
      extractButton: 'Tách sản phẩm',
      finalResultTitle: 'Kết quả cuối cùng',
      resultPlaceholder: 'Hình ảnh của bạn sẽ xuất hiện ở đây.',
      errorNoImage: 'Vui lòng tải ảnh người mẫu lên.',
      errorNoItems: 'Vui lòng chọn ít nhất một sản phẩm để tách.',
      statusExtracting: 'Đang tách sản phẩm...',
      statusSuccess: 'Tách sản phẩm thành công!',
      aiAllows: 'Ứng dụng AI cho phép:',
      allow1: 'Tách một hoặc nhiều sản phẩm thời trang (quần, áo, váy) từ người mẫu.',
      allow2: 'Sử dụng sản phẩm đã tách hoặc tải ảnh lên để mặc lên người mẫu khác.',
      allow3: 'Đặt sản phẩm vào không gian trưng bày theo mô tả của bạn.',
      uploadClothingLabel: 'Tải ảnh sản phẩm (áo/quần/váy)',
      uploadNewModelLabel: 'Tải ảnh người mẫu mới',
      dressButton: 'Ghép đồ lên mẫu',
      hangButton: 'Trưng bày sản phẩm',
      sceneDescriptionLabel: 'Mô tả bối cảnh trưng bày',
      sceneDescriptionPlaceholder: 'ví dụ: treo trên giá gỗ trong boutique sang trọng...',
      additionalPromptLabel: 'Hướng dẫn thêm (tùy chọn)',
      additionalPromptPlaceholder: 'ví dụ: làm cho áo vừa vặn hơn...',
      useExtractedProduct: 'Sử dụng sản phẩm vừa tách',
      errorNoClothing: 'Vui lòng tải ảnh sản phẩm.',
      errorNoNewModel: 'Vui lòng tải ảnh người mẫu mới.',
      errorNoScene: 'Vui lòng mô tả bối cảnh trưng bày.',
      statusDressing: 'Đang mặc đồ lên mẫu...',
      statusDressingSuccess: 'Ghép đồ thành công!',
      statusHanging: 'Đang trưng bày sản phẩm...',
      statusHangingSuccess: 'Trưng bày thành công!',
    },
    ttsGenerator: {
      title: 'Chuyển Văn bản thành Giọng nói',
      description: 'Biến văn bản của bạn thành âm thanh sống động với nhiều lựa chọn giọng nói AI.',
      textLabel: 'Nhập văn bản',
      textPlaceholder: 'Nhập nội dung bạn muốn chuyển đổi thành giọng nói ở đây...',
      voiceLabel: 'Chọn giọng đọc',
      generateButton: 'Tạo Âm thanh',
      generatingButton: 'Đang tạo...',
      resultsPlaceholder: 'Âm thanh được tạo sẽ xuất hiện ở đây.',
      saveAudio: 'Lưu Âm thanh',
      errorNoText: 'Vui lòng nhập văn bản để tạo giọng nói.',
      errorNoVoice: 'Vui lòng chọn một giọng đọc.',
    }
  }
};

// Simple t function
const t = (key: string, options?: Record<string, any>): string => {
  const keys = key.split('.');
  let result: any = translations.vi;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      return key; // Return key if not found
    }
  }
  if (typeof result === 'string' && options) {
    return Object.entries(options).reduce((acc, [optKey, optVal]) => {
      return acc.replace(`{${optKey}}`, String(optVal));
    }, result);
  }
  return result;
};

type LanguageContextType = {
  t: (key: string, options?: Record<string, any>) => string;
};

const LanguageContext = createContext<LanguageContextType>({ t });

export const useLanguage = () => useContext(LanguageContext);

// Fix: Changed component signature to use React.FC<PropsWithChildren<{}>> for better type safety.
export const LanguageProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  // Reverted to React.createElement to avoid JSX syntax in a .ts file, which can cause parsing errors.
  return React.createElement(LanguageContext.Provider, { value: { t } }, children);
};
