import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Lỗi khởi tạo React:", err);
    container.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; font-family: sans-serif;">
        <div>
          <h1 style="color: #4f46e5;">Hệ thống đang khởi động...</h1>
          <p>Nếu trang không tải sau vài giây, vui lòng nhấn F5.</p>
        </div>
      </div>
    `;
  }
}