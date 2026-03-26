import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';

export function OUPicker({value, onChange, placeholder = 'Select OU (optional)', className = ''}) {
    const [open, setOpen] = useState(false);
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || tree.length > 0) return;

        async function fetchTree() {
            setLoading(true);
            try {
                const result = await Meteor.callAsync('samba.ous.list');
                setTree(result);
            } catch (error) {
                console.error('[OUPicker] Failed to load OUs:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTree();
    }, [open]);

    function handleSelect({dn}) {
        onChange(dn);
        setOpen(false);
    }

    function handleClear() {
        onChange('');
        setOpen(false);
    }

    // Extract display name from DN
    const displayValue = value ? extractDisplayPath({dn: value}) : '';

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full text-left rounded-lg border border-border bg-surface-input px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
                    value ? 'text-fg' : 'text-fg-muted'
                } ${className}`}
            >
                <div className="flex items-center justify-between">
                    <span className="truncate">{displayValue || placeholder}</span>
                    <svg className="h-4 w-4 shrink-0 text-fg-muted" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/>
                    </svg>
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
                    <div
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-card shadow-xl">
                        {loading ? (
                            <div className="px-3 py-4 text-center text-sm text-fg-muted">Loading...</div>
                        ) : (
                            <div className="py-1">
                                {/* Root option (no OU = default container) */}
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-surface-hover ${
                                        !value ? 'text-accent font-medium' : 'text-fg-secondary'
                                    }`}
                                >
                                    (Default — CN=Users)
                                </button>

                                {tree.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-fg-muted">No OUs found</div>
                                ) : (
                                    tree.map((ou) => (
                                        <OUPickerNode
                                            key={ou.dn}
                                            ou={ou}
                                            depth={0}
                                            selectedDn={value}
                                            onSelect={handleSelect}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function OUPickerNode({ou, depth, selectedDn, onSelect}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = ou.children && ou.children.length > 0;
    const isSelected = selectedDn === ou.dn;

    return (
        <div>
            <div
                className={`flex items-center gap-1 px-3 py-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/20 text-accent' : 'text-fg-secondary hover:bg-surface-hover'
                }`}
                style={{paddingLeft: `${depth * 16 + 12}px`}}
            >
                {/* Expand/collapse */}
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded((prev) => !prev);
                        }}
                        className="shrink-0 w-4 h-4 flex items-center justify-center text-fg-muted"
                    >
                        <svg className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                             fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                  clipRule="evenodd"/>
                        </svg>
                    </button>
                ) : (
                    <span className="shrink-0 w-4"/>
                )}

                {/* Folder icon + name */}
                <button
                    type="button"
                    onClick={() => onSelect({dn: ou.dn})}
                    className="flex items-center gap-2 flex-1 min-w-0"
                >
                    <svg className="h-4 w-4 shrink-0 text-fg-muted" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
                    </svg>
                    <span className="text-sm truncate">{ou.name}</span>
                </button>
            </div>

            {expanded && hasChildren && (
                <div>
                    {ou.children.map((child) => (
                        <OUPickerNode
                            key={child.dn}
                            ou={child}
                            depth={depth + 1}
                            selectedDn={selectedDn}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Extracts a readable path from a DN like "OU=Sub,OU=Parent,DC=..." → "Parent / Sub"
function extractDisplayPath({dn}) {
    const parts = [];
    const regex = /OU=([^,]+)/gi;
    let match = regex.exec(dn);

    while (match) {
        parts.unshift(match[1]);
        match = regex.exec(dn);
    }

    return parts.join(' / ') || dn;
}
