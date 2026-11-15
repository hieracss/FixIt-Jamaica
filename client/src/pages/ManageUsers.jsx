
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  Users,
  UserPlus,
  Pencil,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";
import { useAuth } from "../context/AuthContext";

import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  updateAdminUserStatus,
} from "../services/api";

import "./ManageUsers.css";

function ManageUsers() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
  student_id: "",
  full_name: "",
  email: "",
  password: "",
  role: "student",
  specialization: "",
});

  const token = localStorage.getItem("fixit_token");

  // LOAD USERS
  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminUsers(token);
      setUsers(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // FILTER USERS
  const filteredUsers = useMemo(() => {
    return users.filter((account) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        account.full_name?.toLowerCase().includes(searchTerm) ||
        account.student_id?.toLowerCase().includes(searchTerm) ||
        account.email?.toLowerCase().includes(searchTerm);

      const matchesRole =
        roleFilter === "all" || account.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && account.is_active === 1) ||
        (statusFilter === "inactive" && account.is_active === 0);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // SUMMARY STATISTICS
  const totalUsers = users.length;
  const activeUsers = users.filter((account) => account.is_active === 1).length;
  const students = users.filter((account) => account.role === "student").length;
  const technicians = users.filter(
    (account) => account.role === "technician"
  ).length;

  // OPEN CREATE MODAL
  function openCreateModal() {
    setEditingUser(null);

    setFormData({
      student_id: "",
      full_name: "",
      email: "",
      password: "",
      role: "student",
    specialization: "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  // OPEN EDIT MODAL
  function openEditModal(account) {
    setEditingUser(account);

   setFormData({
  student_id: account.student_id || "",
  full_name: account.full_name || "",
  email: account.email || "",
  password: "",
  role: account.role,
  specialization: account.specialization || "",
});

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  // HANDLE FORM INPUTS
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // SAVE USER
  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingUser) {
        await updateAdminUser(
          editingUser.id,
        {
  student_id: formData.student_id,
  full_name: formData.full_name,
  email: formData.email,
  specialization: formData.specialization,
},
          token
        );

        setSuccess("User account updated successfully.");

      } else {
        await createAdminUser(formData, token);

        setSuccess("User account created successfully.");
      }

      setShowModal(false);
      await loadUsers();

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ACTIVATE OR DEACTIVATE ACCOUNT
  async function toggleAccountStatus(account) {
    const activating = account.is_active === 0;

    const confirmed = window.confirm(
      activating
        ? `Activate ${account.full_name}'s account?`
        : `Deactivate ${account.full_name}'s account?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await updateAdminUserStatus(
        account.id,
        activating,
        token
      );

      setSuccess(
        activating
          ? "User account activated successfully."
          : "User account deactivated successfully."
      );

      await loadUsers();

    } catch (err) {
      setError(err.message);
    }
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
    setError("");
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">

        {/* HEADER */}
        <header className="admin-header">
          <div>
            <span className="admin-breadcrumb">
              Workspace / Manage Users
            </span>
            <h1>Manage Users</h1>
          </div>

          <div className="admin-header-tag">
            <span></span>
            Administration Portal
          </div>
        </header>

        {/* WELCOME */}
        <section className="manage-users-welcome">
          <div>
            <h2>User Management</h2>
            <p>
              Create, review and manage student, technician and
              administrator accounts.
            </p>
          </div>

          <button
            className="manage-users-create-button"
            onClick={openCreateModal}
          >
            <UserPlus size={18} />
            Create User
          </button>
        </section>

        {/* SUMMARY CARDS */}
        <section className="manage-users-summary">
          <div className="manage-users-stat">
            <div className="manage-users-stat-icon blue">
              <Users size={20} />
            </div>
            <div>
              <strong>{totalUsers}</strong>
              <span>Total Users</span>
            </div>
          </div>

          <div className="manage-users-stat">
            <div className="manage-users-stat-icon green">
              <UserCheck size={20} />
            </div>
            <div>
              <strong>{activeUsers}</strong>
              <span>Active Accounts</span>
            </div>
          </div>

          <div className="manage-users-stat">
            <div className="manage-users-stat-icon purple">
              <Users size={20} />
            </div>
            <div>
              <strong>{students}</strong>
              <span>Students</span>
            </div>
          </div>

          <div className="manage-users-stat">
            <div className="manage-users-stat-icon orange">
              <UserCheck size={20} />
            </div>
            <div>
              <strong>{technicians}</strong>
              <span>Technicians</span>
            </div>
          </div>
        </section>

        {/* FEEDBACK */}
        {success && (
          <div className="manage-users-success">
            {success}
          </div>
        )}

        {error && !showModal && (
          <div className="manage-users-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* USERS TABLE */}
        <section className="manage-users-card">

          <div className="manage-users-card-heading">
            <div>
              <h2>Registered Accounts</h2>
              <p>
                {filteredUsers.length} of {users.length} users displayed
              </p>
            </div>

            <button
              className="manage-users-refresh"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh users"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {/* FILTERS */}
          <div className="manage-users-filters">

            <div className="manage-users-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search name, student ID or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="manage-users-select">
              <SlidersHorizontal size={16} />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="technician">Technicians</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <div className="manage-users-select">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All account statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

          </div>

          {/* TABLE CONTENT */}
          {loading ? (
            <div className="manage-users-message">
              <RefreshCw size={20} />
              Loading registered users...
            </div>
          ) : error && users.length === 0 ? (
            <div className="manage-users-error">
              <AlertCircle size={20} />
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="manage-users-empty">
              No user accounts match your search or filters.
            </div>
          ) : (
            <div className="manage-users-table-wrapper">
              <table className="manage-users-table">
                <thead>
                  <tr>
                    <th>USER</th>
<th>STUDENT ID</th>
<th>ROLE</th>
<th>SPECIALIZATION</th>
<th>REPORTS</th>
<th>STATUS</th>
<th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((account) => {
                    const isSelf = Number(account.id) === Number(user?.id);

                    return (
                      <tr key={account.id}>
                        <td>
                          <div className="manage-users-identity">
                            <div className="manage-users-avatar">
                              {account.full_name?.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <strong>{account.full_name}</strong>
                              <span>{account.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {account.student_id || "—"}
                        </td>

                        <td>
                          <span className={`manage-users-role ${account.role}`}>
                            {account.role}
                          </span>
                        </td>
                        <td>
  {account.role === "technician"
    ? {
        plumber: "Plumber",
        electrician: "Electrician",
        carpenter: "Carpenter",
        general_maintenance: "General Maintenance",
      }[account.specialization] || "Not specified"
    : "—"}
</td>
                        <td>
                          {account.role === "student"
                            ? account.reports_submitted
                            : account.role === "technician"
                              ? account.assigned_reports
                              : "—"}
                        </td>

                        <td>
                          <span
                            className={`manage-users-status ${
                              account.is_active === 1 ? "active" : "inactive"
                            }`}
                          >
                            {account.is_active === 1 ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="manage-users-actions">

                            <button
                              className="manage-users-edit"
                              onClick={() => openEditModal(account)}
                              title="Edit account"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              className={
                                account.is_active === 1
                                  ? "manage-users-deactivate"
                                  : "manage-users-activate"
                              }
                              onClick={() => toggleAccountStatus(account)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot deactivate your own account"
                                  : account.is_active === 1
                                    ? "Deactivate account"
                                    : "Activate account"
                              }
                            >
                              {account.is_active === 1
                                ? <UserX size={16} />
                                : <UserCheck size={16} />}
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </section>
      </main>

      {/* CREATE / EDIT USER MODAL */}
      {showModal && (
        <div className="manage-users-modal-overlay">
          <div className="manage-users-modal">

            <div className="manage-users-modal-heading">
              <div>
                <h2>
                  {editingUser ? "Edit User Account" : "Create User Account"}
                </h2>

                <p>
                  {editingUser
                    ? "Update the user's account information."
                    : "Enter the information required to create an account."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="manage-users-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="manage-users-error">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="manage-users-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="manage-users-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="manage-users-form-group">
                <label>Student / Staff ID</label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="Enter ID (required for students and technicians)"
                  required={formData.role !== "admin"}
                />
              </div>

              {!editingUser && (
                <>
                  <div className="manage-users-form-group">
                    <label>Account Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="student">Student</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="manage-users-form-group">
                    <label>Temporary Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      required
                    />
                  </div>
                </>
              )}
              {formData.role === "technician" && (
  <div className="manage-users-form-group">
    <label>Technician Specialization</label>

    <select
      name="specialization"
      value={formData.specialization}
      onChange={handleChange}
      required
    >
      <option value="">Select specialization</option>
      <option value="plumber">Plumber</option>
      <option value="electrician">Electrician</option>
      <option value="carpenter">Carpenter</option>
      <option value="general_maintenance">
        General Maintenance
      </option>
    </select>
  </div>
)}
              {editingUser && (
                <div className="manage-users-form-note">
                  Account role and password are not changed here.
                </div>
              )}

              <div className="manage-users-modal-actions">
                <button
                  type="button"
                  className="manage-users-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="manage-users-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingUser
                      ? "Save Changes"
                      : "Create Account"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageUsers;
