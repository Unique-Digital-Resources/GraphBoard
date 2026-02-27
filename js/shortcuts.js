const shortcuts = new Map();

export function registerShortcut(key, callback, context = null) {
    const handler = (e) => callback.call(context, e);
    shortcuts.set(key, { callback: handler, context });
    
    if (key.includes('+')) {
        const parts = key.split('+');
        const modifiers = parts.slice(0, -1);
        const mainKey = parts[parts.length - 1].toLowerCase();
        
        window.addEventListener('keydown', (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const alt = e.altKey;
            
            let hasCtrl = modifiers.includes('ctrl');
            let hasShift = modifiers.includes('shift');
            let hasAlt = modifiers.includes('alt');
            
            if (e.key.toLowerCase() === mainKey && 
                ctrl === hasCtrl && 
                shift === hasShift && 
                alt === hasAlt) {
                handler(e);
            }
        });
    }
}

export function triggerShortcut(key) {
    const shortcut = shortcuts.get(key);
    if (shortcut) {
        shortcut.callback();
    }
}

export function initShortcuts() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        if ((e.ctrlKey || e.metaKey) && key === 'a') {
            e.preventDefault();
            const shortcut = shortcuts.get('a');
            if (shortcut) shortcut.callback(e);
        }
    });
}
