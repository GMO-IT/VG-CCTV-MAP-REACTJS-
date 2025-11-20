import { GiCctvCamera } from "react-icons/gi";
import { TbDeviceComputerCamera } from "react-icons/tb";
import { BsFillInfoCircleFill } from "react-icons/bs";
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
}) {
  const { t } = useTranslation("common");

  const renderEditContent = () => {
    return (
      <div className="flex-1 p-5 text-sm text-slate-700 space-y-4">
        <div className="flex items-center gap-1">
          <BsFillInfoCircleFill className="text-slate-500 text-xs" />
          <p className="text-xs text-slate-500">
            {t("panel.helpTitle")}
          </p>
        </div>
        <p className="text-xs text-slate-500">{t("panel.help1")}</p>
        <p className="text-xs text-slate-500">{t("panel.help2")}</p>
        <p className="text-xs text-slate-500">{t("panel.help3")}</p>

        {/* Chọn loại camera */}
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

        {/* Chỉnh camera đang chọn */}
        {selectedCamera ? (
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
                  onUpdateSelectedCamera({ code: e.target.value })
                }
                placeholder="Camera code (e.g. E4040)"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:border-slate-500"
              />
            </div>

            {selectedCamera.type !== "cam360" && (
              <>
                <RangeBlock
                  title={t("panel.rangeLabel")}
                  value={selectedCamera.range || 140}
                  min={40}
                  max={260}
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
        ) : (
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-200">
            {t("panel.noCamera")}
          </p>
        )}
      </div>
    );
  };

  // View mode: chỉ hiển thị info camera
  const renderViewContent = () => {
    if (!selectedCamera) {
      return (
        <div className="flex-1 p-5 text-sm text-slate-700 space-y-2">
          <p className="text-xs text-slate-500">
            {t("panel.noCamera")}
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 p-5 text-sm text-slate-700 space-y-4">
        {/* Thông tin cơ bản */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600">
            {t("camera.infoTitle")}
          </p>
          <p className="text-xs text-slate-500">
            {t("camera.code")}:{" "}
            <span className="font-mono font-semibold">
              {selectedCamera.code || "—"}
            </span>
          </p>
        </div>

        {/* Vị trí */}
        <div className="space-y-1 text-xs text-slate-600">
          <p className="font-semibold">{t("camera.location")}</p>
          <p className="text-slate-500">
            x:{" "}
            {selectedCamera.x != null
              ? selectedCamera.x.toFixed(1)
              : "—"}
            {", "}
            y:{" "}
            {selectedCamera.y != null
              ? selectedCamera.y.toFixed(1)
              : "—"}
          </p>
        </div>

        {/* Trạng thái hoạt động */}
        <div className="space-y-1 text-xs text-slate-600">
          <p className="font-semibold">Trạng thái hoạt động</p>
          <p className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang hoạt động
          </p>
        </div>

        {/* Thông báo / cảnh báo */}
        <div className="space-y-1 text-xs text-slate-600">
          <p className="font-semibold">Thông báo</p>
          <p className="text-slate-500">
            {selectedCamera.alarm
              ? "Số lượng người đông bất thường!"
              : "Không có thông báo bất thường."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-y-0 right-0 h-full z-10">
      {/* PANEL */}
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
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold text-lg tracking-tight">
            {editMode ? t("panel.titleEdit") : t("panel.titleView")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {editMode
              ? t("panel.subtitleEdit")
              : t("panel.subtitleView")}
          </p>
        </div>

        {editMode ? renderEditContent() : renderViewContent()}

        {/* Nút Lưu chỉ ở edit mode */}
        {editMode && (
          <div className="mt-auto px-5 pb-4 pt-2 border-t border-slate-200 bg-white/90">
            <button
              onClick={onClickSave}
              className="w-full h-9 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors"
            >
              {t("button.saveConfig")}
            </button>
          </div>
        )}
      </div>

      {/* Nút toggle panel */}
      <button
        onClick={toggle}
        className={`
          absolute top-1/2 -translate-y-1/2
          h-16 w-9
          flex items-center justify-center
          rounded-full
          bg-slate-900 text-slate-50
          shadow-xl border border-slate-900/70
          transition-all duration-300 ease-in-out
          ${isOpen ? "right-80" : "right-0"}
        `}
      >
        <span className="text-lg leading-none">
          {isOpen ? "›" : "‹"}
        </span>
      </button>
    </div>
  );
}

/* --- Sub components --- */

function TypeButton({ active, bgClass, Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs
        transition-colors
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
      <span>{label}</span>
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
