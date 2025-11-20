import { useRef, useState } from "react";
import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import { GiCctvCamera } from "react-icons/gi";
import { TbDeviceComputerCamera } from "react-icons/tb";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "./ConfirmDialog";

const CAMERA_TYPES = {
  upper: {
    icon: GiCctvCamera,
    bgClass: "bg-orange-500",
    fovFill: "rgba(249,115,22,0.22)",
    fovStroke: "rgba(194,65,12,0.7)",
  },
  lower: {
    icon: GiCctvCamera,
    bgClass: "bg-amber-400",
    fovFill: "rgba(250,204,21,0.22)",
    fovStroke: "rgba(202,138,4,0.7)",
  },
  cam360: {
    icon: TbDeviceComputerCamera,
    bgClass: "bg-sky-500",
    fovFill: "rgba(56,189,248,0.16)",
    fovStroke: "rgba(3,105,161,0.7)",
  },
};

export default function MapView({
  mapImage,
  cameras,
  editMode,
  selectedCameraId,
  onMapClick,
  onSelectCamera,
  onUpdateCamera,
  onDeleteCamera,
  onInspectCamera,
  onViewCameraDetails,
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [scale, setScale] = useState(1);
  const dragClickGuardRef = useRef(false);
  const { t } = useTranslation("common");

  const [contextMenu, setContextMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    camera: null,
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    camera: null,
  });

  const closeContextMenu = () =>
    setContextMenu({ open: false, x: 0, y: 0, camera: null });

  const openDeleteConfirm = (camera) => {
    closeContextMenu();
    setConfirmState({ open: true, camera });
  };

  const closeConfirm = () =>
    setConfirmState({ open: false, camera: null });

  const handleConfirmDelete = () => {
    if (confirmState.camera && onDeleteCamera) {
      onDeleteCamera(confirmState.camera.id);
    }
    closeConfirm();
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <TransformWrapper
        initialScale={1}
        minScale={0.65}
        maxScale={3}
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: true }}
        onTransformed={(_ref, state) => {
          if (state && typeof state.scale === "number") {
            setScale(state.scale);
          }
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => {
          const showFovAndLabel = scale > 1.05;

          const handleReset = () => {
            resetTransform();
          };

          const handleMove = (e) => {
            if (e.buttons === 1) {
              dragClickGuardRef.current = true;
            }

            if (!draggingId || !editMode) return;
            if (!containerRef.current) return;

            const rect =
              containerRef.current.getBoundingClientRect();
            const x =
              ((e.clientX - rect.left) / rect.width) * 100;
            const y =
              ((e.clientY - rect.top) / rect.height) * 100;

            onUpdateCamera(draggingId, { x, y });
          };

          const stopDragging = () => setDraggingId(null);

          return (
            <>
              {/* Controls zoom góc trái dưới */}
              <div className="absolute left-4 bottom-4 z-20 flex gap-2">
                <button
                  onClick={() => zoomOut()}
                  className="h-9 w-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                >
                  −
                </button>
                <button
                  onClick={() => zoomIn()}
                  className="h-9 w-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                >
                  +
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 h-9 rounded-full bg-white shadow-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {t("map.reset")}
                </button>
              </div>

              <TransformComponent>
                <div
                  ref={containerRef}
                  className={`w-full h-full relative ${
                    editMode ? "cursor-crosshair" : "cursor-default"
                  }`}
                  onMouseDown={() => {
                    dragClickGuardRef.current = false;
                  }}
                  onMouseMove={handleMove}
                  onMouseUp={stopDragging}
                  onMouseLeave={stopDragging}
                  onClick={(e) => {
                    if (dragClickGuardRef.current) {
                      dragClickGuardRef.current = false;
                      return;
                    }

                    if (!editMode || !onMapClick) return;
                    if (!containerRef.current) return;

                    const rect =
                      containerRef.current.getBoundingClientRect();
                    const x =
                      ((e.clientX - rect.left) / rect.width) * 100;
                    const y =
                      ((e.clientY - rect.top) / rect.height) * 100;
                    onMapClick(x, y);
                  }}
                >
                  <img
                    src={mapImage}
                    alt="map"
                    className="w-full h-full object-contain select-none pointer-events-none opacity-50"
                  />

                  {cameras.map((cam) => {
                    const cfg = CAMERA_TYPES[cam.type];
                    if (!cfg) return null;

                    const isTri =
                      cam.type === "upper" || cam.type === "lower";
                    const isCircle = cam.type === "cam360";
                    const selected =
                      selectedCameraId === cam.id && editMode;
                    const IconComp = cfg.icon;
                    const codeLabel = cam.code || "";

                    return (
                      <div key={cam.id}>
                        {showFovAndLabel && (
                          <>
                            {isTri && (
                              <svg
                                className="absolute overflow-visible"
                                style={{
                                  left: `${cam.x}%`,
                                  top: `${cam.y}%`,
                                }}
                              >
                                <polygon
                                  points={`0,0 ${cam.range || 140},-${
                                    (cam.range || 140) / 2.6
                                  } ${cam.range || 140},${
                                    (cam.range || 140) / 2.6
                                  }`}
                                  fill={cfg.fovFill}
                                  stroke={cfg.fovStroke}
                                  strokeWidth="2"
                                  transform={`rotate(${cam.angle || 0})`}
                                />
                              </svg>
                            )}

                            {isCircle && (
                              <svg
                                className="absolute overflow-visible"
                                style={{
                                  left: `${cam.x}%`,
                                  top: `${cam.y}%`,
                                }}
                              >
                                <circle
                                  cx="0"
                                  cy="0"
                                  r={cam.radius || 80}
                                  fill={cfg.fovFill}
                                  stroke={cfg.fovStroke}
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </>
                        )}

                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${cam.x}%`,
                            top: `${cam.y}%`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();

                            if (editMode) {
                              onSelectCamera && onSelectCamera(cam.id);
                            } else {
                              onInspectCamera && onInspectCamera(cam);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (!editMode) return;
                            onSelectCamera(cam.id);
                            setDraggingId(cam.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            if (editMode) {
                              // edit mode: mở menu xóa
                              setContextMenu({
                                open: true,
                                x: e.clientX,
                                y: e.clientY,
                                camera: cam,
                              });
                            } else {
                              // view mode: xem chi tiết ở RightPanel
                              onViewCameraDetails &&
                                onViewCameraDetails(cam);
                            }
                          }}
                          onWheel={(e) => {
                            if (!editMode || selectedCameraId !== cam.id)
                              return;
                            if (!isTri) return;
                            e.preventDefault();
                            const delta =
                              e.deltaY < 0 ? 5 : -5;
                            const newAngle = (cam.angle || 0) + delta;
                            onUpdateCamera(cam.id, {
                              angle: newAngle,
                            });
                          }}
                        >
                          {showFovAndLabel && codeLabel && (
                            <div
                              className={`
                                absolute -top-7 left-1/2 -translate-x-1/2 
                                px-3 py-1 
                                rounded-xl
                                text-[11px] font-semibold text-white
                                shadow-lg 
                                border border-black/20 
                                pointer-events-none
                                whitespace-nowrap
                                ${cfg.bgClass}
                              `}
                              style={{
                                textShadow:
                                  "0 0 4px rgba(0,0,0,0.4)",
                              }}
                            >
                              {codeLabel}
                            </div>
                          )}

                          {selected && (
                            <div className="absolute inset-0 -m-2 rounded-full border-2 border-sky-500 animate-pulse pointer-events-none" />
                          )}

                          <div className="relative flex items-center justify-center">
                            {cam.alarm && (
                              <>
                                <span className="absolute inline-flex h-10 w-10 rounded-full border-2 border-red-500 opacity-80 animate-ping" />
                                <span className="absolute inline-flex h-16 w-16 rounded-full border border-red-500 opacity-40 animate-ping [animation-delay:200ms]" />
                              </>
                            )}

                            <div
                              className={`w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center ${cfg.bgClass}`}
                            >
                              <IconComp className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TransformComponent>

              {contextMenu.open && (
                <div
                  className="fixed inset-0 z-30"
                  onClick={closeContextMenu}
                />
              )}

              {contextMenu.open && contextMenu.camera && (
                <div
                  className="
                    fixed z-40 
                    bg-white rounded-xl shadow-xl border border-slate-200
                    text-xs text-slate-700
                  "
                  style={{
                    top: contextMenu.y + 8,
                    left: contextMenu.x + 8,
                  }}
                >
                  <button
                    className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                    onClick={() => openDeleteConfirm(contextMenu.camera)}
                  >
                    {t("button.delete")}
                  </button>
                </div>
              )}

              <ConfirmDialog
                open={confirmState.open}
                title={t("delete.title")}
                description={
                  confirmState.camera
                    ? `${t("delete.descriptionPrefix")} ${
                        confirmState.camera.code || "?"
                      } ${t("delete.descriptionSuffix")}`
                    : ""
                }
                confirmLabel={t("button.delete")}
                cancelLabel={t("button.cancel")}
                onCancel={closeConfirm}
                onConfirm={handleConfirmDelete}
                variant="danger"
              />
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}
