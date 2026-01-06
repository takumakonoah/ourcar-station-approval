'use client';

import { useState } from 'react';
import styles from './approve.module.css';

type Record = {
    id: string;
    code: string;
    address: string;
    approvalMethod: string;
    requestedAt: string;
    approvedAt: string | null;
};

export default function ApprovePage() {
    const [code, setCode] = useState('');
    const [records, setRecords] = useState<Record[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'searching' | 'approving' | 'success'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;

        setStatus('searching');
        setSelectedId(null);
        setRecords([]);
        setErrorMsg('');

        try {
            const res = await fetch(`/api/applications?code=${code}`);
            const data = await res.json();

            setRecords(data);

            // Auto-select logic
            const unapproved = data.filter((r: Record) => !r.approvedAt);
            if (unapproved.length === 1) {
                setSelectedId(unapproved[0].id);
            }

            setStatus('idle');
        } catch (err) {
            console.error(err);
            setErrorMsg('検索に失敗しました');
            setStatus('idle');
        }
    };

    const handleApprove = async () => {
        if (!selectedId) return;
        setStatus('approving');

        try {
            const res = await fetch(`/api/applications/${selectedId}/approve`, {
                method: 'PATCH', // Changed from POST to PATCH as per router implementation
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Approval failed');
            }

            // Update local state
            const updatedRecord = await res.json();
            setRecords((prev) =>
                prev.map((r) => r.id === updatedRecord.id ? updatedRecord : r)
            );
            setSelectedId(null); // Clear selection
            setStatus('success');

            // Remove success message after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err: any) {
            setErrorMsg(err.message);
            setStatus('idle');
        }
    };

    const getDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}分${seconds}秒`;
    };

    return (
        <div className={styles.container}>
            <h1 className="mb-4">承認を記録する</h1>

            <div className={`card ${styles.searchCard} mb-4`}>
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="3桁番号 (例: 123)"
                        className={styles.searchInput}
                        maxLength={3}
                    />
                    <button type="submit" className="btn btn-primary" disabled={status === 'searching'}>
                        検索
                    </button>
                </form>
            </div>

            {status === 'success' && (
                <div className={styles.successMessage}>
                    承認を完了しました！
                </div>
            )}

            {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

            {records.length > 0 && (
                <div className={`card ${styles.listCard}`}>
                    <h3>検索結果: {records.length}件</h3>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>選択</th>
                                <th>Code</th>
                                <th>住所</th>
                                <th>方法</th>
                                <th>申請日時</th>
                                <th>審査時間</th>
                                <th>ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => (
                                <tr
                                    key={record.id}
                                    className={`${record.approvedAt ? styles.approvedRow : ''} ${selectedId === record.id ? styles.selectedRow : ''}`}
                                    onClick={() => !record.approvedAt && setSelectedId(record.id)}
                                >
                                    <td>
                                        {!record.approvedAt && (
                                            <input
                                                type="radio"
                                                name="selection"
                                                checked={selectedId === record.id}
                                                onChange={() => setSelectedId(record.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </td>
                                    <td>{record.code}</td>
                                    <td>{record.address}</td>
                                    <td>{record.approvalMethod}</td>
                                    <td>{new Date(record.requestedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
                                    <td>{record.approvedAt ? getDuration(record.requestedAt, record.approvedAt) : '-'}</td>
                                    <td>
                                        <span className={record.approvedAt ? styles.badgeApproved : styles.badgeUnapproved}>
                                            {record.approvedAt ? '承認済' : '未承認'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.actions}>
                        <button
                            className="btn btn-primary"
                            onClick={handleApprove}
                            disabled={!selectedId || status === 'approving'}
                        >
                            {status === 'approving' ? '処理中...' : '承認する'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
