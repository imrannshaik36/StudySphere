import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('studysphere_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem('studysphere_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('studysphere_user');
        }
    }, [user]);

    const login = async (email, password) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            setUser({ id: data._id, name: data.name, email: data.email, token: data.token });
            return { success: true };
        } else {
            throw new Error(data.message || 'Login failed');
        }
    };

    const register = async (name, email, password) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.success) {
            setUser({ id: data._id, name: data.name, email: data.email, token: data.token });
            return { success: true };
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
