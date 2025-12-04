// // src/components/MapView.jsx
// import { useRef, useState, useEffect, useMemo } from "react";
// import {
//   TransformWrapper,
//   TransformComponent,
// } from "react-zoom-pan-pinch";
// import { GiCctvCamera } from "react-icons/gi";
// import { TbDeviceComputerCamera } from "react-icons/tb";
// import { useTranslation } from "react-i18next";
// import ConfirmDialog from "./ConfirmDialog";

// const CAMERA_TYPES = {
//   upper: {
//     icon: GiCctvCamera,
//     bgClass: "bg-orange-500",
//     textClass: "text-orange-500",
//     fovFill: "rgba(249,115,22,0.22)",
//     fovStroke: "rgba(194,65,12,0.7)",
//     lineColor: "#f97316", // 🔸 orange-500
//   },
//   lower: {
//     icon: GiCctvCamera,
//     bgClass: "bg-amber-400",
//     textClass: "text-amber-400",
//     fovFill: "rgba(250,204,21,0.22)",
//     fovStroke: "rgba(202,138,4,0.7)",
//     lineColor: "#fbbf24", // 🔸 amber-400
//   },
//   cam360: {
//     icon: TbDeviceComputerCamera,
//     bgClass: "bg-sky-500",
//     textClass: "text-sky-500",
//     fovFill: "rgba(56,189,248,0.16)",
//     fovStroke: "rgba(3,105,161,0.7)",
//     lineColor: "#0ea5e9", // 🔹 sky-500
//   },
// };

// // khoảng cách tối thiểu giữa 2 camera (theo %)
// const MIN_CENTER_DIST_PERCENT = 0.3;

// // màu alert theo event_code
// const ALERT_COLOR_BY_EVENT = {
//   fire: "#ef4444", // đỏ đậm
//   intruder: "#facc15", // vàng
//   smartphone: "#22c55e", // xanh lá
//   default: "#ef4444",
// };

// export default function MapView({
//   mapImage,
//   cameras,
//   editMode,
//   selectedCameraId,
//   onMapClick,
//   onSelectCamera,
//   onUpdateCamera,
//   onDeleteCamera,
//   onInspectCamera,
//   onViewCameraDetails,
//   alerts = [],
//   focusCameraCode,
//   // info để vẽ line tether tới floating inspector
//   inspectorLink,
// }) {
//   const containerRef = useRef(null);
//   const [draggingId, setDraggingId] = useState(null);
//   const [scale, setScale] = useState(1);
//   const scaleRef = useRef(1);
//   const dragClickGuardRef = useRef(false);
//   const dragStartRef = useRef(null);

//   const { t } = useTranslation("common");

//   const [contextMenu, setContextMenu] = useState({
//     open: false,
//     x: 0,
//     y: 0,
//     camera: null,
//   });

//   const [confirmState, setConfirmState] = useState({
//     open: false,
//     camera: null,
//   });

//   const [hoveredId, setHoveredId] = useState(null);
//   const controlsRef = useRef(null);

//   // nhớ camera đã auto-focus rồi
//   const lastFocusRef = useRef(null);

//   // ref DOM cho từng camera icon để tính toạ độ thật trên màn hình
//   const cameraRefs = useRef({});

//   // state tether line (viewport coords)
//   const [inspectorLine, setInspectorLine] = useState(null);

//   const closeContextMenu = () =>
//     setContextMenu({ open: false, x: 0, y: 0, camera: null });

//   const openDeleteConfirm = (camera) => {
//     closeContextMenu();
//     if (!camera?.hasLayout || !camera?.code) {
//       onDeleteCamera && onDeleteCamera(camera.id, { localOnly: true });
//       return;
//     }
//     setConfirmState({ open: true, camera });
//   };

//   const closeConfirm = () =>
//     setConfirmState({ open: false, camera: null });

//   const handleConfirmDelete = () => {
//     if (confirmState.camera && onDeleteCamera) {
//       onDeleteCamera(confirmState.camera.id);
//     }
//     closeConfirm();
//   };

//   // alert mới nhất cho từng camera_code
//   const latestAlertByCamera = useMemo(() => {
//     const map = {};
//     for (const a of alerts || []) {
//       if (!a.camera_code) continue;
//       const key = a.camera_code;
//       const prev = map[key];
//       if (!prev || (a.created_unix || 0) > (prev.created_unix || 0)) {
//         map[key] = a;
//       }
//     }
//     return map;
//   }, [alerts]);

//   // ---- Hotkey: Delete selected camera (bỏ qua khi đang gõ input) ----
//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (!editMode) return;
//       if (!selectedCameraId) return;

//       const tag = (e.target && e.target.tagName) || "";
//       if (
//         tag === "INPUT" ||
//         tag === "TEXTAREA" ||
//         tag === "SELECT" ||
//         e.target.isContentEditable
//       ) {
//         return;
//       }

//       if (e.key === "Delete" || e.key === "Backspace") {
//         e.preventDefault();

