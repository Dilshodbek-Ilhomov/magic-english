import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
    /**
     * Asosiy so'rov yuborish funksiyasi (fetch)
     */
    async request(endpoint, options = {}) {
        const token = Cookies.get('access_token');

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
            ...options,
        };

        // FormData uchun Content-Type ni olib tashlash
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);

            // 401 - Token muddati o'tgan, refresh qilish
            if (response.status === 401 && token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Qayta urinish yangi token bilan
                    const newToken = Cookies.get('access_token');
                    config.headers.Authorization = `Bearer ${newToken}`;
                    const retryResponse = await fetch(`${API_URL}${endpoint}`, config);
                    return this.handleResponse(retryResponse);
                } else {
                    // Refresh ham muvaffaqiyatsiz - chiqish
                    this.logout();
                    window.location.href = '/login';
                    return { success: false, error: { message: 'Sessiya muddati tugadi' } };
                }
            }

            return this.handleResponse(response);
        } catch (error) {
            console.error('API xatosi:', error);
            return {
                success: false,
                error: { message: 'Serverga ulanib bo\'lmadi' },
            };
        }
    }

    /**
     * Axios orqali yuklash (progress bilan)
     */
    async uploadRequest(endpoint, formData, onProgress) {
        const token = Cookies.get('access_token');
        try {
            const res = await axios.post(`${API_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percentCompleted);
                    }
                },
            });
            return { success: true, data: res.data.data }; // Axios data ichida data bor
        } catch (error) {
            console.error('Upload Error:', error);
            const msg = error.response?.data?.error?.message
                || error.response?.data?.error
                || 'Upload failed';
            return { success: false, error: { message: msg } };
        }
    }

    async handleResponse(response) {
        try {
            const data = await response.json();
            return data;
        } catch {
            return {
                success: false,
                error: { message: 'Javobni o\'qishda xatolik' },
            };
        }
    }

    /**
     * Token yangilash
     */
    async refreshToken() {
        const refreshToken = Cookies.get('refresh_token');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_URL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                Cookies.set('access_token', data.access, { expires: 1 });
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Chiqish - tokenlarni tozalash
     */
    logout() {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
    }

    // ===== AUTH =====
    async login(username, password, device_id, device_name) {
        const res = await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password, device_id, device_name }),
        });
        if (res.success) {
            Cookies.set('access_token', res.data.access, { expires: 1 });
            Cookies.set('refresh_token', res.data.refresh, { expires: 7 });
        }
        return res;
    }

    async forceDisconnectDevice(username, password, device_pk) {
        return await this.request('/auth/force-disconnect/', {
            method: 'POST',
            body: JSON.stringify({ username, password, device_pk })
        });
    }

    async deleteDevice(pk) {
        return await this.request(`/profile/devices/${pk}/`, {
            method: 'DELETE'
        });
    }

    async logoutApi() {
        const refreshToken = Cookies.get('refresh_token');
        const res = await this.request('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh: refreshToken }),
        });
        this.logout();
        return res;
    }

    // ===== PROFIL =====
    async getProfile() {
        return this.request('/profile/');
    }

    async updateProfile(data) {
        return this.request('/profile/', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        return this.request('/profile/avatar/', {
            method: 'POST',
            body: formData,
        });
    }

    // ===== KURSLAR =====
    async getCourses(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/courses/${query ? '?' + query : ''}`);
    }

    async getCourse(id) {
        return this.request(`/courses/${id}/`);
    }

    // ===== VIDEOLAR =====
    async getVideos(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/videos/${query ? '?' + query : ''}`);
    }

    async getVideo(id, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/videos/${id}/${query ? '?' + query : ''}`);
    }

    async getVideoStreamUrl(id, token, res = '') {
        const params = new URLSearchParams({
            expires: token.expires,
            signature: token.signature,
            user_id: token.user_id,
        });
        if (res) params.append('res', res);
        return `${API_URL}/videos/${id}/stream/?${params.toString()}`;
    }

    async updateProgress(videoId, data) {
        return this.request(`/videos/${videoId}/progress/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ===== ADMIN - FOYDALANUVCHILAR =====
    async getUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/users/${query ? '?' + query : ''}`);
    }

    async createUser(data) {
        return this.request('/admin/users/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id, data) {
        return this.request(`/admin/users/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id) {
        return this.request(`/admin/users/${id}/`, {
            method: 'DELETE',
        });
    }

    async toggleBlockUser(id) {
        return this.request(`/admin/users/${id}/block/`, {
            method: 'PATCH',
        });
    }

    // ===== ADMIN - VIDEOLAR =====
    async adminGetVideos(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/videos/${query ? '?' + query : ''}`);
    }

    async adminCreateVideo(formData, onProgress) {
        return this.uploadRequest('/admin/videos/', formData, onProgress);
    }

    async adminUpdateVideo(id, formData) {
        return this.request(`/admin/videos/${id}/`, {
            method: 'PUT',
            body: formData,
        });
    }

    async adminDeleteVideo(id) {
        return this.request(`/admin/videos/${id}/`, {
            method: 'DELETE',
        });
    }

    // ===== ADMIN - ANALYTICS =====
    async getDashboard() {
        return this.request('/admin/analytics/');
    }

    async getUserAnalytics(userId) {
        return this.request(`/admin/analytics/user/${userId}/`);
    }

    async getSecurityLogs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/logs/${query ? '?' + query : ''}`);
    }

    // ===== ADMIN - KURSLAR =====
    async adminGetCourses() {
        return this.request('/admin/courses/');
    }

    async adminCreateCourse(data) {
        return this.request('/admin/courses/', {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    async adminUpdateCourse(id, data) {
        return this.request(`/admin/courses/${id}/`, {
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    async adminDeleteCourse(id) {
        return this.request(`/admin/courses/${id}/`, { method: 'DELETE' });
    }

    // ===== ADMIN - VIDEOLAR =====
    async adminGetVideos(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/videos/${query ? '?' + query : ''}`);
    }

    async adminCreateVideo(formData, onProgress) {
        // FormData uchun 'true' flag (isMultipart)
        return this.request('/admin/videos/', {
            method: 'POST',
            body: formData,
        }, true);
    }

    async adminUpdateVideo(id, data) {
        // Agar data FormData bo'lsa (fayl yuklanayotgan bo'lsa)
        if (data instanceof FormData) {
            return this.request(`/admin/videos/${id}/`, {
                method: 'PATCH',
                body: data,
            }, true);
        }
        // Oddiy JSON update (masalan status o'zgartirish)
        return this.request(`/admin/videos/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async adminDeleteVideo(id) {
        return this.request(`/admin/videos/${id}/`, { method: 'DELETE' });
    }

    // ===== QUIZ SUBMISSION =====
    async submitQuiz(videoId, answers) {
        return this.request(`/videos/${videoId}/quiz/`, {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }

    // ===== ADMIN - QUIZ / TESTLAR =====
    async adminGetQuestions(videoId) {
        return this.request(`/admin/questions/?video_id=${videoId}`);
    }

    async adminCreateQuestion(data) {
        return this.request('/admin/questions/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async adminUpdateQuestion(id, data) {
        return this.request(`/admin/questions/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async adminDeleteQuestion(id) {
        return this.request(`/admin/questions/${id}/`, {
            method: 'DELETE',
        });
    }

    async adminCreateChoice(data) {
        return this.request('/admin/choices/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async adminDeleteChoice(id) {
        return this.request(`/admin/choices/${id}/`, {
            method: 'DELETE',
        });
    }
    // === CMS ===
    async getLandingSections() {
        return this.request('/cms/landing/');
    }

    async getLandingContent() {
        return this.getLandingSections();
    }

    async adminGetLandingSections() {
        return this.request('/cms/admin/sections/');
    }

    async adminCreateLandingSection(data) {
        return this.request('/cms/admin/sections/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async adminUpdateLandingSection(id, data) {
        return this.request(`/cms/admin/sections/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async adminDeleteLandingSection(id) {
        return this.request(`/cms/admin/sections/${id}/`, { method: 'DELETE' });
    }
}


const api = new ApiClient();
export default api;
