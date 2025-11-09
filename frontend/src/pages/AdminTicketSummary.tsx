import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminService,
  AdminTicket,
  AdminTicketSummaryClient,
  AdminTicketSummaryData
} from '../services/adminService';
import './AdminTicketSummary.css';

type StatusFilter = AdminTicket['status'] | 'all';

const STATUS_ORDER: AdminTicket['status'][] = [
  'open',
  'in_progress',
  'waiting_customer',
  'escalated',
  'resolved',
  'closed'
];

const STATUS_CONFIG: Record<AdminTicket['status'], { label: string; icon: string; className: string }> = {
  open: { label: 'Open', icon: '📨', className: 'open' },
  in_progress: { label: 'In Progress', icon: '⏳', className: 'in-progress' },
  waiting_customer: { label: 'Waiting Customer', icon: '🕒', className: 'waiting' },
  escalated: { label: 'Escalated', icon: '⚠️', className: 'escalated' },
  resolved: { label: 'Resolved', icon: '✅', className: 'resolved' },
  closed: { label: 'Closed', icon: '🔒', className: 'closed' }
};

const formatNumber = (value: number | undefined | null) => {
  if (!value) return '0';
  return Number(value).toLocaleString('en-IN');
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return date.toLocaleString();
};

const matchesSearch = (client: AdminTicketSummaryClient, search: string) => {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return (
    client.companyName.toLowerCase().includes(normalized) ||
    (client.clientId || '').toLowerCase().includes(normalized) ||
    (client.contactName || '').toLowerCase().includes(normalized) ||
    (client.email || '').toLowerCase().includes(normalized) ||
    (client.phoneNumber || '').toLowerCase().includes(normalized)
  );
};