//         const cam = cameras.find((c) => c.id === selectedCameraId);
//         if (!cam) return;

//         if (!cam.hasLayout || !cam.code) {
//           onDeleteCamera && onDeleteCamera(cam.id, { localOnly: true });
//           return;
//         }

//         setConfirmState({ open: true, camera: cam });
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [editMode, selectedCameraId, cameras, onDeleteCamera]);

//   // auto-zoom tới camera khi click alert
//   useEffect(() => {
//     if (!focusCameraCode) {
//       lastFocusRef.current = null;
//       return;
//     }
//     if (!containerRef.current || !controlsRef.current) return;

//     if (lastFocusRef.current === focusCameraCode) {
//       return;
//     }
//     lastFocusRef.current = focusCameraCode;

//     const cam = cameras.find(
//       (c) => c.code && c.code === focusCameraCode
//     );
//     if (
//       !cam ||
//       typeof cam.x !== "number" ||
//       typeof cam.y !== "number"
//     )
//       return;

//     const contentW = containerRef.current.offsetWidth || 1;
//     const contentH = containerRef.current.offsetHeight || 1;

//     const currentScale = scaleRef.current || 1;
//     const targetScale = Math.max(currentScale, 2.4);

//     const cx = (cam.x / 100) * contentW;
//     const cy = (cam.y / 100) * contentH;

//     const positionX = -(cx * targetScale - contentW / 2);
//     const positionY = -(cy * targetScale - contentH / 2);

//     controlsRef.current.setTransform(
//       positionX,
//       positionY,
//       targetScale,
//       300,
//       "easeOut"
//     );
//   }, [focusCameraCode, cameras]);

//   // hàm tính lại toạ độ line (viewport) từ camera → inspector
//   const recalcInspectorLine = (linkOverride) => {
//     const link = linkOverride ?? inspectorLink;

//     if (!link || !link.cameraId) {
//       setInspectorLine(null);
//       return;
//     }

//     const cam = cameras.find((c) => c.id === link.cameraId);
//     const camEl = cameraRefs.current[link.cameraId];

//     if (!cam || !camEl) {
//       setInspectorLine(null);
//       return;
//     }

//     const rect = camEl.getBoundingClientRect();
//     // tâm icon (viewport)
//     const cx = rect.left + rect.width / 2;
//     const cy = rect.top + rect.height / 2;

//     const x2 = link.centerX;
//     const y2 = link.centerY;

//     const dx = x2 - cx;
//     const dy = y2 - cy;
//     const dist = Math.hypot(dx, dy) || 1;

//     // bán kính icon ~ nửa kích thước + chút đệm (line bắt đầu ngoài mép icon)
//     const iconRadius = rect.width / 2 + 4;
//     const x1 = cx + (dx / dist) * iconRadius;
//     const y1 = cy + (dy / dist) * iconRadius;

//     const cfg = CAMERA_TYPES[cam.type] || {};

//     // 👉 nếu camera OFF thì line màu xám
//     const isOff =
//       typeof cam.status === "string" &&
//       cam.status.toLowerCase() === "off";

//     let color =
//       cfg.lineColor || cfg.fovStroke || "rgba(15,23,42,0.9)";

//     if (isOff) {
//       // gray-400
//       color = "#9ca3af";
//     }

//     setInspectorLine({ x1, y1, x2, y2, color });
//   };

//   // khi inspectorLink hoặc cameras đổi → tính lại line
//   useEffect(() => {
//     recalcInspectorLine();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [inspectorLink, cameras]);

//   return (
//     <div className="absolute inset-0 overflow-hidden bg-white">
//       <TransformWrapper
//         initialScale={1}
//         minScale={0.7}
//         maxScale={8}
//         wheel={{ step: 0.3 }}
//         doubleClick={{ disabled: true }}
//         panning={{ velocityDisabled: true }}
//         onTransformed={(_ref, state) => {
//           if (state && typeof state.scale === "number") {
//             setScale(state.scale);
//             scaleRef.current = state.scale;
//           }
//           // zoom / pan → update line
//           recalcInspectorLine();
//         }}
//       >
//         {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
//           controlsRef.current = { setTransform };

//           const showFov = scale > 1.05;
//           const zoomClamped = Math.max(0.8, Math.min(scale, 6));

//           const iconScale = Math.max(
//             0.1,
//             Math.min(1, 1 / Math.pow(zoomClamped, 0.8))
//           );

//           const labelScale = Math.max(
//             0.1,
//             Math.min(1, 1 / Math.pow(zoomClamped, 0.7))
//           );

//           const baseOffset = 22;
//           const labelOffsetPx = baseOffset * labelScale;
//           const thumbOffsetPx = (baseOffset + 30) * labelScale;

//           const handleReset = () => {
//             resetTransform();
//           };

//           const handleMove = (e) => {
//             if (e.buttons === 1) {
//               dragClickGuardRef.current = true;
//             }

