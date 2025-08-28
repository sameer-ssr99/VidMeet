export const handleApiError = (error) => {
  console.error('API Error:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });

  if (error.response?.status === 401) {
    localStorage.removeItem("token");
    return "Authentication failed. Please login again.";
  }

  return error.response?.data?.message || error.message || "An unexpected error occurred";
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));