const AdminTicketSummary: React.FC = () => {
  const [summary, setSummary] = useState<AdminTicketSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const navigate = useNavigate();

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getTicketSummary();
      const sortedClients = [...(data.clients || [])].sort(
        (a, b) => (b.totalTickets || 0) - (a.totalTickets || 0)
      );
      setSummary({
        totals: data.totals,
        clients: sortedClients
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load ticket summary. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const filteredClients = useMemo(() => {
    if (!summary) return [];
    return summary.clients.filter((client) => {
      const meetsSearch = matchesSearch(client, searchTerm.trim());
      const meetsStatus =
        statusFilter === 'all' ||
        (client.statusCounts?.[statusFilter] ?? 0) > 0;
      return meetsSearch && meetsStatus;
    });
  }, [summary, searchTerm, statusFilter]);

  const handleCardFilter = (status: AdminTicket['status']) => {
    setStatusFilter((current) => (current === status ? 'all' : status));
  };

  const handleViewTickets = (client: AdminTicketSummaryClient, status?: AdminTicket['status']) => {
    const path = `/admin/clients/${client.clientMongoId}/tickets`;
    if (status) {
      navigate(`${path}?status=${encodeURIComponent(status)}`);
    } else {
      navigate(path);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="admin-ticket-summary">
      <div className="summary-header">
        <div>
          <h1>Tickets Overview</h1>
          <p className="summary-subtitle">
            Track client tickets by status and jump directly into their ticket workspace.
          </p>
        </div>
        <div className="summary-header-actions">
          <button
            className="btn-secondary"
            onClick={handleResetFilters}
            disabled={loading && !summary}
          >
            Clear Filters
          </button>
          <button
            className="btn-primary"
            onClick={loadSummary}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div
          className={`status-card total ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setStatusFilter('all');
            }
          }}
        >
          <div className="status-card-header">
            <span className="status-icon">📊</span>
            <span className="status-label">Total Tickets</span>
          </div>
          <p className="status-count">
            {formatNumber(summary?.totals?.all ?? 0)}
          </p>
          <span className="status-card-meta">Across all clients</span>
        </div>

        {STATUS_ORDER.map((statusKey) => {
          const config = STATUS_CONFIG[statusKey];
          const totalForStatus = summary?.totals?.[statusKey] ?? 0;
          return (
            <div
              key={statusKey}
              className={`status-card ${config.className} ${statusFilter === statusKey ? 'active' : ''}`}
            >
              <div className="status-card-header">
                <span className="status-icon">{config.icon}</span>
                <button
                  className="status-card-action"
                  onClick={() => handleCardFilter(statusKey)}
                >
                  {statusFilter === statusKey ? 'Show All' : 'View Clients'}
                </button>
              </div>
              <p className="status-label">{config.label}</p>
              <p className="status-count">{formatNumber(totalForStatus)}</p>
              <span className="status-card-meta">Tickets currently {config.label.toLowerCase()}</span>
            </div>
          );
        })}
      </div>

      <div className="ticket-summary-filters">
        <div className="filters-left">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search clients by name, client ID, email or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="select-field">
            <label htmlFor="ticket-status-filter">Status</label>
            <select
              id="ticket-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((statusKey) => (
                <option key={statusKey} value={statusKey}>
                  {STATUS_CONFIG[statusKey].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filters-right">
          <span className="results-info">
            Showing {filteredClients.length} of {summary?.clients.length ?? 0} clients
          </span>
        </div>
      </div>

      {error && (
        <div className="summary-error">
          <p>{error}</p>
          <button className="btn-link" onClick={loadSummary}>
            Retry
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="summary-loading">Loading ticket summary…</div>
      ) : (
        <div className="ticket-summary-table-wrapper">
          <table className="ticket-summary-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Client ID</th>
                <th className="numeric">Open</th>
                <th className="numeric">In Progress</th>
                <th className="numeric">Waiting Customer</th>
                <th className="numeric">Escalated</th>
                <th className="numeric">Resolved</th>
                <th className="numeric">Closed</th>
                <th className="numeric">Total</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="empty-state">
                    {summary ? 'No matching clients found.' : 'No ticket data available yet.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const handleRowNavigate = () => handleViewTickets(client);
                  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewTickets(client);
                    }
                  };

                  const handleViewTicketsClick = (
                    event: React.MouseEvent<HTMLButtonElement>,
                    status?: AdminTicket['status']
                  ) => {
                    event.stopPropagation();
                    handleViewTickets(client, status);
                  };

                  const handleClientsListClick = (event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    navigate('/admin/clients');
                  };

                  return (
                    <tr
                      key={client.clientMongoId}
                      className="clickable-row"
                      onClick={handleRowNavigate}
                      role="button"
                      tabIndex={0}
                      onKeyDown={handleRowKeyDown}
                    >
                      <td>
                        <div className="client-cell">
                          <span className="client-company">{client.companyName}</span>
                          <span className="client-contact">
                            {client.contactName || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="client-id">
                          {client.clientId || '—'}
                        </span>
                      </td>
                      <td className="numeric">{formatNumber(client.statusCounts.open)}</td>
                      <td className="numeric">{formatNumber(client.statusCounts.in_progress)}</td>
                      <td className="numeric">{formatNumber(client.statusCounts.waiting_customer)}</td>
                      <td className="numeric">{formatNumber(client.statusCounts.escalated)}</td>
                      <td className="numeric">{formatNumber(client.statusCounts.resolved)}</td>
                      <td className="numeric">{formatNumber(client.statusCounts.closed)}</td>
                      <td className="numeric total-cell">{formatNumber(client.totalTickets)}</td>
                      <td>{formatDateTime(client.latestUpdatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-primary"
                            onClick={(event) =>
                              handleViewTicketsClick(
                                event,
                                statusFilter === 'all' ? undefined : (statusFilter as AdminTicket['status'])
                              )
                            }
                          >
                            View Tickets
                          </button>
                          <button
                            className="btn-link"
                            onClick={handleClientsListClick}
                          >
                            Clients List
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTicketSummary;

