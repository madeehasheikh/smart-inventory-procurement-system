import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

axios.defaults.baseURL = 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sipms_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('sipms_refresh'));
  const [isLoading, setIsLoading] = useState(true);

  // Set auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('sipms_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('sipms_token');
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('sipms_refresh', refreshToken);
    } else {
      localStorage.removeItem('sipms_refresh');
    }
  }, [refreshToken]);

  // Validate session on app boot
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await axios.get('/api/auth/profile');
          setUser(res.data);
        } catch (err) {
          // Token might be expired, try refreshing
          if (refreshToken) {
            try {
              const refreshRes = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
              setToken(refreshRes.data.access_token);
              setRefreshToken(refreshRes.data.refresh_token);
              const profileRes = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${refreshRes.data.access_token}` }
              });
              setUser(profileRes.data);
            } catch (refreshErr) {
              logout();
            }
          } else {
            logout();
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Axios interceptor to auto-refresh tokens on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
          originalRequest._retry = true;
          try {
            const refreshRes = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
            const newAccessToken = refreshRes.data.access_token;
            setToken(newAccessToken);
            setRefreshToken(refreshRes.data.refresh_token);
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshErr) {
            logout();
            return Promise.reject(refreshErr);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshToken]);

  const login = async (email, password, rememberMe = false) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password, remember_me: rememberMe });
      setToken(res.data.access_token);
      setRefreshToken(res.data.refresh_token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      throw err.response?.data?.detail || 'Login failed';
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role, departmentId) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role,
        department_id: departmentId
      });
      setToken(res.data.access_token);
      setRefreshToken(res.data.refresh_token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      throw err.response?.data?.detail || 'Registration failed';
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const updateProfile = async (updateData) => {
    try {
      const res = await axios.put('/api/auth/profile', updateData);
      setUser(res.data);
      return res.data;
    } catch (err) {
      throw err.response?.data?.detail || 'Update profile failed';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
