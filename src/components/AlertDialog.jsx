import Lottie from "lottie-react";
import { useRef, useEffect } from "react";

export default function AlertDialog({
  open,
  title = "Thông báo",
  message,
  onClose,
  animationData,
  loop = true,          // ✅ cho mặc định là true luôn
}) {
  const lottieRef = useRef(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[340px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 flex flex-col items-center">
        {animationData && (
          <div className="w-28 h-28 mb-2">
            <Lottie
              lottieRef={lottieRef}
              animationData={animationData}
              autoplay
              loop={loop}  // 🔁 Lottie sẽ tự loop
            />
          </div>
        )}

        <h3 className="mt-1 text-sm font-semibold text-slate-900 text-center">
          {title}
        </h3>

        {message && (
          <p className="mt-2 text-xs text-slate-600 leading-snug text-center">
            {message}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 px-5 py-1.5 rounded-full text-xs font-medium bg-slate-900 text-white hover:bg-emerald-700 shadow-sm"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
