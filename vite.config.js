import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Cho phép truy cập từ mạng LAN
    port: 5173,        // Tùy chọn
    open: false,       // Không tự mở trình duyệt
  },
})