//             if (!draggingId || !editMode) return;
//             if (!containerRef.current) return;

//             const rect =
//               containerRef.current.getBoundingClientRect();

//             const cxNew = e.clientX - rect.left;
//             const cyNew = e.clientY - rect.top;

//             const xPercent = (cxNew / rect.width) * 100;
//             const yPercent = (cyNew / rect.height) * 100;

//             onUpdateCamera(draggingId, {
//               x: xPercent,
//               y: yPercent,
//             });
//           };

//           const stopDragging = () => {
//             if (!draggingId || !editMode) {
//               setDraggingId(null);
//               return;
//             }

//             const dragged = cameras.find(
//               (c) => c.id === draggingId
//             );

//             if (dragged) {
//               const tooClose = cameras.some((c) => {
//                 if (c.id === dragged.id) return false;
//                 if (
//                   typeof c.x !== "number" ||
//                   typeof c.y !== "number" ||
//                   typeof dragged.x !== "number" ||
//                   typeof dragged.y !== "number"
//                 ) {
//                   return false;
//                 }
//                 const dx = c.x - dragged.x;
//                 const dy = c.y - dragged.y;
//                 const dist = Math.hypot(dx, dy);
//                 return dist < MIN_CENTER_DIST_PERCENT;
//               });

//               if (
//                 tooClose &&
//                 dragStartRef.current &&
//                 dragStartRef.current.id === dragged.id
//               ) {
//                 onUpdateCamera(dragged.id, {
//                   x: dragStartRef.current.x,
//                   y: dragStartRef.current.y,
//                 });
//               }
//             }

//             setDraggingId(null);
//           };

//           return (
//             <>
//               {/* Controls zoom góc trái dưới */}
//               <div className="absolute left-4 bottom-4 z-20 flex gap-2">
//                 <button
//                   onClick={() => zoomOut()}
//                   className="h-9 w-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
//                 >
//                   −
//                 </button>
//                 <button
//                   onClick={() => zoomIn()}
//                   className="h-9 w-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
//                 >
//                   +
//                 </button>
//                 <button
//                   onClick={handleReset}
//                   className="px-3 h-9 rounded-full bg-white shadow-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
//                 >
//                   {t("map.reset")}
//                 </button>
//               </div>

//               {/* ⬇⬇ THAY ĐOẠN NÀY: khung map aspect ratio 9187/4448 */}
//               <TransformComponent
//                 wrapperClass="w-full h-full"
//                 contentClass="w-full h-full"
//               >
//                 <div className="w-full h-full flex items-center justify-center">
//                   <div
//                     ref={containerRef}
//                     className={`relative ${
//                       editMode ? "cursor-crosshair" : "cursor-default"
//                     }`}
//                     style={{
//                       aspectRatio: "9187 / 4448",
//                       width: "100%",
//                       maxHeight: "100%",
//                     }}
//                     onMouseDown={() => {
//                       dragClickGuardRef.current = false;
//                     }}
//                     onMouseMove={handleMove}
//                     onMouseUp={stopDragging}
//                     onMouseLeave={stopDragging}
//                     onClick={(e) => {
//                       if (dragClickGuardRef.current) {
//                         dragClickGuardRef.current = false;
//                         return;
//                       }

//                       if (!editMode || !onMapClick) return;
//                       if (!containerRef.current) return;

//                       const rect =
//                         containerRef.current.getBoundingClientRect();
//                       const x =
//                         ((e.clientX - rect.left) / rect.width) * 100;
//                       const y =
//                         ((e.clientY - rect.top) / rect.height) * 100;
//                       onMapClick(x, y);
//                     }}
//                   >
//                     <img
//                       src={mapImage}
//                       alt="map"
//                       className="w-full h-full select-none pointer-events-none opacity-100"
//                     />

//                     {/* FOV + ICONS */}
//                     {cameras.map((cam) => {
//                       const cfg = CAMERA_TYPES[cam.type];
//                       if (!cfg) return null;

//                       const isTri =
//                         cam.type === "upper" || cam.type === "lower";
//                       const isCircle = cam.type === "cam360";

//                       const selected = selectedCameraId === cam.id;
//                       const IconComp = cfg.icon;
//                       const codeLabel = cam.code || "";

//                       const activeAlert =
//                         cam.code && latestAlertByCamera[cam.code];
//                       const hasAlertThumb = !!activeAlert;

//                       // màu alert theo event_code
//                       const eventCode =
//                         cam.alertCode?.toLowerCase() || null;

//                       const alertColor = eventCode
//                         ? ALERT_COLOR_BY_EVENT[eventCode] ||
//                           ALERT_COLOR_BY_EVENT.default
//                         : ALERT_COLOR_BY_EVENT.default;

//                       // ✅ camera có alert + thumbnail vẫn hover ra label
//                       const thumbURL = cam.alertThumb;

