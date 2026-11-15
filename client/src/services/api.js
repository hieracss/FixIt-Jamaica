
const API_URL = import.meta.env.VITE_API_URL;

// Reusable function for communicating with our backend
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// Get all maintenance categories
export function getCategories() {
  return apiRequest("/categories");
}

// Get all dormitories
export function getDormitories() {
  return apiRequest("/dormitories");
}

// Register a new student
export function registerStudent(studentData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(studentData),
  });
}

// Log in an existing student
export function loginStudent(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// Get the currently authenticated student
export function getCurrentUser(token) {
  return apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Submit a maintenance report, including photographs
export async function submitReport(reportData, token) {
  const response = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: reportData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to submit report.");
  }

  return data;
}

export async function getMyReports(token) {
  const response = await fetch(`${API_URL}/reports/my-reports`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to retrieve reports.");
  }

  return data;
}


export async function getStudentDashboard(token) {
  const response = await fetch(`${API_URL}/reports/dashboard`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to retrieve dashboard information."
    );
  }

  return result.data;
}

export async function getReportDetails(reportId, token) {
  const response = await fetch(
    `${API_URL}/reports/${reportId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to retrieve report details.");
  }

  return data;
}
export async function getAdminReports(token) {
  const response = await fetch(
    `${API_URL}/admin/reports`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to retrieve maintenance reports."
    );
  }

  return result.data;
}


export async function getAdminReportDetails(reportId, token) {
  const response = await fetch(
    `${API_URL}/admin/reports/${reportId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to retrieve report details."
    );
  }

  return result.data;
}

 // Get all registered technicians
export async function getAdminTechnicians(token) {
  const response = await fetch(`${API_URL}/admin/technicians`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to retrieve technicians.");
  }

  return result.data;
}

// Assign a technician to a maintenance report
export async function assignTechnician(reportId, technicianId, token) {
  const response = await fetch(
    `${API_URL}/admin/reports/${reportId}/assign`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        technician_id: technicianId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to assign technician.");
  }

  return result;
}

// Update a maintenance report's status and add a note
export async function updateReportStatus(reportId, status, note, token) {
  const response = await fetch(
    `${API_URL}/admin/reports/${reportId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        note,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to update report status.");
  }

  return result;
}
export async function getTechnicianDashboard(token) {
  const response = await fetch(`${API_URL}/technician/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to load technician dashboard.");
  }

  return result.data;
}

export async function getTechnicianJobDetails(reportId, token) {
  const response = await fetch(
    `${API_URL}/technician/reports/${reportId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to load maintenance job details."
    );
  }

  return result.data;
}


export async function updateTechnicianJobStatus(reportId, status, note, token) {
  const response = await fetch(
    `${API_URL}/technician/reports/${reportId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        note,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to update maintenance report."
    );
  }

  return result;
}

/* =========================================
   ADMIN USER MANAGEMENT
========================================= */

// Get all registered users with optional filters
export async function getAdminUsers(token, filters = {}) {
  const params = new URLSearchParams();

  if (filters.role) {
    params.append("role", filters.role);
  }

  if (filters.search) {
    params.append("search", filters.search);
  }

  if (filters.status) {
    params.append("status", filters.status);
  }

  const queryString = params.toString();

  const result = await apiRequest(
    `/admin/users${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return result.data;
}

// Create a new user account
export async function createAdminUser(userData, token) {
  return apiRequest("/admin/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
}

// Edit an existing user's details
export async function updateAdminUser(userId, userData, token) {
  return apiRequest(`/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
}

// Activate or deactivate a user account
export async function updateAdminUserStatus(userId, isActive, token) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      is_active: isActive,
    }),
  });
}
