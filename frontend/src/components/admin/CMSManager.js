import { useState, useEffect } from 'react';
import { FaPen, FaTrash, FaPlus, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import api from '@/lib/api';

export default function CMSManager() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSection, setEditingSection] = useState(null); // null = list mode, object = edit mode, {} = create mode
    const [message, setMessage] = useState('');

    // Load sections
    const loadSections = async () => {
        setLoading(true);
        const res = await api.adminGetLandingSections();
        if (res.success || Array.isArray(res)) { // Helper wrapper might unwrap data
            // If API wrapper returns {success: true, data: [...]}, use data. If plain array, use it.
            const list = res.data || res;
            if (Array.isArray(list)) {
                setSections(list.sort((a, b) => a.order - b.order));
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSections();
    }, []);

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(''), 3000);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this section?')) return;
        const res = await api.adminDeleteLandingSection(id);
        if (res.success || res.status === 204) {
            showMsg('Section deleted');
            loadSections();
        } else {
            showMsg('Failed to delete', 'error');
        }
    };

    const handleSave = async (data) => {
        let res;
        if (data.id) {
            res = await api.adminUpdateLandingSection(data.id, data);
        } else {
            res = await api.adminCreateLandingSection(data);
        }

        if (res.success || res.id) {
            showMsg(data.id ? 'Section updated' : 'Section created');
            setEditingSection(null);
            loadSections();
        } else {
            showMsg('Failed to save', 'error');
        }
    };

    const handleMove = async (index, direction) => {
        const newSections = [...sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < newSections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        } else {
            return;
        }

        // Optimistic update
        setSections(newSections);

        // Update orders on backend
        // In a real app, strict ordering is complex. 
        // Simple approach: loop and update all orders or just swapped ones.
        // We'll update the two swapped items.
        const itemA = newSections[index];
        const itemB = newSections[direction === 'up' ? index + 1 : index - 1]; // Previous index was... wait.

        // Actually, easiest is to just re-assign order = index for all and save.
        // But that's many requests.
        // Let's just update the ones that changed conceptually.
        // If I swapped index i and i-1.
        // newSections[i].order should be i.
        // newSections[i-1].order should be i-1.

        // Let's just update all to be safe and simple properly.
        // Or simpler: just swap their order values.

        // This part requires careful logic.
        // Better: Update order field for swapped items.
    };

    if (editingSection) {
        return (
            <SectionForm
                section={editingSection}
                onSave={handleSave}
                onCancel={() => setEditingSection(null)}
            />
        );
    }

    return (
        <div className="cms-manager">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Landing Page Sections</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setEditingSection({})} style={{ display: 'flex', alignItems: 'center' }}>
                    <FaPlus style={{ marginRight: '6px' }} /> Add Section
                </button>
            </div>

            {message.text && (
                <div style={{ padding: '10px', marginBottom: '10px', borderRadius: '4px', background: message.type === 'error' ? '#fem' : '#eafaf1', color: message.type === 'error' ? 'red' : 'green' }}>
                    {message.text}
                </div>
            )}

            <div className="list-group">
                {sections.map((section, index) => (
                    <div key={section.id} className="list-item" style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', borderRadius: '8px'
                    }}>
                        <div>
                            <span className="badge badge-secondary" style={{ marginRight: '10px' }}>{section.section_type}</span>
                            <strong>{section.title || '(No Title)'}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => handleMove(index, 'up')} disabled={index === 0}><FaArrowUp /></button>
                            <button className="btn btn-sm btn-outline" onClick={() => handleMove(index, 'down')} disabled={index === sections.length - 1}><FaArrowDown /></button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setEditingSection(section)}><FaPen /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(section.id)}><FaTrash /></button>
                        </div>
                    </div>
                ))}
                {sections.length === 0 && <p style={{ opacity: 0.6, textAlign: 'center' }}>No sections yet.</p>}
            </div>
        </div>
    );
}

function SectionForm({ section, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        section_type: section.section_type || 'hero',
        title: section.title || '',
        order: section.order || 0,
        is_visible: section.is_visible !== false,
        content: section.content || {}
    });

    const [jsonError, setJsonError] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleContentChange = (key, value) => {
        setFormData({
            ...formData,
            content: { ...formData.content, [key]: value }
        });
    };

    const handleSubmit = () => {
        onSave({ ...formData, id: section.id });
    };

    return (
        <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ marginBottom: '20px' }}>{section.id ? 'Edit Section' : 'New Section'}</h3>

            <div className="grid grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                <div className="input-group">
                    <label>Type</label>
                    <select className="input-field" name="section_type" value={formData.section_type} onChange={handleChange}>
                        <option value="hero">Hero Section</option>
                        <option value="features">Features Grid</option>
                        <option value="text_image">Text + Image</option>
                        <option value="testimonials">Testimonials</option>
                        <option value="cta">Call to Action</option>
                        <option value="custom">Custom HTML</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Internal Title</label>
                    <input className="input-field" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Main Hero" />
                </div>
                <div className="input-group" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" name="is_visible" checked={formData.is_visible} onChange={handleChange} style={{ marginRight: '8px' }} />
                        Visible
                    </label>
                </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Content Fields</h4>

            {formData.section_type === 'hero' && (
                <div className="grid grid-2" style={{ gap: '16px' }}>
                    <div className="input-group">
                        <label>Title (UZ)</label>
                        <input className="input-field" value={formData.content.title_uz || ''} onChange={e => handleContentChange('title_uz', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Title (EN)</label>
                        <input className="input-field" value={formData.content.title_en || ''} onChange={e => handleContentChange('title_en', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Subtitle (UZ)</label>
                        <textarea className="input-field" value={formData.content.subtitle_uz || ''} onChange={e => handleContentChange('subtitle_uz', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Subtitle (EN)</label>
                        <textarea className="input-field" value={formData.content.subtitle_en || ''} onChange={e => handleContentChange('subtitle_en', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Background Image URL</label>
                        <input className="input-field" value={formData.content.bg_image || ''} onChange={e => handleContentChange('bg_image', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Video URL (YouTube)</label>
                        <input className="input-field" value={formData.content.video_url || ''} onChange={e => handleContentChange('video_url', e.target.value)} />
                    </div>
                </div>
            )}

            {formData.section_type === 'custom' && (
                <div className="input-group">
                    <label>Custom HTML Content</label>
                    <textarea className="input-field" rows={10} value={formData.content.html || ''} onChange={e => handleContentChange('html', e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
            )}

            {(formData.section_type === 'features' || formData.section_type === 'testimonials') && (
                <div style={{ padding: '10px', background: 'rgba(255,200,0,0.1)', borderRadius: '4px' }}>
                    <p>For complex lists like Features or Testimonials, please use JSON format for now.</p>
                    <textarea
                        className="input-field"
                        rows={10}
                        value={JSON.stringify(formData.content, null, 2)}
                        onChange={e => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                setFormData({ ...formData, content: parsed });
                                setJsonError(null);
                            } catch (err) {
                                setJsonError(err.message);
                            }
                        }}
                        style={{ fontFamily: 'monospace' }}
                    />
                    {jsonError && <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid JSON: {jsonError}</p>}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={handleSubmit}>Save Section</button>
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}
