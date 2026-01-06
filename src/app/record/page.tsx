'use client';

import { useState } from 'react';
import styles from './record.module.css';

export default function RecordPage() {
    const [formData, setFormData] = useState({
        code: '',
        address: '',
        approvalMethod: 'PHONE', // Default to PHONE as per requirement (or one of them)
        note: '',
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [validationMsg, setValidationMsg] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Code validation
        if (name === 'code') {
            if (!/^\d*$/.test(value)) return; // Only allow digits
            if (value.length > 3) return; // Max 3 digits
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.code.length !== 3) {
            setValidationMsg('3桁の番号を入力してください');
            return;
        }
        setValidationMsg('');
        setStatus('submitting');
        setErrorMsg('');

        try {
            const res = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setResult(data);
            setStatus('success');
            // Reset form but keep recent success visible? Requirement says "Show saved requestedAt". 
            // User might want to enter next record quickly, but needs confirmation first.

            // Optionally clear form for next entry
            setFormData({ code: '', address: '', approvalMethod: 'PHONE', note: '' });

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className="mb-4">記録する</h1>

            <div className={`card ${styles.formCard}`}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="code">3桁コード <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            id="code"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="000"
                            required
                        />
                        {validationMsg && <p className={styles.errorText}>{validationMsg}</p>}
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="address">住所 <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="東京都..."
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="approvalMethod">認証方法 <span className={styles.required}>*</span></label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="approvalMethod"
                                    value="PHONE"
                                    checked={formData.approvalMethod === 'PHONE'}
                                    onChange={handleChange}
                                />
                                電話
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="approvalMethod"
                                    value="EMAIL"
                                    checked={formData.approvalMethod === 'EMAIL'}
                                    onChange={handleChange}
                                />
                                メール
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="approvalMethod"
                                    value="VIDEO"
                                    checked={formData.approvalMethod === 'VIDEO'}
                                    onChange={handleChange}
                                />
                                動画
                            </label>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="note">メモ</label>
                        <textarea
                            id="note"
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            className={styles.textarea}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={status === 'submitting'}
                    >
                        {status === 'submitting' ? '保存中...' : '保存する'}
                    </button>

                    {status === 'error' && (
                        <div className={styles.errorMessage}>
                            エラー: {errorMsg}
                        </div>
                    )}
                </form>
            </div>

            {status === 'success' && result && (
                <div className={`card ${styles.successCard} mt-4`}>
                    <h3>保存しました</h3>
                    <p><strong>Code:</strong> {result.code}</p>
                    <p><strong>Requested At:</strong> {new Date(result.requestedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
                    <p className={styles.statusTag}>ステータス: 未承認</p>
                    {/* Note: In a real app we might check if this code has many unapproved items here as per requirement */}
                </div>
            )}
        </div>
    );
}