//                       const showLabelForThis =
//                         codeLabel &&
//                         !thumbURL && // ✔ ẩn label khi có thumbnail
//                         (selected || hoveredId === cam.id);

//                       // z-index: alert luôn cao nhất
//                       let zIndex = 40;
//                       if (cam.alarm) zIndex += 30; // camera đang alert → đẩy lên trên cùng
//                       if (selected) zIndex += 10;
//                       if (hoveredId === cam.id) zIndex += 20;

//                       const isOff =
//                         typeof cam.status === "string" &&
//                         cam.status.toLowerCase() === "off";

//                       const iconBgClass = isOff
//                         ? "bg-slate-400"
//                         : cfg.bgClass;

//                       const thumbUrl = cam.alertThumb;

//                       return (
//                         <div key={cam.id}>
//                           {showFov && !isOff && (
//                             <>
//                               {isTri && (
//                                 <svg
//                                   className="absolute overflow-visible pointer-events-none"
//                                   style={{
//                                     left: `${cam.x}%`,
//                                     top: `${cam.y}%`,
//                                   }}
//                                 >
//                                   <polygon
//                                     points={`0,0 ${cam.range || 100},-${
//                                       (cam.range || 100) / 2.6
//                                     } ${cam.range || 100},${
//                                       (cam.range || 100) / 2.6
//                                     }`}
//                                     fill={cfg.fovFill}
//                                     stroke={cfg.fovStroke}
//                                     strokeWidth="2"
//                                     transform={`rotate(${cam.angle || 0})`}
//                                   />
//                                 </svg>
//                               )}

//                               {isCircle && (
//                                 <svg
//                                   className="absolute overflow-visible pointer-events-none"
//                                   style={{
//                                     left: `${cam.x}%`,
//                                     top: `${cam.y}%`,
//                                   }}
//                                 >
//                                   <circle
//                                     cx="0"
//                                     cy="0"
//                                     r={cam.radius || 80}
//                                     fill={cfg.fovFill}
//                                     stroke={cfg.fovStroke}
//                                     strokeWidth="2"
//                                   />
//                                 </svg>
//                               )}
//                             </>
//                           )}

//                           {/* ICON + LABEL + THUMB */}
//                           <div
//                             className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
//                             style={{
//                               left: `${cam.x}%`,
//                               top: `${cam.y}%`,
//                               zIndex,
//                             }}
//                           >
//                             {showLabelForThis && (
//                               <div
//                                 className={`
//                                   absolute left-1/2 -translate-x-1/2 
//                                   px-2.5 py-0.5 rounded-full
//                                   text-[11px] font-semibold
//                                   text-white shadow-md border border-black/10
//                                   pointer-events-none whitespace-nowrap
//                                   ${iconBgClass}
//                                 `}
//                                 style={{
//                                   fontSize: `${11 * labelScale}px`,
//                                   top: `${-labelOffsetPx}px`,
//                                 }}
//                               >
//                                 {codeLabel}
//                               </div>
//                             )}

//                             {thumbUrl && (
//                               <div
//                                 className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
//                                 style={{
//                                   top: `${-thumbOffsetPx}px`,
//                                 }}
//                               >
//                                 <div
//                                   className="rounded-md overflow-hidden border shadow-md bg-black/60"
//                                   style={{
//                                     width: `${40 * labelScale}px`,
//                                     height: `${64 * labelScale}px`,
//                                     borderColor: alertColor,
//                                   }}
//                                 >
//                                   <img
//                                     src={thumbUrl}
//                                     alt={`Alert ${activeAlert.camera_code}`}
//                                     className="w-full h-full object-cover"
//                                   />
//                                 </div>
//                               </div>
//                             )}

