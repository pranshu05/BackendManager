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
        <div className="w-48 bg-white min-h-screen p-3 border-r border-gray-100">
            {/* Branding Section */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/30">
                        <span className="text-white font-bold text-lg">D</span>
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900">DBuddy</h1>
                        <p className="text-[10px] text-gray-500">Your Database Companion</p>
                    </div>
                </div>
            </div>
            
            {/* Navigation Items */}
            <div className="space-y-1">
                {menuItems.map((item, index) => {
                    const isActive = item.active || pathname === item.path;
                    return (
                        <div
                            key={index}
                            onClick={() => router.push(item.path)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 ${
                                isActive 
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/30' 
                                    : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                        >
                            <div className={isActive ? 'text-white' : 'text-gray-700'}>
                                {item.icon && <div className="w-4 h-4">{item.icon}</div>}
                            </div>
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

