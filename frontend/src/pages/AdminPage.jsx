import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser, getAdminStats } from '../services/api'
import './AdminPage.css'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user' }

function AdminPage() {
  const [users, setUsers]     = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const [modal, setModal]       = useState(null)  // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [formErr, setFormErr]   = useState('')
  const [saving, setSaving]     = useState(false)

  const fetchUsers = async () => {
    setLoading(true); setError('')
    try {
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await getAdminStats()
      if (res.success) setStats(res.data)
    } catch { /* silent */ }
  }

  useEffect(() => { fetchUsers(); fetchStats() }, [])

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500) }

  const openCreate = () => { setForm(EMPTY_FORM); setFormErr(''); setModal('create') }
  const openEdit   = (u) => { setSelected(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setFormErr(''); setModal('edit') }
  const openDelete = (u) => { setSelected(u); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null); setForm(EMPTY_FORM); setFormErr('') }

  const handleCreateSubmit = async (e) => {
    e.preventDefault(); setFormErr('')
    if (!form.password) { setFormErr('Password is required.'); return }
    setSaving(true)
    try {
      await createUser(form)
      closeModal(); showSuccess(`User "${form.name}" created.`); fetchUsers(); fetchStats()
    } catch (err) { setFormErr(err.response?.data?.message || 'Failed to create user.')
    } finally { setSaving(false) }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault(); setFormErr(''); setSaving(true)
    try {
      const payload = { name: form.name, email: form.email, role: form.role }
      if (form.password) payload.password = form.password
      await updateUser(selected.id, payload)
      closeModal(); showSuccess(`User "${form.name}" updated.`); fetchUsers(); fetchStats()
    } catch (err) { setFormErr(err.response?.data?.message || 'Failed to update user.')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active })
      showSuccess(`User "${u.name}" ${u.is_active ? 'deactivated' : 'activated'}.`)
      fetchUsers()
    } catch (err) { setError(err.response?.data?.message || 'Failed to update status.') }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteUser(selected.id)
      closeModal(); showSuccess(`User "${selected.name}" deleted.`); fetchUsers(); fetchStats()
    } catch (err) { setFormErr(err.response?.data?.message || 'Failed to delete user.')
    } finally { setSaving(false) }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Admin Panel</h1>
          <p className="page-subtitle">Manage users and monitor platform activity</p>
        </div>
        <button className="btn-primary" onClick={openCreate} id="add-user-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="admin-stats">
          {[
            { label: 'Active Users', value: stats.total_users, color: 'blue' },
            { label: 'Requirements', value: stats.total_requirements, color: 'purple' },
            { label: 'Active Now', value: stats.active_requirements, color: 'amber' },
            { label: 'Total Quotes', value: stats.total_quotes, color: 'green' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <span className={`stat-number stat-${color}`}>{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {error   && <div className="admin-toast toast-error">{error}</div>}
      {success && <div className="admin-toast toast-success">{success}</div>}

      {/* Users Table */}
      <div className="admin-card">
        <h2 className="card-title">Users</h2>
        {loading ? (
          <div className="loading-row"><div className="spinner-sm" /><span>Loading users…</span></div>
        ) : users.length === 0 ? (
          <div className="empty-row">No users found.</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                    <td className="td-num">{idx + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className={`user-avatar avatar-${u.role}`}>{u.name.charAt(0).toUpperCase()}</div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="td-email">{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
                    <td>
                      <button className={`status-btn ${u.is_active ? 'status-active' : 'status-inactive'}`} onClick={() => handleToggleActive(u)}>
                        <span className="status-dot" />{u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="td-date">{new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn edit-btn" onClick={() => openEdit(u)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="action-btn delete-btn" onClick={() => openDelete(u)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Add New User' : 'Edit User'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            {formErr && <div className="form-error">{formErr}</div>}
            <form onSubmit={modal === 'create' ? handleCreateSubmit : handleEditSubmit} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jane Doe" required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Password {modal === 'edit' && <span className="hint">(leave blank to keep)</span>}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modal === 'edit' ? '••••••••' : 'Min 6 characters'} required={modal === 'create'} minLength={modal === 'create' ? 6 : 0} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">User — Post & quote on requirements</option>
                    <option value="admin">Admin — Monitor platform & users</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving} id={`modal-${modal}-submit`}>
                  {saving ? <span className="spinner-sm" /> : (modal === 'create' ? 'Create User' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h2 className="confirm-title">Delete User?</h2>
            <p className="confirm-msg">Are you sure you want to permanently delete <strong>{selected.name}</strong>? This cannot be undone.</p>
            {formErr && <div className="form-error">{formErr}</div>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={saving} id="confirm-delete-btn">
                {saving ? <span className="spinner-sm" /> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
