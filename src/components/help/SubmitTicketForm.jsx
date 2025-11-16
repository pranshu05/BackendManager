// Form component for submitting support tickets
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';

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
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
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
            const res = await fetch('/api/help/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            const data = await res.json();
            
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Failed to submit ticket');
            }
            
            setSuccess(true);
            setFormData({ name: '', email: '', subject: '', description: '' });
            
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
        <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit an Issue</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                    </label>
                    <Input
                        type="text"
                        name="name"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <Input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                    </label>
                    <Input
                        type="text"
                        name="subject"
                        placeholder="Enter subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <Textarea
                        name="description"
                        placeholder="Describe your issue..."
                        value={formData.description}
                        onChange={handleChange}
                        rows={5}
                        className="w-full"
                    />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Paperclip className="w-4 h-4" />
                    <span>Attach Screenshot or File (max 2 MB)</span>
                </div>
                
                {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                )}
                
                {success && (
                    <div className="text-green-600 text-sm">
                        Ticket submitted successfully! Redirecting to tickets page...
                    </div>
                )}
                
                <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {submitting ? 'Submitting...' : 'Submit Issue'}
                </Button>
            </form>
        </div>
    );
}

