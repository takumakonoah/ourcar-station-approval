'use client';

import { useState, useEffect } from 'react';
import styles from './bulk.module.css';

type BulkStats = {
    averageTimeMs: number;
    count: number;
};

type CheckResult = {
    code: string;
    status: 'valid' | 'not_found' | 'approved';
    id?: string;
    address?: string;
    requestedAt?: string;
};

export default function BulkPage() {
    const [activeTab, setActiveTab] = useState<'register' | 'approve'>('approve');

    // -- Common --
    const [bulkStats, setBulkStats] = useState<BulkStats | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [msg, setMsg] = useState('');

    // -- Register Mode State --
    const [regCodes, setRegCodes] = useState('');

    // -- Approve Mode State --
    const [codesInput, setCodesInput] = useState('');
    const [stage, setStage] = useState<'input' | 'review'>('input');
    const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            const bulkData = data.averageByMethod.find((m: any) => m.method === 'BULK');
            if (bulkData) {
                setBulkStats({ averageTimeMs: bulkData.averageTimeMs, count: bulkData.count });
            } else {
                setBulkStats(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getDurationString = (ms: number) => {
        if (!ms) return '-';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}分${seconds}秒`;
    };

    // --- Register Actions ---
    const handleRegister = async () => {
        if (!regCodes.trim()) {
            setMsg('コードは必須です');
            return;
        }

        const codes = regCodes.split(/[\n, ]+/).map(c => c.trim()).filter(c => /^\d{3}$/.test(c));
        if (codes.length === 0) {
            setMsg('有効な3桁のコードが見つかりません');
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch('/api/applications/bulk-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codes,
                    address: '一括登録',
                    approvalMethod: 'BULK'
                })
            });

            if (!res.ok) throw new Error('Failed to register');
            const data = await res.json();

            setMsg(`${data.createdCount}件の申請を記録しました`);
            setRegCodes('');
        } catch (e) {
            setMsg('登録中にエラーが発生しました');
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };


    // --- Approve Actions ---
    const handleReview = async () => {
        if (!codesInput.trim()) return;
        setIsProcessing(true); setMsg('');
        const codes = codesInput.split(/[\n, ]+/).map(c => c.trim()).filter(c => /^\d{3}$/.test(c));
        if (codes.length === 0) {
            setMsg('有効な3桁のコードが見つかりません'); setIsProcessing(false); return;
        }
        try {
            const res = await fetch('/api/applications/bulk-check', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes }),
            });
            const results = await res.json();
            setCheckResults(results); setStage('review');
        } catch (e) { console.error(e); setMsg('審査中にエラーが発生しました'); } finally { setIsProcessing(false); }
    };

    const handleApproveSingle = async (id: string, code: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/applications/${id}/approve`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'BULK' }),
            });
            if (!res.ok) throw new Error('Failed');
            setCheckResults(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
            setMsg(`${code} を承認しました`); fetchStats();
        } catch (e) { setMsg(`エラー: ${code} の承認に失敗しました`); } finally { setIsProcessing(false); }
    };

    const handleExecuteAll = async () => {
        const validIds = checkResults.filter(r => r.status === 'valid' && r.id).map(r => r.id);
        if (validIds.length === 0) return;
        if (!confirm(`${validIds.length}件をすべて承認しますか？`)) return;
        setIsProcessing(true);
        try {
            const res = await fetch('/api/applications/bulk-approve', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: validIds }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setMsg(`${data.approvedCount}件を一括承認しました`);
            setCheckResults(prev => prev.map(r => r.status === 'valid' ? { ...r, status: 'approved' } : r));
            fetchStats();
        } catch (e) { setMsg('一括承認実行中にエラーが発生しました'); } finally { setIsProcessing(false); }
    };

    const handleReset = () => { setStage('input'); setCheckResults([]); setMsg(''); setCodesInput(''); };
    const validCount = checkResults.filter(r => r.status === 'valid').length;

    return (
        <div className={styles.container}>
            <h1 className="mb-4">一括管理</h1>

            {/* Stats Section */}
            <div className={styles.statsGrid}>
                <div className={styles.statsCard}>
                    <h3>平均審査時間 (一括)</h3>
                    <div className={styles.bigNumber}>
                        {bulkStats ? getDurationString(bulkStats.averageTimeMs) : '-'}
                    </div>
                </div>
                <div className={styles.statsCard}>
                    <h3>一括承認件数</h3>
                    <div className={styles.bigNumber}>
                        {bulkStats?.count || 0}
                    </div>
                </div>
            </div>

            <div className={`mt-4 mb-4 ${styles.tabs}`}>
                <button
                    className={`${styles.tab} ${activeTab === 'register' ? styles.activeTab : ''}`}
                    onClick={() => { setActiveTab('register'); setMsg(''); }}
                >
                    審査記録 (Register)
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'approve' ? styles.activeTab : ''}`}
                    onClick={() => { setActiveTab('approve'); setMsg(''); }}
                >
                    承認記録 (Approve)
                </button>
            </div>

            <div className={`${styles.inputCard}`}>
                {/* === REGISTER MODE === */}
                {activeTab === 'register' && (
                    <div className={styles.form}>
                        <h2 className="mb-2">新規 審査受付 (一括)</h2>
                        {msg && <p className={styles.responseMsg}>{msg}</p>}

                        <label htmlFor="regCodes" className={styles.label}>
                            審査番号 (複数可/改行区切り)
                        </label>
                        <textarea
                            id="regCodes"
                            value={regCodes}
                            onChange={(e) => setRegCodes(e.target.value)}
                            placeholder="000&#13;&#10;111"
                            className={styles.textarea}
                            rows={4}
                        />

                        <button
                            onClick={handleRegister}
                            className="btn btn-primary mt-2"
                            disabled={isProcessing}
                        >
                            一括登録する
                        </button>
                    </div>
                )}

                {/* === APPROVE MODE === */}
                {activeTab === 'approve' && (
                    <>
                        {stage === 'input' ? (
                            <div className={styles.form}>
                                <h2 className="mb-2">承認記録 (一括)</h2>
                                {msg && <p className={styles.responseMsg}>{msg}</p>}

                                <label htmlFor="bulkCodes" className={styles.label}>
                                    承認番号入力 (複数可/改行区切り)
                                </label>
                                <textarea
                                    id="bulkCodes"
                                    value={codesInput}
                                    onChange={(e) => setCodesInput(e.target.value)}
                                    placeholder="000&#13;&#10;111"
                                    className={styles.textarea}
                                    rows={4}
                                />
                                <button
                                    onClick={handleReview}
                                    className="btn btn-primary"
                                    disabled={isProcessing || !codesInput.trim()}
                                >
                                    審査結果を表示 (履歴)
                                </button>
                            </div>
                        ) : (
                            <div className={styles.reviewSection}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="mb-0">審査履歴 / 結果</h2>
                                    <button onClick={handleReset} className="btn btn-secondary text-sm">
                                        新しい審査を入力
                                    </button>
                                </div>

                                {msg && <div className={`${styles.infoMsg} mb-4`}>{msg}</div>}

                                <div className={styles.summary}>
                                    <span className="mr-4">承認待ち: <strong>{validCount}件</strong></span>
                                    <span>合計: {checkResults.length}件</span>
                                </div>

                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>審査番号</th>
                                                <th>ステータス</th>
                                                <th>住所</th>
                                                <th style={{ textAlign: 'right' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checkResults.map((r, i) => (
                                                <tr key={`${r.code}-${i}`}>
                                                    <td className={styles.code}>{r.code}</td>
                                                    <td>
                                                        {r.status === 'valid' && <span className={styles.badgeValid}>承認可</span>}
                                                        {r.status === 'approved' && <span className={styles.badgeSuccess}>承認済</span>}
                                                        {r.status === 'not_found' && <span className={styles.badgeError}>不明</span>}
                                                    </td>
                                                    <td className={styles.detail}>
                                                        {r.address || '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {r.status === 'valid' && (
                                                            <button
                                                                onClick={() => handleApproveSingle(r.id!, r.code)}
                                                                className={styles.approveBtnMini}
                                                                disabled={isProcessing}
                                                            >
                                                                承認
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className={styles.actions}>
                                    <button
                                        onClick={handleExecuteAll}
                                        className="btn btn-primary"
                                        disabled={validCount === 0 || isProcessing}
                                    >
                                        まとめて承認する ({validCount}件)
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
