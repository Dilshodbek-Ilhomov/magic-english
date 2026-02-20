'use client';

/**
 * AuthContext - Foydalanuvchi autentifikatsiya holati
 * JWT token va user ma'lumotlarini boshqaradi
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Foydalanuvchi ma'lumotlarini yuklash
    const loadUser = useCallback(async () => {
        const token = Cookies.get('access_token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await api.getProfile();
            if (res.success) {
                setUser(res.data);
            } else {
                // Token eskirgan
                Cookies.remove('access_token');
                Cookies.remove('refresh_token');
            }
        } catch (err) {
            console.error('Profil yuklashda xato:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // Kirish
    const login = async (username, password) => {
        const { getDeviceId, getDeviceName } = await import('@/lib/utils');
        const res = await api.login(username, password, getDeviceId(), getDeviceName());
        if (res.success) {
            setUser(res.data.user);
        }
        return res;
    };

    const forceDisconnect = async (username, password, device_pk) => {
        const res = await api.forceDisconnectDevice(username, password, device_pk);
        return res;
    };

    // Chiqish
    const logout = async () => {
        await api.logoutApi();
        setUser(null);
    };

    // Profilni yangilash
    const updateProfile = async (data) => {
        const res = await api.updateProfile(data);
        if (res.success) {
            setUser(res.data);
        }
        return res;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        forceDisconnect,
        updateProfile,
        loadUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth faqat AuthProvider ichida ishlatilishi kerak');
    }
    return context;
}

export default AuthContext;
