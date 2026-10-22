import React, { useState, useEffect } from 'react';
import { History, Search, FileText, Download, Trash2, AlertCircle, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/auth';

interface HistoryItem {
  id: string;
  filename: string;
  verdict: 'REAL' | 'MANIPULATED' | 'UNCERTAIN';
  confidence: number;
  duration: number;
  processed_at?: string;
}

export const InvestigationHistory: React.FC = () => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.authenticatedFetch('/api/history');
      if (!res.ok) {
        throw new Error('Failed to fetch investigation history.');
      }
      const data = await res.json();
      setHistoryList(data.history || []);
    } catch (err: any) {
      setError(err.message || 'Error loading history from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (analysisId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the analysis for '${filename}'? This will cascade-delete all forensic signal records.`)) {
      return;
    }

    setDeletingId(analysisId);
    try {
      const res = await authService.authenticatedFetch(`/api/analysis/${analysisId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete record.');
      }
      setHistoryList((prev) => prev.filter((item) => item.id !== analysisId));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredHistory = historyList.filter((item) =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.verdict.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="bento-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 24px' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px', flexShrink: 0, marginBottom: '14px', paddingBottom: '12px' }}>
          <div>
            <h3 className="card-title">
              <History size={18} color="var(--color-accent-mint)" />
              Past Video Investigations
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '3px' }}>
              All videos previously analyzed and saved to your account
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
              title="Refresh History"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Filter by filename or verdict..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-secondary-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  minWidth: '240px',
                }}
              />
              <Search size={15} color="var(--color-muted-teal)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              color: '#FCA5A5',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-secondary)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px' }}>Retrieving private authenticated forensic records...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, border: '1px solid var(--color-border)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-secondary-bg)', zIndex: 2 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Target Video File</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Verdict</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Confidence</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Duration</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Analysis Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const isReal = item.verdict === 'REAL';
                  const isManipulated = item.verdict === 'MANIPULATED';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {item.filename}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isReal
                              ? 'var(--verdict-real-bg)'
                              : isManipulated
                              ? 'var(--verdict-fake-bg)'
                              : 'var(--verdict-uncertain-bg)',
                            color: isReal
                              ? 'var(--verdict-real-text)'
                              : isManipulated
                              ? 'var(--verdict-fake-text)'
                              : 'var(--verdict-uncertain-text)',
                            border: `1px solid ${
                              isReal
                                ? 'var(--verdict-real-border)'
                                : isManipulated
                                ? 'var(--verdict-fake-border)'
                                : 'var(--verdict-uncertain-border)'
                            }`,
                          }}
                        >
                          {item.verdict}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {(item.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px 16px' }}>{item.duration.toFixed(1)}s</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                        {item.processed_at ? new Date(item.processed_at).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => window.open(`/api/reports/${encodeURIComponent(item.filename)}/json`, '_blank')}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="Download JSON Report"
                          >
                            <Download size={13} />
                            <span>JSON</span>
                          </button>
                          <button
                            onClick={() => window.open(`/api/reports/${encodeURIComponent(item.filename)}/html`, '_blank')}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="Open HTML Dossier"
                          >
                            <FileText size={13} />
                            <span>Dossier</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.filename)}
                            disabled={deletingId === item.id}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: '#EF4444',
                              cursor: 'pointer',
                            }}
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-secondary)' }}>
            <History size={36} color="var(--color-muted-teal)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ color: 'var(--color-text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
              No Investigation Records Found
            </h4>
            <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 18px' }}>
              {searchTerm
                ? `No analyses match query '${searchTerm}'. Try a different search term.`
                : 'You have not performed any video forensic analyses on this account yet. Head to the Forensic Analysis tab to upload a clip.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
