'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

type Stats = {
  totalCount: number;
  unapprovedCount: number;
  approvedCount: number;
  averageReviewTimeMs: number;
  averageByMethod: { method: string; averageTimeMs: number; count: number }[];
};

type Record = {
  id: string;
  code: string;
  address: string;
  approvalMethod: string;
  requestedAt: string;
  approvedAt: string | null;
  note: string | null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState('ALL'); // 7, 30, ALL
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/applications') // Fetches all recent
      ]);

      const statsData = await statsRes.json();
      const listData = await listRes.json();

      setStats(statsData);
      setRecords(listData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Deletion failed');

      // Refresh data
      fetchData();
    } catch (e) {
      console.error(e);
      alert('削除に失敗しました');
    }
  };

  const getDurationString = (ms: number) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const getReviewTime = (start: string, end: string | null) => {
    if (!end) return null;
    return new Date(end).getTime() - new Date(start).getTime();
  };

  // Client-side filtering
  const filteredRecords = records.filter(r => {
    if (filterStatus !== 'ALL') {
      const isApproved = !!r.approvedAt;
      if (filterStatus === 'APPROVED' && !isApproved) return false;
      if (filterStatus === 'UNAPPROVED' && isApproved) return false;
    }

    if (filterMethod !== 'ALL' && r.approvalMethod !== filterMethod) return false;

    if (filterPeriod !== 'ALL') {
      const days = parseInt(filterPeriod);
      const reqDate = new Date(r.requestedAt);
      const diffTime = Math.abs(new Date().getTime() - reqDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > days) return false;
    }

    return true;
  });

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'PHONE': return '電話';
      case 'EMAIL': return 'メール';
      case 'VIDEO': return '動画';
      case 'BULK': return '一括承認';
      default: return method;
    }
  };

  const handleDateUpdate = async (id: string, field: 'requestedAt' | 'approvedAt', value: string) => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error('Update failed');

      // Update local state to reflect change immediately
      setRecords(prev => prev.map(r => {
        if (r.id === id) {
          return { ...r, [field]: new Date(value).toISOString() };
        }
        return r;
      }));
    } catch (e) {
      console.error(e);
      alert('更新に失敗しました');
    }
  };

  if (loading) return <div className="text-center mt-4">読み込み中...</div>;

  return (
    <div className={styles.container}>
      <h1 className="mb-4">ダッシュボード</h1>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <h3>平均審査時間</h3>
          <div className={styles.bigNumber}>
            {stats ? getDurationString(stats.averageReviewTimeMs) : '-'}
          </div>
        </div>
        <div className={styles.statsCard}>
          <h3>未承認件数</h3>
          <div className={`${styles.bigNumber} ${styles.warningText}`}>
            {stats?.unapprovedCount || 0}
          </div>
        </div>
        <div className={styles.statsCard}>
          <h3>総件数</h3>
          <div className={styles.bigNumber}>
            {stats?.totalCount || 0}
          </div>
        </div>
      </div>

      <div className={`card ${styles.methodStatsCard}`}>
        <h3>方法別平均時間 (一括審査含む)</h3>
        <div className={styles.methodGrid}>
          {stats?.averageByMethod.map((m) => (
            <div key={m.method} className={styles.methodItem}>
              <span className={styles.methodLabel}>{getMethodLabel(m.method)}</span>
              <span className={styles.methodValue}>{getDurationString(m.averageTimeMs)}</span>
            </div>
          ))}
          {stats?.averageByMethod.length === 0 && <p>データなし</p>}
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <h2>履歴一覧</h2>
        <div className={styles.filters}>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className={styles.select}>
            <option value="ALL">全期間</option>
            <option value="7">過去7日</option>
            <option value="30">過去30日</option>
          </select>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className={styles.select}>
            <option value="ALL">全方法</option>
            <option value="PHONE">電話</option>
            <option value="EMAIL">メール</option>
            <option value="VIDEO">動画</option>
            <option value="BULK">一括承認</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.select}>
            <option value="ALL">全ステータス</option>
            <option value="UNAPPROVED">未承認</option>
            <option value="APPROVED">承認済</option>
          </select>
        </div>
      </div>

      <div className={styles.listCard}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>住所</th>
                <th>方法</th>
                <th>申請日時 (変更可)</th>
                <th>承認日時 (変更可)</th>
                <th>審査時間</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const reviewTime = getReviewTime(r.requestedAt, r.approvedAt);
                // Convert to datetime-local string format for input: YYYY-MM-DDThh:mm
                const reqDateVal = new Date(r.requestedAt).toLocaleString('sv').replace(' ', 'T').slice(0, 16);
                const appDateVal = r.approvedAt ? new Date(r.approvedAt).toLocaleString('sv').replace(' ', 'T').slice(0, 16) : '';

                return (
                  <tr key={r.id}>
                    <td className={styles.codeCell}>{r.code}</td>
                    <td>{r.address}</td>
                    <td>{getMethodLabel(r.approvalMethod)}</td>
                    <td>
                      <input
                        type="datetime-local"
                        value={reqDateVal}
                        onChange={(e) => handleDateUpdate(r.id, 'requestedAt', e.target.value)}
                        className={styles.dateInput}
                      />
                    </td>
                    <td>
                      {r.approvedAt ? (
                        <input
                          type="datetime-local"
                          value={appDateVal}
                          onChange={(e) => handleDateUpdate(r.id, 'approvedAt', e.target.value)}
                          className={styles.dateInput}
                        />
                      ) : '-'}
                    </td>
                    <td>{reviewTime ? getDurationString(reviewTime) : '-'}</td>
                    <td>
                      <span className={r.approvedAt ? styles.badgeApproved : styles.badgeUnapproved}>
                        {r.approvedAt ? '承認済' : '未承認'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className={styles.deleteBtn}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center p-4">表示するデータがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
