// src/components/MapView.jsx
import { useRef, useState, useEffect, useMemo } from "react";
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
    textClass: "text-orange-500",
    fovFill: "rgba(249,115,22,0.22)",
    fovStroke: "rgba(194,65,12,0.7)",
  },
  lower: {
    icon: GiCctvCamera,
    bgClass: "bg-amber-400",
    textClass: "text-amber-400",
    fovFill: "rgba(250,204,21,0.22)",
    fovStroke: "rgba(202,138,4,0.7)",
  },
  cam360: {
    icon: TbDeviceComputerCamera,
    bgClass: "bg-sky-500",
    textClass: "text-sky-500",
    fovFill: "rgba(56,189,248,0.16)",
    fovStroke: "rgba(3,105,161,0.7)",
  },
};

// khoảng cách tối thiểu giữa tâm hai icon (đơn vị % của map)
const MIN_CENTER_DIST_PERCENT = 0.75;

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

  // NEW: danh sách cảnh báo + camera cần focus
  alerts = [],
  focusCameraCode,
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);          // 🔹 lưu scale hiện tại cho auto-zoom
  const dragClickGuardRef = useRef(false);
  const dragStartRef = useRef(null);

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

  // camera đang được hover (chỉ set khi hover vào icon)
  const [hoveredId, setHoveredId] = useState(null);

  // ref lưu control setTransform của TransformWrapper
  const controlsRef = useRef(null);

  const closeContextMenu = () =>
    setContextMenu({ open: false, x: 0, y: 0, camera: null });

  const openDeleteConfirm = (camera) => {
    closeContextMenu();

    // Nếu camera CHƯA lưu DB (không hasLayout hoặc không code),
    // thì xoá local luôn, không confirm
    if (!camera?.hasLayout || !camera?.code) {
      onDeleteCamera && onDeleteCamera(camera.id, { localOnly: true });
      return;
    }

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

  // ===== map latest alert theo camera_code (để show thumb trên icon) =====
  const latestAlertByCamera = useMemo(() => {
    const map = {};
    for (const a of alerts || []) {
      if (!a.camera_code) continue;
      const key = a.camera_code;
      const prev = map[key];
      if (!prev || (a.created_unix || 0) > (prev.created_unix || 0)) {
        map[key] = a;
      }
    }
    return map;
  }, [alerts]);

  // ===== khi focusCameraCode thay đổi -> zoom/center map đến camera =====
  useEffect(() => {
    if (!focusCameraCode) return;
    if (!containerRef.current) return;
    if (!controlsRef.current) return;

    const cam = cameras.find(
      (c) => c.code && c.code === focusCameraCode
    );
    if (
      !cam ||
      typeof cam.x !== "number" ||
      typeof cam.y !== "number"
    )
      return;

    // không dùng getBoundingClientRect để tránh double-scale
    const contentW = containerRef.current.offsetWidth || 1;
    const contentH = containerRef.current.offsetHeight || 1;

    const currentScale = scaleRef.current || 1;     // 🔹 đọc từ ref
    const targetScale = Math.max(currentScale, 2.4);

    const cx = (cam.x / 100) * contentW;
    const cy = (cam.y / 100) * contentH;

    // tính positionX/Y để điểm (cx,cy) nằm giữa màn hình
    const positionX = -(cx * targetScale - contentW / 2);
    const positionY = -(cy * targetScale - contentH / 2);

    controlsRef.current.setTransform(
      positionX,
      positionY,
      targetScale,
      300,
      "easeOut"
    );
  }, [focusCameraCode, cameras]);      // 🔹 KHÔNG còn phụ thuộc scale

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <TransformWrapper
        initialScale={1}
        minScale={0.7}
        maxScale={6}
        wheel={{ step: 0.3 }} // zoom mượt, không nhảy quá mạnh
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        onTransformed={(_ref, state) => {
          if (state && typeof state.scale === "number") {
            setScale(state.scale);
            scaleRef.current = state.scale;   // 🔹 cập nhật ref mỗi lần user zoom/pan
          }
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
          // lưu controls để useEffect dùng
          controlsRef.current = { setTransform };

          const showFov = scale > 1.05;

          // ==== UI ZOOM TUNING ====
          const zoomClamped = Math.max(0.7, Math.min(scale, 6));

          // iconScale: scale riêng cho icon camera
          const iconScale = Math.max(
            0.3,
            Math.min(1, 1 / Math.pow(zoomClamped, 0.9))
          );

          // labelScale: dùng cho label + thumbnail (font size + khoảng cách)
          const labelScale = Math.max(
            0.6,
            Math.min(1, 1 / Math.pow(zoomClamped, 0.7))
          );

          const baseOffset = 22;
          const labelOffsetPx = baseOffset * labelScale;
          const thumbOffsetPx = (baseOffset + 18) * labelScale;
          // ==== END UI ZOOM TUNING ====

          const handleReset = () => {
            resetTransform();
          };

          const handleMove = (e) => {
            // khi đang pan map
            if (e.buttons === 1) {
              dragClickGuardRef.current = true;
            }

            if (!draggingId || !editMode) return;
            if (!containerRef.current) return;

            const rect =
              containerRef.current.getBoundingClientRect();

            const cxNew = e.clientX - rect.left;
            const cyNew = e.clientY - rect.top;

            const xPercent = (cxNew / rect.width) * 100;
            const yPercent = (cyNew / rect.height) * 100;

            onUpdateCamera(draggingId, {
              x: xPercent,
              y: yPercent,
            });
          };

          const stopDragging = () => {
            if (!draggingId || !editMode) {
              setDraggingId(null);
              return;
            }

            const dragged = cameras.find(
              (c) => c.id === draggingId
            );

            if (dragged) {
              const tooClose = cameras.some((c) => {
                if (c.id === dragged.id) return false;
                if (
                  typeof c.x !== "number" ||
                  typeof c.y !== "number" ||
                  typeof dragged.x !== "number" ||
                  typeof dragged.y !== "number"
                ) {
                  return false;
                }
                const dx = c.x - dragged.x;
                const dy = c.y - dragged.y;
                const dist = Math.hypot(dx, dy);
                return dist < MIN_CENTER_DIST_PERCENT;
              });

              // nếu bị đè quá gần thì trả về vị trí ban đầu
              if (
                tooClose &&
                dragStartRef.current &&
                dragStartRef.current.id === dragged.id
              ) {
                onUpdateCamera(dragged.id, {
                  x: dragStartRef.current.x,
                  y: dragStartRef.current.y,
                });
              }
            }

            setDraggingId(null);
          };

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
                  {/* Ảnh nền bản đồ */}
                  <img
                    src={mapImage}
                    alt="map"
                    className="w-full h-full object-contain select-none pointer-events-none opacity-100"
                  />

                  {/* CAMERA + FOV */}
                  {cameras.map((cam) => {
                    const cfg = CAMERA_TYPES[cam.type];
                    if (!cfg) return null;

                    const isTri =
                      cam.type === "upper" || cam.type === "lower";
                    const isCircle = cam.type === "cam360";
                    const selected = selectedCameraId === cam.id;
                    const IconComp = cfg.icon;
                    const codeLabel = cam.code || "";

                    // alert mới nhất cho camera này
                    const activeAlert =
                      cam.code && latestAlertByCamera[cam.code];
                    const hasAlertThumb = !!activeAlert;

                    // label text nhỏ chỉ hiện khi KHÔNG có alert card
                    const showLabelForThis =
                      codeLabel &&
                      !hasAlertThumb &&
                      (selected || hoveredId === cam.id);

                    const zIndex =
                      hoveredId === cam.id
                        ? 50
                        : selected
                        ? 45
                        : 40;

                    const isOff =
                      typeof cam.status === "string" &&
                      cam.status.toLowerCase() === "off";

                    const iconBgClass = isOff
                      ? "bg-slate-400"
                      : cfg.bgClass;

                    // prefer field thumbUrl đã map ở Home; nếu không có thì thôi
                    const thumbUrl = activeAlert?.thumbUrl || null;

                    return (
                      <div key={cam.id}>
                        {/* FOV */}
                        {showFov && !isOff && (
                          <>
                            {isTri && (
                              <svg
                                className="absolute overflow-visible pointer-events-none"
                                style={{
                                  left: `${cam.x}%`,
                                  top: `${cam.y}%`,
                                }}
                              >
                                <polygon
                                  points={`0,0 ${cam.range || 100},-${
                                    (cam.range || 100) / 2.6
                                  } ${cam.range || 100},${
                                    (cam.range || 100) / 2.6
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
                                className="absolute overflow-visible pointer-events-none"
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

                        {/* WRAPPER camera */}
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                          style={{
                            left: `${cam.x}%`,
                            top: `${cam.y}%`,
                            zIndex,
                          }}
                        >
                          {/* LABEL CODE */}
                          {showLabelForThis && (
                            <div
                              className={`
                                absolute left-1/2 -translate-x-1/2 
                                px-2.5 py-0.5 rounded-full
                                text-[11px] font-semibold
                                text-white shadow-md border border-black/10
                                pointer-events-none whitespace-nowrap
                                ${iconBgClass}
                              `}
                              style={{
                                fontSize: `${11 * labelScale}px`,
                                top: `${-labelOffsetPx}px`,
                              }}
                            >
                              {codeLabel}
                            </div>
                          )}

                          {/* THUMBNAIL CẢNH BÁO */}
                          {thumbUrl && (
                            <div
                              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                              style={{
                                top: `${-thumbOffsetPx}px`,
                              }}
                            >
                              <div
                                className="rounded-md overflow-hidden border border-white shadow-md bg-black/60"
                                style={{
                                  width: `${64 * labelScale}px`,
                                  height: `${40 * labelScale}px`,
                                }}
                              >
                                <img
                                  src={thumbUrl}
                                  alt={`Alert ${activeAlert.camera_code}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}

                          {/* ICON + SELECT RING + ALERT */}
                          <div
                            className="relative flex items-center justify-center pointer-events-auto"
                            style={{
                              transform: `scale(${iconScale})`,
                              transformOrigin: "center center",
                            }}
                            onMouseEnter={() => setHoveredId(cam.id)}
                            onMouseLeave={() =>
                              setHoveredId((prev) =>
                                prev === cam.id ? null : prev
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!editMode) return;
                              if (!onSelectCamera) return;

                              if (selectedCameraId === cam.id) {
                                onSelectCamera(null);
                              } else {
                                onSelectCamera(cam.id);
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (editMode) return;
                              if (onInspectCamera) {
                                onInspectCamera(cam);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (editMode) {
                                setContextMenu({
                                  open: true,
                                  x: e.clientX,
                                  y: e.clientY,
                                  camera: cam,
                                });
                              } else {
                                onViewCameraDetails &&
                                  onViewCameraDetails(cam);
                              }
                            }}
                            onWheel={(e) => {
                              if (
                                !editMode ||
                                selectedCameraId !== cam.id
                              )
                                return;
                              if (!isTri) return;
                              e.preventDefault();
                              e.stopPropagation(); // chặn zoom map khi xoay FOV
                              const delta = e.deltaY < 0 ? 5 : -5;
                              const newAngle =
                                (cam.angle || 0) + delta;
                              onUpdateCamera(cam.id, {
                                angle: newAngle,
                              });
                            }}
                          >
                            {/* Vòng chọn khi selected – chỉ visual */}
                            {selected && (
                              <div className="pointer-events-none absolute inset-0 -m-1 rounded-full border-2 border-sky-500" />
                            )}

                            {/* Alarm – animation đỏ */}
                            {cam.alarm && (
                              <div
                                className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10 overflow-visible"
                                aria-hidden="true"
                              >
                                <span className="pointer-events-none inline-flex h-10 w-10 rounded-full border-2 border-red-500 opacity-80 animate-ping" />
                                <span className="pointer-events-none absolute inline-flex h-16 w-16 rounded-full border border-red-500 opacity-40 animate-ping [animation-delay:200ms]" />
                              </div>
                            )}

                            {/* ICON – drag / click */}
                            <div
                              className={`relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center ${iconBgClass}`}
                              style={{
                                cursor: editMode ? "grab" : "pointer",
                              }}
                              onMouseDown={(e) => {
                                if (!editMode) return;
                                e.stopPropagation();
                                dragClickGuardRef.current = false;
                                setDraggingId(cam.id);
                                dragStartRef.current = {
                                  id: cam.id,
                                  x: cam.x ?? 0,
                                  y: cam.y ?? 0,
                                };
                              }}
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
                    onClick={() =>
                      openDeleteConfirm(contextMenu.camera)
                    }
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
