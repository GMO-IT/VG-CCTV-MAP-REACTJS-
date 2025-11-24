// src/components/RightPanel.jsx
import { GiCctvCamera } from "react-icons/gi";
import { TbDeviceComputerCamera } from "react-icons/tb";
import { BsFillInfoCircleFill } from "react-icons/bs";
import { FaListAlt } from "react-icons/fa";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function RightPanel({
  isOpen,
  toggle,
  editMode,
  placingType,
  onPlaceTypeChange,
  selectedCamera,
  onUpdateSelectedCamera,
  onClickSave,

  // danh sách camera chưa map
  unmappedCameras = [],
  onPickCameraCode,

  // NEW: danh sách cảnh báo + callback khi click
  alerts = [],
  onAlertClick,
}) {
  const { t, i18n } = useTranslation("common");

  const [showHowTo, setShowHowTo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ===== helper format time từ created_unix (seconds) =====
  const formatAlertTime = (unixSec) => {
    if (!unixSec) return "";
    const d = new Date(unixSec * 1000);
    try {
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return d.toISOString().substring(11, 19);
    }
  };

  // ===== FILTER LIST UNMAPPED THEO SEARCH =====
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm.trim()) return unmappedCameras;

    const term = searchTerm.toLowerCase();
    return unmappedCameras.filter((cam) => {
      const code = cam.code?.toLowerCase() || "";
      const locObj = cam.location_json || {};
      const locStr = Object.values(locObj)
        .join(" ")
        .toLowerCase();
      return code.includes(term) || locStr.includes(term);
    });
  }, [unmappedCameras, searchTerm]);

  const renderUnmappedSection = () => {
    if (!editMode) return null;
    if (!unmappedCameras.length) return null;

    const langKey = i18n.language?.startsWith("vi")
      ? "vi"
      : i18n.language?.startsWith("en")
      ? "en"
      : "cn";

    return (
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
            <FaListAlt className="text-slate-600 text-[30px]" />
          </div>

          <p className="text-xs font-semibold text-slate-700">
            {t("unmapped.title")}
          </p>
        </div>

        {/* SEARCH */}
        <div className="mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("unmapped.searchPlaceholder")}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:border-slate-500"
          />
        </div>

        {/* LIST chiếm toàn bộ khoảng trống còn lại */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredUnmapped.map((cam) => {
            const loc = cam.location_json || {};
            const locLabel = loc[langKey] ?? "";

            return (
              <button
                key={cam.code}
                onClick={() =>
                  onPickCameraCode && onPickCameraCode(cam.code)
                }
                className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {cam.code}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {locLabel}
                  </div>
                </div>

                <span
                  className={`ml-2 w-2.5 h-2.5 flex-shrink-0 rounded-full ${
                    cam.status === "working"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // =============== EDIT MODE CONTENT ================
  const renderEditContent = () => {
    return (
      <div className="flex-1 flex flex-col p-5 text-sm text-slate-700 min-h-0 space-y-4">
        {/* HOW TO USE - Collapsible */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
          <button
            onClick={() => setShowHowTo((v) => !v)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600"
          >
            <div className="flex items-center gap-2">
              <BsFillInfoCircleFill className="text-slate-500 text-sm" />
              {t("panel.helpTitle")}
            </div>
            <span>{showHowTo ? "−" : "+"}</span>
          </button>

          {showHowTo && (
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              <p>{t("panel.help1")}</p>
              <p>{t("panel.help2")}</p>
              <p>{t("panel.help3")}</p>
            </div>
          )}
        </div>

        {/* CHỌN LOẠI CAMERA */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">
            {t("panel.typeLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            <TypeButton
              active={placingType === "upper"}
              bgClass="bg-orange-500"
              Icon={GiCctvCamera}
              label={t("panel.typeUpper")}
              onClick={() =>
                onPlaceTypeChange(
                  placingType === "upper" ? null : "upper"
                )
              }
            />
            <TypeButton
              active={placingType === "lower"}
              bgClass="bg-amber-400"
              Icon={GiCctvCamera}
              label={t("panel.typeLower")}
              onClick={() =>
                onPlaceTypeChange(
                  placingType === "lower" ? null : "lower"
                )
              }
            />
            <TypeButton
              active={placingType === "cam360"}
              bgClass="bg-sky-500"
              Icon={TbDeviceComputerCamera}
              label={t("panel.type360")}
              onClick={() =>
                onPlaceTypeChange(
                  placingType === "cam360" ? null : "cam360"
                )
              }
            />
          </div>
        </div>

        {/* CAMERA ĐANG CHỌN */}
        {selectedCamera ? (
          <>
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Nhập mã camera */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">
                    {t("panel.currentCam")}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {t("panel.currentCode")}&nbsp;
                    <b>{selectedCamera.code || "—"}</b>
                  </span>
                </div>
                <input
                  type="text"
                  value={selectedCamera.code || ""}
                  onChange={(e) =>
                    onUpdateSelectedCamera({
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Camera code (e.g. E4040)"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:border-slate-500"
                />
              </div>

              {selectedCamera.type !== "cam360" && (
                <>
                  <RangeBlock
                    title={t("panel.rangeLabel")}
                    value={selectedCamera.range || 100}
                    min={15}
                    max={100}
                    onChange={(val) =>
                      onUpdateSelectedCamera({ range: val })
                    }
                  />

                  <RangeBlock
                    title={t("panel.angleLabel")}
                    value={selectedCamera.angle || 0}
                    min={-180}
                    max={180}
                    onChange={(val) =>
                      onUpdateSelectedCamera({ angle: val })
                    }
                  />
                </>
              )}

              {selectedCamera.type === "cam360" && (
                <RangeBlock
                  title={t("panel.radiusLabel")}
                  value={selectedCamera.radius || 90}
                  min={40}
                  max={220}
                  onChange={(val) =>
                    onUpdateSelectedCamera({ radius: val })
                  }
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-200">
            {t("panel.noCamera")}
          </p>
        )}

        {/* UNMAPPED LIST chiếm phần còn lại */}
        {renderUnmappedSection()}
      </div>
    );
  };

  // =============== VIEW MODE: HIỂN THỊ CẢNH BÁO ================
  const renderViewContent = () => {
    if (!alerts.length) {
      return (
        <div className="flex-1 p-5 text-sm text-slate-700 space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            {t("alerts.emptyTitle")}
          </p>
          <p className="text-xs text-slate-500">
            {t("alerts.emptyDesc")}
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 p-5 text-sm text-slate-700 space-y-3">
        <div>
          <p className="text-xs font-semibold text-red-600">
            {t("alerts.listTitle")}
          </p>
          <p className="text-[11px] text-slate-500">
            {t("alerts.listDesc")}
          </p>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() =>
                onAlertClick && onAlertClick(alert)
              }
              className="
                w-full text-left rounded-lg border border-red-100
                bg-red-50/70 hover:bg-red-100/80 transition
                flex items-center gap-3 p-2.5
              "
            >
              {alert.thumbUrl && (
                <div className="w-40 h-20 rounded-md overflow-hidden bg-black/60 flex-shrink-0">
                  <img
                    src={alert.thumbUrl}
                    alt={`Alert ${alert.camera_code}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {alert.camera_code || "—"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatAlertTime(alert.created_unix)}
                  </span>
                </div>

                <div className="text-[11px] text-slate-700 mt-0.5">
                  {alert.event_code === "smartphone"
                    ? t("alerts.smartphoneEvent")
                    : `${t("alerts.genericPrefix")} ${
                        alert.event_code || ""
                      }`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-y-0 right-0 h-full z-10">
      <div
        className={`
          absolute inset-y-0 right-0
          h-full w-80
          bg-white/95 backdrop-blur-sm
          shadow-2xl rounded-l-3xl
          border-l border-slate-200
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-slate-900 font-semibold text-lg">
            {editMode ? t("panel.titleEdit") : t("alerts.header")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {editMode
              ? t("panel.subtitleEdit")
              : t("alerts.subtitle")}
          </p>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {editMode ? renderEditContent() : renderViewContent()}
        </div>

        {editMode && (
          <div className="mt-auto px-5 pb-4 pt-2 border-t border-slate-200 bg-white/90 flex-shrink-0">
            <button
              onClick={onClickSave}
              className="w-full h-9 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-md hover:bg-slate-800"
            >
              {t("button.saveConfig")}
            </button>
          </div>
        )}
      </div>

      {/* BUTTON TOGGLE PANEL */}
      <button
        onClick={toggle}
        className={`
          absolute top-1/2 -translate-y-1/2
          h-16 w-9
          flex items-center justify-center
          rounded-full
          bg-slate-900 text-slate-50
          shadow-xl border border-slate-900/70
          transition-all
          ${isOpen ? "right-80" : "right-0"}
        `}
      >
        <span className="text-lg">{isOpen ? "›" : "‹"}</span>
      </button>
    </div>
  );
}

/* --- SUB COMPONENTS --- */

function TypeButton({ active, bgClass, Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition
        ${
          active
            ? "border-slate-900 bg-slate-900/5 text-slate-900"
            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        }
      `}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center ${bgClass}`}
      >
        <Icon className="w-4 h-4 text-white" />
      </span>
      {label}
    </button>
  );
}

function RangeBlock({ title, value, min, max, onChange }) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-semibold">{title}</span>
        <span>{value}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-900"
      />

      <p className="text-[11px] text-slate-400">
        {t("panel.rangeHint")}
      </p>
    </div>
  );
}
