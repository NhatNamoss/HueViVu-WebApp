'use client';
import { useEffect, useState } from 'react';

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => {
        setFeedbacks(data.feedback || []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Quản lý Góp ý & Hỗ trợ</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Ngày</th>
              <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Chủ đề</th>
              <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Nội dung</th>
              <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(fb => (
              <tr key={fb.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{new Date(fb.created_at).toLocaleString()}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{fb.topic}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #ddd', maxWidth: 400 }}>{fb.message}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{fb.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}