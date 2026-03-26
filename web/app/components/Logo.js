import React, {useState, useEffect} from 'react';

// Returns the current theme by checking the <html> class
function getCurrentTheme() {
    if (typeof document === 'undefined') return 'wine';
    const html = document.documentElement;
    if (html.classList.contains('light')) return 'light';
    return 'dark';
}

export function Logo({className = '', size = 'md'}) {
    const [theme, setTheme] = useState(getCurrentTheme);

    useEffect(() => {
        // Watch for theme changes on <html>
        const observer = new MutationObserver(() => {
            setTheme(getCurrentTheme());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const src = theme === 'light' ? '/images/logo-light.png' : '/images/logo-dark.png';

    const sizeClasses = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-16',
        xl: 'h-24',
    };

    return (
        <img
            src={src}
            alt="Samba Conductor"
            className={`${sizeClasses[size] || sizeClasses.md} w-auto ${className}`}
        />
    );
}
