// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  vi: {
    common: {
      appName: "CCTV-TESTAPP",
      splash: {
        subtitle: "Đang khởi động hệ thống giám sát...",
      },
      mode: {
        edit: "Chế độ chỉnh sửa",
        view: "Chế độ xem",
      },
      button: {
        edit: "Sửa",
        done: "Xong",
        saveConfig: "Lưu cấu hình camera",
        cancel: "Hủy",
        confirm: "Xác nhận",
        delete: "Xóa",
        reset: "Đặt lại",
      },
      panel: {
        titleEdit: "Sửa thông tin camera",
        titleView: "Thông tin camera",
        subtitleEdit:
          "Chế độ chỉnh sửa: đặt và cấu hình camera trên bản đồ.",
        subtitleView: "Chế độ xem: hiển thị bản đồ và camera.",
        helpTitle: "Hướng dẫn sử dụng",
        help1: "1) Chọn loại camera.",
        help2: "2) Click lên bản đồ để đặt.",
        help3: "3) Chọn camera để kéo, xoay và chỉnh tầm nhìn.",
        typeLabel: "Loại camera sẽ đặt khi click map",
        typeUpper: "Trên lầu",
        typeLower: "Dưới lầu",
        type360: "Camera 360°",
        currentCam: "Camera đang chọn",
        currentCode: "Mã hiện tại:",
        noCamera:
          "Chưa chọn camera nào. Click vào icon camera trên bản đồ để chỉnh sửa chi tiết.",
        rangeLabel: "Khoảng cách tầm nhìn",
        angleLabel: "Góc quay (°)",
        radiusLabel: "Bán kính camera 360°",
        rangeHint:
          "Kéo để thay đổi giá trị (đơn vị tương đối trên bản đồ).",
      },
      save: {
        confirmTitle: "Lưu cấu hình camera?",
        confirmDesc:
          "Thông tin vị trí và tầm nhìn của tất cả camera sẽ được lưu lại.",
        successTitle: "Lưu cấu hình thành công",
        successMessage:
          "Thông tin vị trí và tầm nhìn của các camera đã được lưu lại.",
        failedTitle: "Lưu thất bại",
        failedMessage:
          "Bạn chưa nhập mã cho camera. Vui lòng kiểm tra lại.",
      },
      delete: {
        title: "Xóa camera?",
        descriptionPrefix: "Bạn có chắc muốn xóa camera",
        descriptionSuffix:
          "không? Hành động này không thể hoàn tác.",
      },
      map: {
        reset: "Reset",
      },
      language: {
        vi: "Tiếng Việt",
        en: "English",
        zhTW: "繁體中文",
      },
      status: {
        active: "Đang hoạt động",
        inactive: "Ngừng hoạt động",
      },
      camera: {
        infoTitle: "Thông tin camera",
        code: "Mã camera",
        location: "Vị trí (x, y)",
        alarmStatus: "Trạng thái cảnh báo",
      },
    },
  },
  en: {
    common: {
      appName: "CCTV-TESTAPP",
      splash: {
        subtitle: "Initializing surveillance system...",
      },
      mode: {
        edit: "Edit mode",
        view: "View mode",
      },
      button: {
        edit: "Edit",
        done: "Done",
        saveConfig: "Save camera configuration",
        cancel: "Cancel",
        confirm: "Confirm",
        delete: "Delete",
        reset: "Reset",
      },
      panel: {
        titleEdit: "Edit camera",
        titleView: "Camera information",
        subtitleEdit:
          "Edit mode: place and configure cameras on the map.",
        subtitleView: "View mode: display map and cameras.",
        helpTitle: "How to use",
        help1: "1) Choose a camera type.",
        help2: "2) Click on the map to place it.",
        help3: "3) Select a camera to drag, rotate and adjust its FOV.",
        typeLabel: "Camera type when clicking on map",
        typeUpper: "Upper floor",
        typeLower: "Lower floor",
        type360: "360° Camera",
        currentCam: "Selected camera",
        currentCode: "Current code:",
        noCamera:
          "No camera selected. Click a camera icon on the map to edit details.",
        rangeLabel: "View distance",
        angleLabel: "Rotation angle (°)",
        radiusLabel: "360° camera radius",
        rangeHint: "Drag to change value (relative unit on map).",
      },
      save: {
        confirmTitle: "Save camera configuration?",
        confirmDesc:
          "Positions and fields of view of all cameras will be saved.",
        successTitle: "Saved successfully",
        successMessage:
          "Camera positions and viewing ranges have been saved.",
        failedTitle: "Save failed",
        failedMessage:
          "Some cameras do not have a code. Please check again.",
      },
      delete: {
        title: "Delete camera?",
        descriptionPrefix: "Are you sure you want to delete camera",
        descriptionSuffix:
          "? This action cannot be undone.",
      },
      map: {
        reset: "Reset",
      },
      language: {
        vi: "Tiếng Việt",
        en: "English",
        zhTW: "繁體中文",
      },
      status: {
        active: "Active",
        inactive: "Inactive",
      },
      camera: {
        infoTitle: "Camera information",
        code: "Camera code",
        location: "Location (x, y)",
        alarmStatus: "Alarm status",
      },
    },
  },
  "zh-TW": {
    common: {
      appName: "CCTV-TESTAPP",
      splash: {
        subtitle: "系統正在啟動監控服務…",
      },
      mode: {
        edit: "編輯模式",
        view: "檢視模式",
      },
      button: {
        edit: "編輯",
        done: "完成",
        saveConfig: "儲存攝影機配置",
        cancel: "取消",
        confirm: "確認",
        delete: "刪除",
        reset: "重設",
      },
      panel: {
        titleEdit: "編輯攝影機",
        titleView: "攝影機資訊",
        subtitleEdit:
          "編輯模式：在地圖上放置並設定攝影機。",
        subtitleView: "檢視模式：顯示地圖與攝影機。",
        helpTitle: "使用說明",
        help1: "1）選擇攝影機類型。",
        help2: "2）在地圖上點擊以放置。",
        help3: "3）選取攝影機拖曳、旋轉及調整視角範圍。",
        typeLabel: "點擊地圖時要放置的攝影機類型",
        typeUpper: "樓上",
        typeLower: "樓下",
        type360: "360° 攝影機",
        currentCam: "目前選擇的攝影機",
        currentCode: "目前代碼：",
        noCamera:
          "尚未選擇攝影機。請點擊地圖上的攝影機圖示以編輯。",
        rangeLabel: "視角距離",
        angleLabel: "旋轉角度 (°)",
        radiusLabel: "360° 攝影機半徑",
        rangeHint: "拖曳以調整數值（地圖相對單位）。",
      },
      save: {
        confirmTitle: "儲存攝影機配置？",
        confirmDesc:
          "所有攝影機的位置與視角設定將會被儲存。",
        successTitle: "儲存成功",
        successMessage:
          "攝影機位置與視角設定已成功儲存。",
        failedTitle: "儲存失敗",
        failedMessage:
          "有攝影機尚未設定代碼，請再次確認。",
      },
      delete: {
        title: "刪除攝影機？",
        descriptionPrefix: "您確定要刪除攝影機",
        descriptionSuffix: "嗎？此操作無法復原。",
      },
      map: {
        reset: "重設",
      },
      language: {
        vi: "越南文",
        en: "英文",
        zhTW: "繁體中文",
      },
      status: {
        active: "運作中",
        inactive: "已停用",
      },
      camera: {
        infoTitle: "攝影機資訊",
        code: "攝影機代碼",
        location: "位置 (x, y)",
        alarmStatus: "警報狀態",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi",
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "querystring", "cookie"],
      caches: ["localStorage"],
    },
  });

export default i18n;