//                             {/* wrapper icon - gán ref để tính toạ độ tether */}
//                             <div
//                               ref={(el) => {
//                                 if (el) {
//                                   cameraRefs.current[cam.id] = el;
//                                 } else {
//                                   delete cameraRefs.current[cam.id];
//                                 }
//                               }}
//                               className="relative flex items-center justify-center pointer-events-auto"
//                               style={{
//                                 transform: `scale(${iconScale})`,
//                                 transformOrigin: "center center",
//                               }}
//                               onMouseEnter={() => setHoveredId(cam.id)}
//                               onMouseLeave={() =>
//                                 setHoveredId((prev) =>
//                                   prev === cam.id ? null : prev
//                                 )
//                               }
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 if (editMode) {
//                                   if (!onSelectCamera) return;
//                                   if (selectedCameraId === cam.id) {
//                                     onSelectCamera(null);
//                                   } else {
//                                     onSelectCamera(cam.id);
//                                   }
//                                 } else if (onInspectCamera) {
//                                   onInspectCamera(cam);
//                                 }
//                               }}
//                               onDoubleClick={(e) => {
//                                 e.stopPropagation();
//                                 if (editMode) return;
//                                 if (onViewCameraDetails) {
//                                   onViewCameraDetails(cam);
//                                 }
//                               }}
//                               onContextMenu={(e) => {
//                                 e.preventDefault();
//                                 e.stopPropagation();

//                                 if (editMode) {
//                                   setContextMenu({
//                                     open: true,
//                                     x: e.clientX,
//                                     y: e.clientY,
//                                     camera: cam,
//                                   });
//                                 } else if (onViewCameraDetails) {
//                                   onViewCameraDetails(cam);
//                                 }
//                               }}
//                               onWheel={(e) => {
//                                 const isTriLocal =
//                                   cam.type === "upper" ||
//                                   cam.type === "lower";
//                                 if (
//                                   !editMode ||
//                                   selectedCameraId !== cam.id ||
//                                   !isTriLocal
//                                 )
//                                   return;
//                                 e.preventDefault();
//                                 e.stopPropagation();
//                                 const delta = e.deltaY < 0 ? 5 : -5;
//                                 const newAngle =
//                                   (cam.angle || 0) + delta;
//                                 onUpdateCamera(cam.id, {
//                                   angle: newAngle,
//                                 });
//                               }}
//                             >
//                               {selected && (
//                                 <div className="pointer-events-none absolute inset-0 -m-1 rounded-full border-2 border-sky-500" />
//                               )}

//                               {/* Vòng alert: màu theo event_code */}
//                               {cam.alarm && (
//                                 <div
//                                   className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10 overflow-visible"
//                                   aria-hidden="true"
//                                 >
//                                   <span
//                                     className="pointer-events-none inline-flex h-10 w-10 rounded-full border-2 opacity-80 animate-ping"
//                                     style={{ borderColor: alertColor }}
//                                   />
//                                   <span
//                                     className="pointer-events-none absolute inline-flex h-16 w-16 rounded-full border opacity-40 animate-ping [animation-delay:200ms]"
//                                     style={{ borderColor: alertColor }}
//                                   />
//                                 </div>
//                               )}

//                               <div
//                                 className={`relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center ${iconBgClass}`}
//                                 style={{
//                                   cursor: editMode ? "grab" : "pointer",
//                                 }}
//                                 onMouseDown={(e) => {
//                                   if (!editMode) return;
//                                   e.stopPropagation();
//                                   dragClickGuardRef.current = false;
//                                   setDraggingId(cam.id);
//                                   dragStartRef.current = {
//                                     id: cam.id,
//                                     x: cam.x ?? 0,
//                                     y: cam.y ?? 0,
//                                   };
//                                 }}
//                               >
//                                 <IconComp className="w-5 h-5 text-white" />
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               </TransformComponent>
//               {/* ⬆⬆ HẾT PHẦN MAP */}

//               {contextMenu.open && (
//                 <div
//                   className="fixed inset-0 z-30"
//                   onClick={closeContextMenu}
//                 />
//               )}

//               {contextMenu.open && contextMenu.camera && (
//                 <div
//                   className="
//                     fixed z-40 
//                     bg-white rounded-xl shadow-xl border border-slate-200
//                     text-xs text-slate-700
//                   "
//                   style={{
//                     top: contextMenu.y + 8,
//                     left: contextMenu.x + 8,
//                   }}
//                 >
//                   <button
//                     className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
//                     onClick={() =>
//                       openDeleteConfirm(contextMenu.camera)
//                     }
//                   >
//                     {t("button.delete")}
//                   </button>
//                 </div>
//               )}

//               <ConfirmDialog
//                 open={confirmState.open}
//                 title={t("delete.title")}
//                 description={
//                   confirmState.camera
//                     ? `${t("delete.descriptionPrefix")} ${
//                         confirmState.camera.code || "?"
//                       } ${t("delete.descriptionSuffix")}`
//                     : ""
//                 }
//                 confirmLabel={t("button.delete")}
//                 cancelLabel={t("button.cancel")}
//                 onCancel={closeConfirm}
//                 onConfirm={handleConfirmDelete}
//                 variant="danger"
//               />
//             </>
//           );
//         }}
//       </TransformWrapper>

//       {/* SVG tether line: theo toạ độ viewport, nhưng line bắt đầu *ngoài* icon */}
//       {inspectorLine && (
//         <svg
//           className="pointer-events-none fixed inset-0 z-30"
//           width="100%"
//           height="100%"
//         >
//           <line
//             x1={inspectorLine.x1}
//             y1={inspectorLine.y1}
//             x2={inspectorLine.x2}
//             y2={inspectorLine.y2}
//             stroke={inspectorLine.color}
//             strokeWidth="3"
//             strokeLinecap="round"
//           />
//           {/* DOT ở inspector */}
//           <circle
//             cx={inspectorLine.x2}
//             cy={inspectorLine.y2}
//             r="5"
//             fill="#0f172a"
//           />
//           <circle
//             cx={inspectorLine.x2}
//             cy={inspectorLine.y2}
//             r="3"
//             fill={inspectorLine.color}
//           />
//         </svg>
//       )}
//     </div>
//   );
// }
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
    lineColor: "#f97316", // 🔸 orange-500
  },
  lower: {
    icon: GiCctvCamera,
    bgClass: "bg-amber-400",
    textClass: "text-amber-400",
    fovFill: "rgba(250,204,21,0.22)",
    fovStroke: "rgba(202,138,4,0.7)",
    lineColor: "#fbbf24", // 🔸 amber-400
  },
  cam360: {
    icon: TbDeviceComputerCamera,
    bgClass: "bg-sky-500",
    textClass: "text-sky-500",
    fovFill: "rgba(56,189,248,0.16)",
    fovStroke: "rgba(3,105,161,0.7)",
    lineColor: "#0ea5e9", // 🔹 sky-500
  },
};

