export const domPlatform = {
    async copyText(text) {
        await navigator.clipboard.writeText(text);
    },
    openUrl(url, options) {
        if (options?.sameTab)
            window.location.href = url;
        else
            window.open(url, '_blank', 'noopener,noreferrer');
    },
    saveFile(name, content, mimeType) {
        const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    storage: {
        get(key) {
            try {
                return localStorage.getItem(key);
            }
            catch {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, value);
            }
            catch {
                /* storage may be unavailable: the preference lasts for this session only */
            }
        },
    },
    isHidden: () => typeof document !== 'undefined' && document.hidden,
    onVisibilityChange(listener) {
        if (typeof document === 'undefined')
            return () => undefined;
        document.addEventListener('visibilitychange', listener);
        return () => document.removeEventListener('visibilitychange', listener);
    },
    onForeground(listener) {
        if (typeof window === 'undefined')
            return () => undefined;
        window.addEventListener('focus', listener);
        return () => window.removeEventListener('focus', listener);
    },
};
