
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Khởi tạo process.env giả lập để tránh lỗi ReferenceError trên trình duyệt
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Lỗi khi render ứng dụng:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h2>Đã xảy ra lỗi khi tải ứng dụng</h2>
      <p>Vui lòng làm mới trang hoặc kiểm tra kết nối mạng.</p>
    </div>
  `;
}