// khoảng cách tối thiểu giữa 2 camera (theo %)
const MIN_CENTER_DIST_PERCENT = 0.3;

// màu alert theo event_code
const ALERT_COLOR_BY_EVENT = {
  fire: "#ef4444", // đỏ đậm
  intruder: "#facc15", // vàng
  smartphone: "#22c55e", // xanh lá
  default: "#3503ffff",
};

// các chế độ filter
const FILTER_OPTIONS = [
  { value: "all", key: "filter.all" },
  { value: "upper", key: "filter.upper" },
  { value: "lower", key: "filter.lower" },
  { value: "cam360", key: "filter.cam360" }
  // ,{ value: "status_on", key: "filter.statusOn" },
  // { value: "status_off", key: "filter.statusOff" },
];

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
  alerts = [],
  focusCameraCode,
  // info để vẽ line tether tới floating inspector
  inspectorLink,
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
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

  const [hoveredId, setHoveredId] = useState(null);
  const controlsRef = useRef(null);

  // nhớ camera đã auto-focus rồi
  const lastFocusRef = useRef(null);

  // ref DOM cho từng camera icon để tính toạ độ thật trên màn hình
  const cameraRefs = useRef({});

  // state tether line (viewport coords)
  const [inspectorLine, setInspectorLine] = useState(null);

  // ====== FILTER STATE (chỉ dùng cho view mode) ======
  const [filterMode, setFilterMode] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const closeContextMenu = () =>
    setContextMenu({ open: false, x: 0, y: 0, camera: null });

  const openDeleteConfirm = (camera) => {
    closeContextMenu();
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

  // alert mới nhất cho từng camera_code
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

  // ---- Hotkey: Delete selected camera (bỏ qua khi đang gõ input) ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editMode) return;
      if (!selectedCameraId) return;

      const tag = (e.target && e.target.tagName) || "";
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();

        const cam = cameras.find((c) => c.id === selectedCameraId);
        if (!cam) return;

        if (!cam.hasLayout || !cam.code) {
          onDeleteCamera && onDeleteCamera(cam.id, { localOnly: true });
          return;
        }

        setConfirmState({ open: true, camera: cam });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editMode, selectedCameraId, cameras, onDeleteCamera]);

  // auto-zoom tới camera khi click alert
  useEffect(() => {
    if (!focusCameraCode) {
      lastFocusRef.current = null;
      return;
    }
    if (!containerRef.current || !controlsRef.current) return;

    if (lastFocusRef.current === focusCameraCode) {
      return;
    }
    lastFocusRef.current = focusCameraCode;

    const cam = cameras.find(
      (c) => c.code && c.code === focusCameraCode
    );
    if (
      !cam ||
      typeof cam.x !== "number" ||
      typeof cam.y !== "number"
    )
      return;

    const contentW = containerRef.current.offsetWidth || 1;
    const contentH = containerRef.current.offsetHeight || 1;

    const currentScale = scaleRef.current || 1;
    const targetScale = Math.max(currentScale, 2.4);

    const cx = (cam.x / 100) * contentW;
    const cy = (cam.y / 100) * contentH;

    const positionX = -(cx * targetScale - contentW / 2);
    const positionY = -(cy * targetScale - contentH / 2);

    controlsRef.current.setTransform(
      positionX,
      positionY,
      targetScale,
      300,
      "easeOut"
    );
  }, [focusCameraCode, cameras]);

  // hàm tính lại toạ độ line (viewport) từ camera → inspector
  const recalcInspectorLine = (linkOverride) => {
    const link = linkOverride ?? inspectorLink;

    if (!link || !link.cameraId) {
      setInspectorLine(null);
      return;
    }

    const cam = cameras.find((c) => c.id === link.cameraId);
    const camEl = cameraRefs.current[link.cameraId];

    if (!cam || !camEl) {
      setInspectorLine(null);
      return;
    }

    const rect = camEl.getBoundingClientRect();
    // tâm icon (viewport)
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const x2 = link.centerX;
    const y2 = link.centerY;

    const dx = x2 - cx;
    const dy = y2 - cy;
    const dist = Math.hypot(dx, dy) || 1;

    // bán kính icon ~ nửa kích thước + chút đệm (line bắt đầu ngoài mép icon)
    const iconRadius = rect.width / 2 + 4;
    const x1 = cx + (dx / dist) * iconRadius;
    const y1 = cy + (dy / dist) * iconRadius;

    const cfg = CAMERA_TYPES[cam.type] || {};

    // 👉 TẠM THỜI KHÔNG ĐỔI MÀU LINE KHI CAMERA OFF
    // const isOff =
    //   typeof cam.status === "string" &&
    //   cam.status.toLowerCase() === "off";

    let color =
      cfg.lineColor || cfg.fovStroke || "rgba(15,23,42,0.9)";

    // if (isOff) {
    //   // gray-400
    //   color = "#9ca3af";
    // }

    setInspectorLine({ x1, y1, x2, y2, color });
  };

  // khi inspectorLink hoặc cameras đổi → tính lại line
  useEffect(() => {
    recalcInspectorLine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectorLink, cameras]);

  // ====== Áp filter lên danh sách camera để vẽ map ======
  const filteredCameras = useMemo(() => {
    if (!cameras) return [];
    if (editMode) {
      // Trong edit mode luôn hiển thị tất cả để dễ chỉnh layout
      return cameras;
    }

    if (filterMode === "all") return cameras;

    return cameras.filter((cam) => {
      const status =
        typeof cam.status === "string"
          ? cam.status.toLowerCase()
          : "";

      const isOff = status === "off";
      const isOn = !isOff;

      switch (filterMode) {
        case "upper":
        case "lower":
        case "cam360":
          return cam.type === filterMode;
        case "status_on":
          return isOn;
        case "status_off":
          return isOff;
        default:
          return true;
      }
    });
  }, [cameras, filterMode, editMode]);

  // Label hiện trên nút filter
  const currentFilterLabel =
    FILTER_OPTIONS.find((f) => f.value === filterMode)?.key
      ? t(
          FILTER_OPTIONS.find((f) => f.value === filterMode).key
        )
      : t("filter.all");

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <TransformWrapper
        initialScale={1}
        minScale={0.85}
        maxScale={8}
        wheel={{ step: 0.3 }}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        onTransformed={(_ref, state) => {
          if (state && typeof state.scale === "number") {
            setScale(state.scale);
            scaleRef.current = state.scale;
          }
          // zoom / pan → update line
          recalcInspectorLine();
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
          controlsRef.current = { setTransform };

          const showFov = scale > 1.05;
          const zoomClamped = Math.max(0.8, Math.min(scale, 6));

          const iconScale = Math.max(
            0.1,
            Math.min(1, 1 / Math.pow(zoomClamped, 0.8))
          );

          const labelScale = Math.max(
            0.1,
            Math.min(1, 1 / Math.pow(zoomClamped, 0.7))
          );

          const baseOffset = 22;
          const labelOffsetPx = baseOffset * labelScale;
          const thumbOffsetPx = (baseOffset + 30) * labelScale;

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
              <div className="absolute left-4 bottom-4 z-20 flex gap-2 items-center">
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

                {/* Nút FILTER – chỉ hiển thị khi view mode */}
                {!editMode && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setFilterOpen((open) => !open)
                      }
                      className="px-3 h-9 rounded-full bg-white shadow-md border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="truncate max-w-[160px]">
                        {currentFilterLabel}
                      </span>
                    </button>

                    {filterOpen && (
                      <div className="absolute bottom-11 left-0 z-30 bg-white rounded-xl shadow-xl border border-slate-200 text-xs text-slate-700 min-w-[220px] overflow-hidden">
                        {FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setFilterMode(opt.value);
                              setFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${
                              filterMode === opt.value
                                ? "bg-slate-100 font-semibold"
                                : ""
                            }`}
                          >
                            <span>{t(opt.key)}</span>

                            {filterMode === opt.value && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ⬇⬇ KHUNG MAP */}
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    ref={containerRef}
                    className={`relative ${
                      editMode ? "cursor-crosshair" : "cursor-default"
                    }`}
                    style={{
                      aspectRatio: "9187 / 4448",
                      width: "100%",
                      maxHeight: "100%",
                    }}
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
                      className="w-full h-full select-none pointer-events-none opacity-100"
                    />

                    {/* FOV + ICONS */}
                    {filteredCameras.map((cam) => {
                      const cfg = CAMERA_TYPES[cam.type];
                      if (!cfg) return null;

                      const isTri =
                        cam.type === "upper" || cam.type === "lower";
                      const isCircle = cam.type === "cam360";

                      const selected = selectedCameraId === cam.id;
                      const IconComp = cfg.icon;
                      const codeLabel = cam.code || "";

                      // const activeAlert =
                      //   cam.code && latestAlertByCamera[cam.code];
                      // const hasAlertThumb = !!activeAlert;

                      // màu alert theo event_code
                      const eventCode =
                        cam.alertCode?.toLowerCase() || null;

                      const alertColor = eventCode
                        ? ALERT_COLOR_BY_EVENT[eventCode] ||
                          ALERT_COLOR_BY_EVENT.default
                        : ALERT_COLOR_BY_EVENT.default;

                      // const thumbURL = cam.alertThumb;

                      const showLabelForThis =
                        codeLabel &&
                        // !thumbURL && // tạm thời không ẩn label khi có thumbnail
                        (selected || hoveredId === cam.id);

                      // z-index: alert luôn cao nhất
                      let zIndex = 40;
                      if (cam.alarm) zIndex += 30;
                      if (selected) zIndex += 10;
                      if (hoveredId === cam.id) zIndex += 20;

                      // 👉 TẠM THỜI KHÔNG ĐỔI ICON THEO STATUS OFF
                      // const isOff =
                      //   typeof cam.status === "string" &&
                      //   cam.status.toLowerCase() === "off";

                      // const iconBgClass = isOff
                      //   ? "bg-slate-400"
                      //   : cfg.bgClass;

                      const iconBgClass = cfg.bgClass;

                      // const thumbUrl = cam.alertThumb;

                      return (
                        <div key={cam.id}>
                          {showFov && /* !isOff && */ (
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

                          {/* ICON + LABEL (thumbnail tạm thời tắt) */}
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              left: `${cam.x}%`,
                              top: `${cam.y}%`,
                              zIndex,
                            }}
                          >
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

                            {/*
                            {thumbUrl && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                                style={{
                                  top: `${-thumbOffsetPx}px`,
                                }}
                              >
                                <div
                                  className="rounded-md overflow-hidden border shadow-md bg-black/60"
                                  style={{
                                    width: `${40 * labelScale}px`,
                                    height: `${64 * labelScale}px`,
                                    borderColor: alertColor,
                                  }}
                                >
                                  <img
                                    src={thumbUrl}
                                    alt={`Alert ${activeAlert?.camera_code}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            */}

                            {/* wrapper icon - gán ref để tính toạ độ tether */}
                            <div
                              ref={(el) => {
                                if (el) {
                                  cameraRefs.current[cam.id] = el;
                                } else {
                                  delete cameraRefs.current[cam.id];
                                }
                              }}
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
                                if (editMode) {
                                  if (!onSelectCamera) return;
                                  if (selectedCameraId === cam.id) {
                                    onSelectCamera(null);
                                  } else {
                                    onSelectCamera(cam.id);
                                  }
                                } else if (onInspectCamera) {
                                  onInspectCamera(cam);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (editMode) return;
                                if (onViewCameraDetails) {
                                  onViewCameraDetails(cam);
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
                                } else if (onViewCameraDetails) {
                                  onViewCameraDetails(cam);
                                }
                              }}
                              onWheel={(e) => {
                                const isTriLocal =
                                  cam.type === "upper" ||
                                  cam.type === "lower";
                                if (
                                  !editMode ||
                                  selectedCameraId !== cam.id ||
                                  !isTriLocal
                                )
                                  return;
                                e.preventDefault();
                                e.stopPropagation();
                                const delta = e.deltaY < 0 ? 5 : -5;
                                const newAngle =
                                  (cam.angle || 0) + delta;
                                onUpdateCamera(cam.id, {
                                  angle: newAngle,
                                });
                              }}
                            >
                              {selected && (
                                <div className="pointer-events-none absolute inset-0 -m-1 rounded-full border-2 border-sky-500" />
                              )}

                              {/* Vòng alert: màu theo event_code */}
                              {cam.alarm && (
                                <div
                                  className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10 overflow-visible"
                                  aria-hidden="true"
                                >
                                  <span
                                    className="pointer-events-none inline-flex h-10 w-10 rounded-full border-2 opacity-80 animate-ping"
                                    style={{ borderColor: alertColor }}
                                  />
                                  <span
                                    className="pointer-events-none absolute inline-flex h-16 w-16 rounded-full border opacity-40 animate-ping [animation-delay:200ms]"
                                    style={{ borderColor: alertColor }}
                                  />
                                </div>
                              )}

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
                </div>
              </TransformComponent>
              {/* ⬆⬆ HẾT PHẦN MAP */}

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

      {/* SVG tether line: theo toạ độ viewport, nhưng line bắt đầu *ngoài* icon */}
      {inspectorLine && (
        <svg
          className="pointer-events-none fixed inset-0 z-30"
          width="100%"
          height="100%"
        >
          <line
            x1={inspectorLine.x1}
            y1={inspectorLine.y1}
            x2={inspectorLine.x2}
            y2={inspectorLine.y2}
            stroke={inspectorLine.color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* DOT ở inspector */}
          <circle
            cx={inspectorLine.x2}
            cy={inspectorLine.y2}
            r="5"
            fill="#0f172a"
          />
          <circle
            cx={inspectorLine.x2}
            cy={inspectorLine.y2}
            r="3"
            fill={inspectorLine.color}
          />
        </svg>
      )}
    </div>
  );
}
