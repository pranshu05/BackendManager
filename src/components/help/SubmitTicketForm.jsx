// Form component for submitting support tickets
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, X, Image as ImageIcon } from 'lucide-react';

export default function SubmitTicketForm() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        description: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('File size must be less than 2 MB');
            return;
        }
        
        // Check file type (images only)
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        
        setAttachment(file);
        setError('');
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachmentPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };
    
    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentPreview(null);
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        
        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }
        if (!formData.subject.trim()) {
            setError('Subject is required');
            return;
        }
        if (!formData.description.trim()) {
            setError('Description is required');
            return;
        }
        
        setSubmitting(true);
        
        try {
            // Prepare form data with attachment
            const submitData = { ...formData };
            if (attachment && attachmentPreview) {
                submitData.attachment = {
                    name: attachment.name,
                    type: attachment.type,
                    size: attachment.size,
                    data: attachmentPreview // base64 data
                };
            }
            
            const res = await fetch('/api/help/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            });
            
            const data = await res.json();
            
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Failed to submit ticket');
            }
            
            setSuccess(true);
            setFormData({ name: '', email: '', subject: '', description: '' });
            setAttachment(null);
            setAttachmentPreview(null);
            
            // Redirect to tickets page after 1.5 seconds
            setTimeout(() => {
                router.push('/help/tickets');
            }, 1500);
        } catch (err) {
            setError(err.message || 'Failed to submit ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sticky top-4">
            <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Submit an Issue</h3>
                <p className="text-gray-600 text-xs">We'll get back to you soon</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Name
                    </label>
                    <Input
                        type="text"
                        name="name"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full h-8 text-sm rounded-lg border-gray-200 focus:border-primary"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email
                    </label>
                    <Input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full h-8 text-sm rounded-lg border-gray-200 focus:border-primary"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Subject
                    </label>
                    <Input
                        type="text"
                        name="subject"
                        placeholder="Enter subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full h-8 text-sm rounded-lg border-gray-200 focus:border-primary"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description
                    </label>
                    <Textarea
                        name="description"
                        placeholder="Describe your issue..."
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full text-sm rounded-lg border-gray-200 focus:border-primary resize-none"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Attachment (Optional)
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg p-2 cursor-pointer border border-gray-200 transition-colors">
                            <Paperclip className="w-3 h-3" />
                            <span>Attach Screenshot (max 2 MB)</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        
                        {attachmentPreview && (
                            <div className="relative bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <button
                                    type="button"
                                    onClick={removeAttachment}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-gray-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                            {attachment?.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {(attachment?.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <img 
                                    src={attachmentPreview} 
                                    alt="Preview" 
                                    className="mt-2 w-full h-24 object-cover rounded"
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                {error && (
                    <div className="text-red-600 text-xs bg-red-50 rounded-lg p-2 border border-red-100">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="text-green-600 text-xs bg-green-50 rounded-lg p-2 border border-green-100">
                        ✓ Ticket submitted! Redirecting...
                    </div>
                )}
                
                <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-3.5 h-3.5" />
                            Submit Issue
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}