import { useState } from "react";
import { Rnd } from "react-rnd";
import { FiMaximize2, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import MapView from "../components/MapView";
import RightPanel from "../components/RightPanel";
import ConfirmDialog from "../components/ConfirmDialog";
import AlertDialog from "../components/AlertDialog";

import mapImage from "../assets/images/map.png";

// Lottie animations
import successAnim from "../assets/lotties/successAnimation.json";
import failedAnim from "../assets/lotties/failedAnimation.json";

const DEFAULT_RANGES = {
  upper: 140,
  lower: 140,
  cam360: 90,
};

const DEFAULT_INSPECTOR_SIZE = { width: 360, height: 260 };

export default function Home() {
  const { t, i18n } = useTranslation("common");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [cameras, setCameras] = useState([
    {
      id: 1,
      type: "upper",
      x: 30,
      y: 40,
      range: DEFAULT_RANGES.upper,
      angle: 0,
      code: "CAM-UP-01",
      alarm: true,
    },
    {
      id: 2,
      type: "lower",
      x: 60,
      y: 50,
      range: DEFAULT_RANGES.lower,
      angle: 0,
      code: "CAM-LOW-01",
      alarm: true,
    },
    {
      id: 3,
      type: "cam360",
      x: 50,
      y: 70,
      radius: DEFAULT_RANGES.cam360,
      code: "CAM-360-01",
      alarm: true,
    },
  ]);

  const [placingType, setPlacingType] = useState(null);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const [confirmSave, setConfirmSave] = useState(false);

  const [alertState, setAlertState] = useState({
    open: false,
    title: "",
    message: "",
    animationData: null,
  });

  const [inspector, setInspector] = useState({
    open: false,
    camera: null,
    x: 80,
    y: 80,
    width: DEFAULT_INSPECTOR_SIZE.width,
    height: DEFAULT_INSPECTOR_SIZE.height,
    fullscreen: false,
  });

  const openAlert = ({ title, message, animationData }) => {
    setAlertState({
      open: true,
      title,
      message,
      animationData,
    });
  };

  const closeAlert = () =>
    setAlertState((s) => ({ ...s, open: false }));

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
        alarm: true,
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

  const handleDeleteCamera = (id) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
    if (selectedCameraId === id) {
      setSelectedCameraId(null);
    }
    setInspector((prev) =>
      prev.camera && prev.camera.id === id
        ? { ...prev, open: false, camera: null }
        : prev
    );
  };

  const toggleEditMode = () => {
    setEditMode((m) => !m);
    if (!editMode) {
      setIsPanelOpen(true);
    } else {
      setSelectedCameraId(null);
      setPlacingType(null);
      setInspector((prev) => ({ ...prev, open: false, camera: null }));
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

  const handleConfirmSave = () => {
    setConfirmSave(false);

    // TODO: gọi API lưu DB

    setIsPanelOpen(false);
    setEditMode(false);
    setPlacingType(null);
    setSelectedCameraId(null);
    setInspector((prev) => ({ ...prev, open: false, camera: null }));

    openAlert({
      title: t("save.successTitle"),
      message: t("save.successMessage"),
      animationData: successAnim,
    });
  };

  const handleInspectCamera = (camera) => {
    if (editMode) return;

    setInspector({
      open: true,
      camera,
      x: 80,
      y: 80,
      width: DEFAULT_INSPECTOR_SIZE.width,
      height: DEFAULT_INSPECTOR_SIZE.height,
      fullscreen: false,
    });
  };

  const handleViewCameraDetails = (camera) => {
    if (editMode) return;
    setSelectedCameraId(camera.id);
    setIsPanelOpen(true);
  };

  const closeInspector = () => {
    setInspector((prev) => ({ ...prev, open: false, camera: null }));
  };

  const toggleInspectorFullscreen = () => {
    setInspector((prev) => {
      if (!prev.fullscreen) {
        const w =
          typeof window !== "undefined" ? window.innerWidth : 800;
        const h =
          typeof window !== "undefined" ? window.innerHeight : 500;

        return {
          ...prev,
          fullscreen: true,
          x: 0,
          y: 0,
          width: w,
          height: h,
        };
      }
      return {
        ...prev,
        fullscreen: false,
        x: 80,
        y: 80,
        width: DEFAULT_INSPECTOR_SIZE.width,
        height: DEFAULT_INSPECTOR_SIZE.height,
      };
    });
  };

  const setLang = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="w-screen h-screen bg-white overflow-hidden relative">
      {/* MAP */}
      <MapView
        mapImage={mapImage}
        cameras={cameras}
        editMode={editMode}
        selectedCameraId={selectedCameraId}
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

      {/* Floating Inspector */}
      {inspector.open && inspector.camera && !editMode && (
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
          onResizeStop={(_e, _dir, ref, _delta, pos) =>
            setInspector((prev) => ({
              ...prev,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              x: pos.x,
              y: pos.y,
            }))
          }
          minWidth={260}
          minHeight={180}
          bounds="window"
          className="z-40"
        >
          <div
            className={
              "w-full h-full overflow-hidden bg-slate-950/95 backdrop-blur-sm flex flex-col " +
              (inspector.fullscreen
                ? ""
                : "rounded-2xl shadow-2xl border border-slate-800/60")
            }
          >
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

            <div className="flex-1 bg-black flex items-center justify-center">
              <span className="text-[11px] text-slate-400">
                {/* Nội dung inspector sẽ làm sau */}
                Inspector content (to be implemented)
              </span>
            </div>
          </div>
        </Rnd>
      )}
    </div>
  );
}
