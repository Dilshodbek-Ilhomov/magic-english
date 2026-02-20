/**
 * Umumiy yordamchi funksiyalar
 */

export const getDeviceId = () => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_id', id);
    }
    return id;
};

export const getDeviceName = () => {
    if (typeof window === 'undefined') return 'Noma\'lum';
    const ua = navigator.userAgent;
    let platform = 'Qurilma';

    if (ua.includes('iPhone')) platform = 'iPhone';
    else if (ua.includes('Android')) platform = 'Android';
    else if (ua.includes('Windows')) platform = 'Windows PC';
    else if (ua.includes('Macintosh')) platform = 'Mac';
    else if (ua.includes('Linux')) platform = 'Linux PC';

    const browser = ua.includes('Chrome') ? 'Chrome' :
        ua.includes('Firefox') ? 'Firefox' :
            ua.includes('Safari') ? 'Safari' : 'Brauzer';

    return `${platform} (${browser})`;
};
