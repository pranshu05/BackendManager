// Sidebar navigation component for Help & Support pages
"use client";

import { useRouter, usePathname } from 'next/navigation';
import { HelpCircle, Ticket, Database } from 'lucide-react';

export default function HelpSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    
    const menuItems = [
        { icon: <HelpCircle size={20} />, label: 'General FAQ', path: '/help', active: pathname === '/help' },
        { icon: <Ticket size={20} />, label: 'My Tickets', path: '/help/tickets', active: pathname === '/help/tickets' },
    ];
    
    return (
        <div className="w-56 bg-white min-h-screen p-4">
            {/* Branding Section */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">D</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">DBuddy</h1>
                        <p className="text-sm text-gray-500">Your Database Companion</p>
                    </div>
                </div>
            </div>
            
            {/* Navigation Items */}
            <div className="space-y-2">
                {menuItems.map((item, index) => {
                    const isActive = item.active || pathname === item.path;
                    return (
                        <div
                            key={index}
                            onClick={() => router.push(item.path)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                                isActive 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <div className={isActive ? 'text-blue-600' : 'text-gray-700'}>
                                {item.icon}
                            </div>
                            <span className={isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}>{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

