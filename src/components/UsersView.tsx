import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { Users, Search, Filter, Shield, UserCheck, MapPin, ToggleLeft, ToggleRight, Loader2, Sparkles, Building2, Plus } from 'lucide-react';

interface UserItem {
  id: number;
  email: string;
  name: string | null;
  role: string;
  branchId: number | null;
  status: string;
  createdAt: string;
  branchName: string | null;
}

interface UsersViewProps {
  branches: any[];
}

export const UsersView: React.FC<UsersViewProps> = ({ branches }) => {
  const { token, dbUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleUpdateUser = async (userId: number, updates: { role?: string; branchId?: number | null; status?: string; name?: string; email?: string; password?: string }) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        // Refresh local items
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update user parameters.');
        throw new Error(errData.error);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const openEditUser = (u: UserItem) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditPassword('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updates: any = {};
      if (editName !== editingUser.name) updates.name = editName;
      if (editEmail !== editingUser.email) updates.email = editEmail;
      if (editPassword) updates.password = editPassword;

      await handleUpdateUser(editingUser.id, updates);
      setEditingUser(null);
    } catch (err) {
      // Error handled in handleUpdateUser
    }
  };

  const handleDeleteUser = async (userId: number, userName: string | null) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to permanently delete user ${userName || userId}?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Staff');
  const [newUserBranch, setNewUserBranch] = useState<number | ''>('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          branchId: newUserBranch ? parseInt(newUserBranch.toString()) : null,
          status: 'Active'
        })
      });

      if (res.ok) {
        setShowAddUser(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('Staff');
        setNewUserBranch('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchVal.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchVal.toLowerCase()));
    
    const matchesRole = !filterRole || u.role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">User Administration</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Configure roles, toggle operational status, and assign terminal branches</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New User</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search team members by name or email..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all placeholder-slate-400 font-medium shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all font-semibold text-slate-600 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
            </select>
            <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">Retrieving user roster...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card shadow-sm rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <Users className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
          <h3 className="font-display font-bold text-lg text-slate-800">No personnel registered</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            There are currently no staff accounts matching your search scope. Tell employees to sign up with Google to list their profiles.
          </p>
        </div>
      ) : (
        <div className="glass-card shadow-sm rounded-2xl overflow-hidden border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-500">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">User / Account Email</th>
                  <th className="py-4 px-6">System Role</th>
                  <th className="py-4 px-6">Branch Assignment</th>
                  <th className="py-4 px-6">Terminal Status</th>
                  <th className="py-4 px-6">Registered Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                {filtered.map((u) => (
                  <tr 
                    key={u.id} 
                    onClick={() => isSuperAdmin && openEditUser(u)}
                    className={`hover:bg-slate-50/40 transition-colors ${isSuperAdmin ? 'cursor-pointer' : ''}`}
                  >
                    {/* Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                          {u.name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{u.name || 'Sign-up Pending'}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin && u.id !== dbUser?.id ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                          className="p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white cursor-pointer font-bold"
                        >
                          <option value="Super Admin">Super Admin</option>
                          <option value="Admin">Admin</option>
                          <option value="Staff">Staff</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-700 uppercase">
                          {u.role}
                        </span>
                      )}
                    </td>

                    {/* Branch select */}
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin ? (
                        <select
                          value={u.branchId || ''}
                          onChange={(e) => handleUpdateUser(u.id, { branchId: e.target.value ? parseInt(e.target.value) : null })}
                          className="p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white cursor-pointer font-bold"
                        >
                          <option value="">No physical branch (Super)</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center space-x-1 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-bold">{u.branchName || 'All Terminals / HQ'}</span>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        u.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions toggle */}
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin && u.id !== dbUser?.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          {u.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => handleUpdateUser(u.id, { status: 'Active' })}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateUser(u.id, { status: 'Deactivated' })}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                              >
                                Deny
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpdateUser(u.id, { status: u.status === 'Active' ? 'Deactivated' : 'Active' })}
                                title={u.status === 'Active' ? 'Deactivate account' : 'Activate account'}
                                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                {u.status === 'Active' ? (
                                  <ToggleRight className="w-7 h-7 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="w-7 h-7 text-slate-300" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Delete User"
                                className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-2 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800">Edit User Details</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800">Add New User</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Branch</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="">None / HQ</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
