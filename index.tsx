import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  console.error("Không tìm thấy phần tử root!");
} else {
  try {
    const root = createRoot(container);
    root.render(<App />);
  } catch (err) {
    console.error("Lỗi khởi tạo ứng dụng:", err);
    container.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #ef4444;">Hệ thống gặp sự cố tải</h1>
          <p style="color: #64748b;">Vui lòng thử tải lại trang (F5) hoặc xóa cache trình duyệt.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Tải lại ngay</button>
        </div>
      </div>
    `;
  }
}