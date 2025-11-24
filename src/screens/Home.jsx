import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { FiMaximize2, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import MapView from "../components/MapView";
import RightPanel from "../components/RightPanel";
import ConfirmDialog from "../components/ConfirmDialog";
import AlertDialog from "../components/AlertDialog";

import mapImage from "../assets/images/mapNetCang_cropped2.png";

// Lottie animations
import successAnim from "../assets/lotties/successAnimation.json";
import failedAnim from "../assets/lotties/failedAnimation.json";

const DEFAULT_RANGES = {
  upper: 100,
  lower: 100,
  cam360: 90,
};

// size inspector dạng window (không fullscreen)
const DEFAULT_INSPECTOR_SIZE = { width: 720, height: 440 };

// Tạm thời: mọi camera đều dùng chung 1 snapshot URL (qua proxy Vite)
const SNAP_URL = "/cctv/cgi-bin/viewer/video.jpg?resolution=1920x1080";

// ===== API base cho Laravel CCTV layout (Minh Tam) =====
const CCTV_API_BASE = "http://gmo021.cansportsvg.com/api/cctv";

// ===== BASE URL ảnh warning (thumb/full) – chỉnh lại cho đúng backend =====
const WARNING_IMAGE_BASE = "http://gmo021.cansportsvg.com/api/storage/app/cctv/";

// helper: map 1 row từ DB layout -> object camera cho MapView
function mapLayoutRowToCamera(row) {
  const camType = row.cam_type;
  const isTri = camType === "upper" || camType === "lower";
  const isCircle = camType === "cam360";

  // parse location JSON nếu backend trả dạng string
  let loc = row.location_json || row.location || {};
  if (typeof loc === "string") {
    try {
      loc = JSON.parse(loc);
    } catch {
      loc = {};
    }
  }

  return {
    id: row.id, // dùng id của bảng layout luôn (persisted)
    type: camType,
    code: row.camera_code,
    x: Number(row.x_percent),
    y: Number(row.y_percent),
    range: isTri
      ? Number(row.view_distance ?? DEFAULT_RANGES[camType] ?? 100)
      : undefined,
    angle: isTri ? Number(row.view_angle ?? 0) : 0,
    radius: isCircle
      ? Number(row.view_radius ?? DEFAULT_RANGES.cam360)
      : undefined,

    hasLayout: true,
    created_at: row.created_at || null, // dùng cho "mapped at"
    status: row.status || "", // Operating status
    location_json: loc, // location đa ngôn ngữ
    ip: row.ip || "",
  };
}

// helper: map camera trên client -> payload gửi lên API
function mapCameraToPayload(cam) {
  const isTri = cam.type === "upper" || cam.type === "lower";
  const isCircle = cam.type === "cam360";

  return {
    camera_code: cam.code, // bắt buộc có
    cam_type: cam.type,
    x_percent: cam.x,
    y_percent: cam.y,
    view_distance: isTri ? cam.range ?? null : null,
    view_angle: isTri ? cam.angle ?? 0 : null,
    view_radius: isCircle ? cam.radius ?? null : null,
  };
}

// helper: map 1 row từ cctv_tbl -> item dùng cho danh sách unmapped
function mapCctvRow(row) {
  let loc = row.location_json || row.location || {};
  if (typeof loc === "string") {
    try {
      loc = JSON.parse(loc);
    } catch {
      loc = {};
    }
  }

  return {
    code: row.camera_code || row.code || "",
    status: row.status || "",
    location_json: loc,
  };
}

export default function Home() {
  const { t, i18n } = useTranslation("common");

  const [alerts, setAlerts] = useState([]); // danh sách cảnh báo 10 phút gần đây

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ===== CAMERAS: chỉ layout, không chứa trạng thái alarm theo DB =====
  const [cameras, setCameras] = useState([]); // layout hiện tại trên map

  /**
   * Danh sách tất cả camera vật lý từ cctv_tbl
   * (dùng cho danh sách "chưa cấu hình vị trí" + status + location đa ngôn ngữ)
   */
  const [allCctv, setAllCctv] = useState([]);

  /**
   * alarmState: nếu sau này muốn bật alarm manual trên client thì dùng,
   * giờ alarm từ DB sẽ OR chung với state này.
   * key: camera_code (string)  → value: true/false
   */
  const [alarmState, setAlarmState] = useState({});

  const [placingType, setPlacingType] = useState(null);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const [confirmSave, setConfirmSave] = useState(false);

  const [alertState, setAlertState] = useState({
    open: false,
    title: "",
    message: "",
    animationData: null,
  });

  /**
   * Inspector:
   * - mode "window": dùng Rnd (drag/resize)
   * - mode "fullscreen": overlay fixed, KHÔNG dùng Rnd, không resize/drag
   */
  const [inspector, setInspector] = useState({
    open: false,
    camera: null,
    mode: "window", // "window" | "fullscreen"
    x: 80,
    y: 80,
    width: DEFAULT_INSPECTOR_SIZE.width,
    height: DEFAULT_INSPECTOR_SIZE.height,
  });

  // rect trước khi fullscreen để restore lại
  const [prevWindowRect, setPrevWindowRect] = useState(null);

  // tick để ép browser reload ảnh liên tục
  const [snapTick, setSnapTick] = useState(0);

  // dùng để yêu cầu MapView focus vào camera theo cảnh báo
  const [focusCameraCode, setFocusCameraCode] = useState(null);

  // ===================== GỌI API LAYOUT (load layout lần đầu) =====================
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await fetch(`${CCTV_API_BASE}/layout/get`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        // backend: return ['ret_code'=>0, 'data'=>$rows]
        if (data.ret_code !== 0 || !Array.isArray(data.data)) {
          throw new Error("Invalid layout response");
        }

        const mapped = data.data.map(mapLayoutRowToCamera);

        setCameras(mapped);

        // init alarmState: tất cả OFF
        const alarmInit = {};
        for (const cam of mapped) {
          if (cam.code) alarmInit[cam.code] = false;
        }
        setAlarmState(alarmInit);
      } catch (err) {
        console.error("Load CCTV layout failed:", err);
        setAlertState({
          open: true,
          title: t("layout.loadFailedTitle"),
          message: t("layout.loadFailedMessage"),
          animationData: failedAnim,
        });
      }
    };

    fetchLayout();
  }, [t]);

  // ===================== GỌI API DANH SÁCH CAMERA (cctv_tbl) =====================
  useEffect(() => {
    const fetchAllCctv = async () => {
      try {
        const res = await fetch(`${CCTV_API_BASE}/layout/unmapped`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.ret_code !== 0 || !Array.isArray(data.data)) {
          throw new Error("Invalid CCTV list response");
        }

        const mapped = data.data.map(mapCctvRow);
        setAllCctv(mapped);
      } catch (err) {
        console.error("Load CCTV list failed:", err);
        // Không cần show alert, chỉ log
      }
    };

    fetchAllCctv();
  }, []);

  // Khi inspector mở → auto tăng tick mỗi 500ms (F5 nhẹ)
  useEffect(() => {
    if (!inspector.open) return;

    const id = setInterval(() => {
      setSnapTick((v) => v + 1);
    }, 500); // 0.5s / frame

    return () => clearInterval(id);
  }, [inspector.open]);

  // ===================== POLLING WARNING (30s, giữ 10 phút gần nhất) =====================
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(
          `${CCTV_API_BASE}/warning/recent`,
          {
            method: "GET",
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (data.ret_code !== 0 || !Array.isArray(data.data)) {
          throw new Error("Invalid warning response");
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const tenMinAgo = nowSec - 10 * 60;

        // lọc 10 phút gần nhất (phòng backend trả dư)
        const filtered = data.data.filter((ev) => {
          if (typeof ev.created_unix !== "number") return true;
          return ev.created_unix >= tenMinAgo;
        });

        // sort mới -> cũ
        filtered.sort(
          (a, b) =>
            (b.created_unix || 0) - (a.created_unix || 0)
        );

        // map thêm full URL thumb/full
        const mapped = filtered.map((ev) => ({
          ...ev,
          thumbUrl: ev.thumbshot_url
            ? `${WARNING_IMAGE_BASE}${ev.thumbshot_url}`
            : null,
          fullUrl: ev.fullshot_url
            ? `${WARNING_IMAGE_BASE}${ev.fullshot_url}`
            : null,
        }));

        setAlerts(mapped);
      } catch (err) {
        console.error("Polling warning events failed:", err);
      }
    };

    fetchAlerts(); // gọi lần đầu

    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, []);

  const openAlert = ({ title, message, animationData }) => {
    setAlertState({
      open: true,
      title,
      message,
      animationData,
    });
  };

  const closeAlert = () =>
    setAlertState((s) => ({
      ...s,
      open: false,
    }));

  const selectedCamera =
    cameras.find((c) => c.id === selectedCameraId) || null;

  const handleMapClick = (x, y) => {
    if (!editMode || !placingType) return;

    let newId = 1;

    setCameras((prev) => {
      newId = prev.length ? prev[prev.length - 1].id + 1 : 1;
      const base = {
        id: newId,
        x,
        y,
        type: placingType,
        hasLayout: false, // camera mới chỉ tồn tại trên client
      };

      if (placingType === "cam360") {
        return [
          ...prev,
          {
            ...base,
            radius: DEFAULT_RANGES.cam360,
          },
        ];
      }

      return [
        ...prev,
        {
          ...base,
          range:
            placingType === "upper"
              ? DEFAULT_RANGES.upper
              : DEFAULT_RANGES.lower,
          angle: 0,
        },
      ];
    });

    // camera mới thêm: mặc định alarm = false (client control)
    setAlarmState((prev) => ({
      ...prev,
      [String(newId)]: false,
    }));

    setSelectedCameraId(newId);
  };

  const handleSelectCamera = (id) => {
    if (!editMode) return;
    setSelectedCameraId(id);
  };

  const handleUpdateCamera = (id, patch) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  /**
   * Xoá camera:
   * - Nếu đã có trong DB (hasLayout = true & có code) -> gọi API /layout/delete + confirm (ở MapView)
   * - Nếu chưa có trong DB -> chỉ xoá local trên map, không confirm, không gọi API
   */
  const handleDeleteCamera = async (id, options = {}) => {
    const cam = cameras.find((c) => c.id === id);
    if (!cam) return;

    const removeLocal = () => {
      setCameras((prev) => prev.filter((c) => c.id !== id));

      setAlarmState((prev) => {
        const next = { ...prev };
        if (cam.code) delete next[cam.code];
        return next;
      });

      if (selectedCameraId === id) {
        setSelectedCameraId(null);
      }

      setInspector((prev) =>
        prev.camera && prev.camera.id === id
          ? { ...prev, open: false, camera: null }
          : prev
      );
    };

    // Nếu yêu cầu localOnly hoặc chưa có layout trong DB -> xoá local luôn
    if (
      options.localOnly ||
      !cam.hasLayout ||
      !cam.code // không có code thì chắc chắn chưa lưu
    ) {
      removeLocal();
      return;
    }

    try {
      const res = await fetch(`${CCTV_API_BASE}/layout/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_code: cam.code,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.ret_code !== 0) {
        throw new Error(data.msg || "Delete layout failed");
      }

      removeLocal();

      openAlert({
        title: t("delete.successTitle"),
        message: t("delete.successMessage", {
          code: cam.code || cam.id,
        }),
        animationData: successAnim,
      });
    } catch (err) {
      console.error("Delete layout failed:", err);
      openAlert({
        title: t("delete.failedTitle"),
        message: t("delete.failedMessage"),
        animationData: failedAnim,
      });
    }
  };

  const toggleEditMode = () => {
    setEditMode((m) => !m);
    if (!editMode) {
      // chuyển sang edit
      setIsPanelOpen(true);
    } else {
      // thoát edit
      setSelectedCameraId(null);
      setPlacingType(null);
      setInspector((prev) => ({
        ...prev,
        open: false,
        camera: null,
        mode: "window",
      }));
    }
  };

  const handleClickSave = () => {
    if (!editMode) return;

    const hasMissingCode = cameras.some(
      (cam) => !cam.code || !cam.code.trim()
    );

    if (hasMissingCode) {
      openAlert({
        title: t("save.failedTitle"),
        message: t("save.failedMessage"),
        animationData: failedAnim,
      });
      return;
    }

    setConfirmSave(true);
  };

  // ================== SAVE LAYOUT VÀO DB QUA API ==================
  const handleConfirmSave = async () => {
    setConfirmSave(false);

    try {
      const payload = cameras
        .filter((cam) => cam.code && cam.code.trim())
        .map(mapCameraToPayload);

      const res = await fetch(`${CCTV_API_BASE}/layout/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // backend expect 'items' array
          items: payload,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.ret_code !== 0) {
        throw new Error(data.msg || "Save layout failed");
      }

      // Sau khi lưu, đánh dấu tất cả camera hiện tại là đã có layout
      setCameras((prev) =>
        prev.map((c) => ({
          ...c,
          hasLayout: true,
        }))
      );

      setIsPanelOpen(false);
      setEditMode(false);
      setPlacingType(null);
      setSelectedCameraId(null);
      setInspector((prev) => ({
        ...prev,
        open: false,
        camera: null,
        mode: "window",
      }));

      openAlert({
        title: t("save.successTitle"),
        message: t("save.successMessage"),
        animationData: successAnim,
      });
    } catch (err) {
      console.error("Save CCTV layout failed:", err);
      openAlert({
        title: t("save.failedTitle"),
        message: t("save.failedGenericMessage"),
        animationData: failedAnim,
      });
    }
  };
  // ================== END SAVE LAYOUT ==================

  const handleInspectCamera = (camera) => {
    if (editMode) return;

    const vw =
      typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh =
      typeof window !== "undefined" ? window.innerHeight : 720;

    const w = DEFAULT_INSPECTOR_SIZE.width;
    const h = DEFAULT_INSPECTOR_SIZE.height;

    setInspector({
      open: true,
      camera,
      mode: "window",
      x: (vw - w) / 2,
      y: (vh - h) / 2,
      width: w,
      height: h,
    });
    setPrevWindowRect(null);
  };

  const handleViewCameraDetails = (camera) => {
    // View mode: click trên icon chuột phải
    if (editMode) return;
    setSelectedCameraId(camera.id);
    setIsPanelOpen(true);
  };

  const closeInspector = () => {
    setInspector((prev) => ({
      ...prev,
      open: false,
      camera: null,
      mode: "window",
    }));
  };

  const toggleInspectorFullscreen = () => {
    setInspector((prev) => {
      if (prev.mode !== "fullscreen") {
        // lưu lại rect window
        setPrevWindowRect({
          x: prev.x,
          y: prev.y,
          width: prev.width,
          height: prev.height,
        });

        return {
          ...prev,
          mode: "fullscreen",
        };
      }

      // từ fullscreen về window
      const restore =
        prevWindowRect || {
          x: 80,
          y: 80,
          width: DEFAULT_INSPECTOR_SIZE.width,
          height: DEFAULT_INSPECTOR_SIZE.height,
        };

      return {
        ...prev,
        mode: "window",
        ...restore,
      };
    });
  };

  const setLang = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleSnapshotLoad = () => {
    // để trống, nếu cần debug thì console.log
  };

  // ===== TÍNH DANH SÁch CAMERA CHƯA CẤU HÌNH (unmapped) =====
  const usedCodes = new Set(
    cameras
      .map((c) => c.code && c.code.trim())
      .filter(Boolean)
  );

  const unmappedCameras = allCctv.filter(
    (c) => c.code && !usedCodes.has(c.code)
  );

  // ===== Tính các camera đang có cảnh báo (10 phút gần đây) =====
  const activeAlertCodes = new Set(
    alerts
      .map((a) => a.camera_code && a.camera_code.trim())
      .filter(Boolean)
  );

  // ===== Merge layout + alarmState + info từ cctv_tbl + alert → camerasForMap =====
  const cctvByCode = {};
  for (const c of allCctv) {
    if (c.code) cctvByCode[c.code] = c;
  }

  const camerasForMap = cameras.map((cam) => {
    const key = cam.code || String(cam.id);
    const extra =
      cam.code && cctvByCode[cam.code]
        ? {
            status: cctvByCode[cam.code].status,
            location_json: cctvByCode[cam.code].location_json,
          }
        : {};

    const hasDbAlert =
      cam.code && activeAlertCodes.has(cam.code.trim());

    return {
      ...cam,
      ...extra,
      // alarm = từ DB OR từ state client (nếu sau này dùng)
      alarm: !!alarmState[key] || !!hasDbAlert,
    };
  });

  const handlePickCameraCode = (code) => {
    if (!editMode || !selectedCamera) return;
    handleUpdateCamera(selectedCamera.id, { code });
  };

  // ===== Click vào 1 notification trong panel =====
  const handleAlertClick = (alert) => {
    if (!alert || !alert.camera_code) return;
    const cam = cameras.find(
      (c) => c.code && c.code === alert.camera_code
    );
    if (!cam) {
      // camera chưa có trên map -> bỏ qua
      return;
    }

    setFocusCameraCode(alert.camera_code);

    // nếu muốn highlight trong edit mode
    if (editMode) {
      setSelectedCameraId(cam.id);
    }
  };

  return (
    <div className="w-screen h-screen bg-white overflow-hidden relative">
      {/* MAP */}
      <MapView
        mapImage={mapImage}
        cameras={camerasForMap}
        editMode={editMode}
        alerts={alerts}
        focusCameraCode={focusCameraCode}
        // highlight chỉ dùng khi edit
        selectedCameraId={editMode ? selectedCameraId : null}
        onMapClick={handleMapClick}
        onSelectCamera={handleSelectCamera}
        onUpdateCamera={handleUpdateCamera}
        onDeleteCamera={handleDeleteCamera}
        onInspectCamera={handleInspectCamera}
        onViewCameraDetails={handleViewCameraDetails}
      />

      {/* Language switcher + MODE + EDIT BUTTON */}
      <div className="absolute top-4 right-6 z-0 flex items-center gap-3">
        {/* Language */}
        <div className="flex items-center gap-1 bg-white/80 border border-slate-200 rounded-full px-2 py-1 text-[11px] text-slate-700 shadow-sm">
          <button
            onClick={() => setLang("vi")}
            className={`px-2 py-0.5 rounded-full ${
              i18n.language?.startsWith("vi")
                ? "bg-slate-900 text-white"
                : "hover:bg-slate-100"
            }`}
          >
            VI
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-2 py-0.5 rounded-full ${
              i18n.language?.startsWith("en")
                ? "bg-slate-900 text-white"
                : "hover:bg-slate-100"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("zh-TW")}
            className={`px-2 py-0.5 rounded-full ${
              i18n.language === "zh-TW"
                ? "bg-slate-900 text-white"
                : "hover:bg-slate-100"
            }`}
          >
            繁
          </button>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            editMode
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          {editMode ? t("mode.edit") : t("mode.view")}
        </span>

        <button
          onClick={toggleEditMode}
          className="
            px-4 py-1.5 rounded-full text-xs font-medium
            bg-slate-900 text-white
            shadow-md hover:bg-slate-700
            transition-colors
          "
        >
          {editMode ? t("button.done") : t("button.edit")}
        </button>
      </div>

      {/* RIGHT PANEL */}
      <RightPanel
        isOpen={isPanelOpen}
        toggle={() => setIsPanelOpen((v) => !v)}
        editMode={editMode}
        placingType={placingType}
        onPlaceTypeChange={setPlacingType}
        selectedCamera={selectedCamera}
        onUpdateSelectedCamera={(patch) => {
          if (!selectedCamera) return;
          handleUpdateCamera(selectedCamera.id, patch);
        }}
        onClickSave={handleClickSave}
        unmappedCameras={unmappedCameras}
        onPickCameraCode={handlePickCameraCode}
        alerts={alerts}
        onAlertClick={handleAlertClick}
      />

      {/* Confirm dialog lưu cấu hình */}
      <ConfirmDialog
        open={confirmSave}
        title={t("save.confirmTitle")}
        description={t("save.confirmDesc")}
        confirmLabel={t("button.confirm")}
        cancelLabel={t("button.cancel")}
        onCancel={() => setConfirmSave(false)}
        onConfirm={handleConfirmSave}
      />

      {/* Alert dialog (success / failed) */}
      <AlertDialog
        open={alertState.open}
        title={alertState.title}
        message={alertState.message}
        onClose={closeAlert}
        animationData={alertState.animationData}
        loop={true}
      />

      {/* Floating Inspector - WINDOW MODE (dùng Rnd) */}
      {inspector.open &&
        inspector.camera &&
        !editMode &&
        inspector.mode === "window" && (
          <Rnd
            size={{ width: inspector.width, height: inspector.height }}
            position={{ x: inspector.x, y: inspector.y }}
            onDragStop={(_e, d) =>
              setInspector((prev) => ({
                ...prev,
                x: d.x,
                y: d.y,
              }))
            }
            onResizeStop={(_e, _dir, ref, _delta, pos) => {
              const w = ref.offsetWidth;
              const h = ref.offsetHeight;
              setInspector((prev) => ({
                ...prev,
                width: w,
                height: h,
                x: pos.x,
                y: pos.y,
              }));
            }}
            minWidth={360}
            minHeight={240}
            bounds="window"
            className="z-40"
          >
            <div className="w-full h-full overflow-hidden bg-slate-950/95 backdrop-blur-sm flex flex-col rounded-2xl shadow-2xl border border-slate-800/60">
              <div className="h-10 px-4 flex items-center justify-between bg-slate-900/90 border-b border-slate-700">
                <div className="text-xs font-semibold text-slate-100 truncate">
                  {inspector.camera.code ||
                    `Camera #${inspector.camera.id}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleInspectorFullscreen}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-200"
                  >
                    <FiMaximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeInspector}
                    className="p-1 rounded-full hover:bg-red-600/80 text-slate-200"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SNAPSHOT ZONE */}
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={`${SNAP_URL}&_=${snapTick}`}
                  alt={`Camera snapshot ${
                    inspector.camera.code || inspector.camera.id
                  }`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleSnapshotLoad}
                  onError={() => {
                    console.warn("Snapshot load error for", SNAP_URL);
                  }}
                />
              </div>
            </div>
          </Rnd>
        )}

      {/* Floating Inspector - FULLSCREEN MODE (KHÔNG dùng Rnd) */}
      {inspector.open &&
        inspector.camera &&
        !editMode &&
        inspector.mode === "fullscreen" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full h-full bg-slate-950/95 flex flex-col rounded-none shadow-2xl border border-slate-800/60">
              <div className="h-10 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-700">
                <div className="text-xs md:text-sm font-semibold text-slate-100 truncate">
                  {inspector.camera.code ||
                    `Camera #${inspector.camera.id}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleInspectorFullscreen}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-200"
                  >
                    <FiMaximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeInspector}
                    className="p-1 rounded-full hover:bg-red-600/80 text-slate-200"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={`${SNAP_URL}&_=${snapTick}`}
                  alt={`Camera snapshot ${
                    inspector.camera.code || inspector.camera.id
                  }`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleSnapshotLoad}
                  onError={() => {
                    console.warn("Snapshot load error for", SNAP_URL);
                  }}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
