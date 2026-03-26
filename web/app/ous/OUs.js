import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

export function OUs() {
    const {openAlert} = useAlert();
    const [tree, setTree] = useState([]);
    const [selectedOu, setSelectedOu] = useState(null);
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingObjects, setLoadingObjects] = useState(false);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Rename
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameName, setRenameName] = useState('');

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function fetchTree() {
        try {
            const result = await Meteor.callAsync('samba.ous.list');
            setTree(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load OUs');
        } finally {
            setLoading(false);
        }
    }

    async function fetchObjects({ouDn}) {
        setLoadingObjects(true);
        try {
            const result = await Meteor.callAsync('samba.ous.listObjects', {ouDn});
            setObjects(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load objects');
            setObjects([]);
        } finally {
            setLoadingObjects(false);
        }
    }

    useEffect(() => {
        fetchTree();
    }, []);

    function handleSelectOU({ou}) {
        setSelectedOu(ou);
        fetchObjects({ouDn: ou.dn});
    }

    async function handleCreate() {
        if (!createName.trim()) return;
        setCreating(true);
        try {
            await Meteor.callAsync('samba.ous.create', {
                name: createName.trim(),
                description: createDesc.trim(),
                parentOu: selectedOu?.dn || '',
            });
            setCreateName('');
            setCreateDesc('');
            setShowCreate(false);
            openAlert('OU created successfully');
            await fetchTree();
        } catch (error) {
            openAlert(error.reason || 'Failed to create OU');
        } finally {
            setCreating(false);
        }
    }

    async function handleRename() {
        if (!renameName.trim() || !renameTarget) return;
        try {
            await Meteor.callAsync('samba.ous.rename', {
                ouDn: renameTarget.dn,
                newName: renameName.trim(),
            });
            setRenameTarget(null);
            setRenameName('');
            openAlert('OU renamed successfully');
            await fetchTree();
        } catch (error) {
            openAlert(error.reason || 'Failed to rename OU');
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('samba.ous.delete', {ouDn: deleteTarget.dn});
            setDeleteTarget(null);
            if (selectedOu?.dn === deleteTarget.dn) {
                setSelectedOu(null);
                setObjects([]);
            }
            openAlert('OU deleted successfully');
            await fetchTree();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete OU');
        }
    }

    if (loading) return <Loading/>;

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fg">Organizational Units</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Manage Active Directory organizational structure</p>
                </div>
                <Button primary onClick={() => setShowCreate(true)} data-e2e="ous-btn-new">
                    New OU
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Tree */}
                <div className="rounded-xl bg-surface-card border border-border p-4">
                    <h2 className="text-sm font-semibold text-fg mb-3">OU Tree</h2>
                    {tree.length === 0 ? (
                        <p className="text-sm text-fg-muted py-4 text-center">No organizational units</p>
                    ) : (
                        <div className="space-y-0.5">
                            {tree.map((ou) => (
                                <OUTreeNode
                                    key={ou.dn}
                                    ou={ou}
                                    depth={0}
                                    selectedDn={selectedOu?.dn}
                                    onSelect={handleSelectOU}
                                    onRename={({ou: target}) => {
                                        setRenameTarget(target);
                                        setRenameName(target.name);
                                    }}
                                    onDelete={({ou: target}) => setDeleteTarget(target)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Objects panel */}
                <div className="rounded-xl bg-surface-card border border-border p-4">
                    {selectedOu ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-fg truncate">{selectedOu.name}</h2>
                                {selectedOu.description && (
                                    <span className="text-xs text-fg-muted ml-2">{selectedOu.description}</span>
                                )}
                            </div>

                            {loadingObjects ? (
                                <Loading/>
                            ) : objects.length === 0 ? (
                                <p className="text-sm text-fg-muted py-4 text-center">No objects in this OU</p>
                            ) : (
                                <div className="space-y-1">
                                    {objects.map((obj) => (
                                        <div key={obj.dn}
                                             className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover">
                                            <ObjectTypeIcon type={obj.type}/>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-fg truncate">{obj.name}</p>
                                                {obj.description &&
                                                    <p className="text-xs text-fg-muted truncate">{obj.description}</p>}
                                            </div>
                                            <span className="text-xs text-fg-muted capitalize">{obj.type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-fg-muted py-8 text-center">Select an OU to view its contents</p>
                    )}
                </div>
            </div>

            {/* Create OU modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New Organizational Unit</h3>
                        {selectedOu && (
                            <p className="text-xs text-fg-muted mb-3">
                                Parent: <span className="text-fg-secondary">{selectedOu.name}</span>
                            </p>
                        )}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Name</label>
                                <input
                                    type="text"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    placeholder="Engineering"
                                    autoFocus
                                    data-e2e="ous-create-input-name"
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
                                <input
                                    type="text"
                                    value={createDesc}
                                    onChange={(e) => setCreateDesc(e.target.value)}
                                    placeholder="Optional description"
                                    data-e2e="ous-create-input-description"
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)} data-e2e="ous-create-btn-cancel">Cancel</Button>
                            <Button primary onClick={handleCreate} disabled={creating || !createName.trim()} data-e2e="ous-create-btn-submit">
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename modal */}
            {renameTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setRenameTarget(null)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">Rename OU</h3>
                        <div>
                            <label className="block text-xs font-medium text-fg-secondary mb-1">New Name</label>
                            <input
                                type="text"
                                value={renameName}
                                onChange={(e) => setRenameName(e.target.value)}
                                autoFocus
                                data-e2e="ous-rename-input-name"
                                className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setRenameTarget(null)} data-e2e="ous-rename-btn-cancel">Cancel</Button>
                            <Button primary onClick={handleRename} disabled={!renameName.trim()} data-e2e="ous-rename-btn-submit">Rename</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete OU"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? The OU must be empty.`}
                confirmLabel="Delete"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                data-e2e="ous-delete"
            />
        </div>
    );
}

// Recursive tree node component
function OUTreeNode({ou, depth, selectedDn, onSelect, onRename, onDelete}) {
    const [expanded, setExpanded] = useState(true);
    const isSelected = selectedDn === ou.dn;
    const hasChildren = ou.children && ou.children.length > 0;

    return (
        <div>
            <div
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/20 text-accent' : 'hover:bg-surface-hover text-fg-secondary'
                }`}
                style={{paddingLeft: `${depth * 16 + 8}px`}}
            >
                {/* Expand/collapse */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((prev) => !prev);
                    }}
                    className={`shrink-0 w-5 h-5 flex items-center justify-center text-fg-muted ${hasChildren ? '' : 'invisible'}`}
                >
                    <svg className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="currentColor"
                         viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"/>
                    </svg>
                </button>

                {/* Folder icon */}
                <svg className="h-4 w-4 shrink-0 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
                </svg>

                {/* Name */}
                <span
                    className="flex-1 text-sm truncate"
                    onClick={() => onSelect({ou})}
                    data-e2e="ous-tree-item"
                >
          {ou.name}
        </span>

                {/* Actions */}
                <div className="flex shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRename({ou});
                        }}
                        className="p-1 text-xs text-fg-muted hover:text-accent"
                        title="Rename"
                        data-e2e="ous-btn-rename"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                             strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"/>
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete({ou});
                        }}
                        className="p-1 text-xs text-fg-muted hover:text-red-400"
                        title="Delete"
                        data-e2e="ous-btn-delete"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                             strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div>
                    {ou.children.map((child) => (
                        <OUTreeNode
                            key={child.dn}
                            ou={child}
                            depth={depth + 1}
                            selectedDn={selectedDn}
                            onSelect={onSelect}
                            onRename={onRename}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Icon based on object type
function ObjectTypeIcon({type}) {
    const iconClass = 'h-4 w-4 shrink-0 text-fg-muted';

    if (type === 'user') {
        return (
            <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/>
            </svg>
        );
    }

    if (type === 'group') {
        return (
            <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584"/>
            </svg>
        );
    }

    if (type === 'computer') {
        return (
            <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"/>
            </svg>
        );
    }

    if (type === 'ou') {
        return (
            <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
            </svg>
        );
    }

    return <div className={iconClass}/>;
}
