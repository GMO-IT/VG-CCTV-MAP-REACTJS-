// src/App.jsx
import { useEffect, useState } from "react";
import "./i18n"; // 👈 import cấu hình i18n
import Home from "./screens/Home";
import SplashScreen from "./screens/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <Home />;
}
