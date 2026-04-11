import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Video } from 'lucide-react';
import ConsultationSettings from '../features/consultations/ConsultationSettings';
import ConsultationRequestsViewer from '../features/consultations/ConsultationRequestsViewer';

export default function ConsultationsAdmin() {
    const [activeTab, setActiveTab] = useState<'requests' | 'settings'>('requests');

    return (
        <div className="space-y-8 animate-fade-in">
            <PageHeader 
                title="Consultations" 
                subtitle="Manage availability, pricing, and book calls"
            >
                <div className="flex items-center gap-8 relative pb-2 px-1">
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`relative py-1 text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'requests' ? 'text-fame-gold text-shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'text-white/20 hover:text-white/40'}`}
                    >
                        Requests
                        {activeTab === 'requests' && (
                            <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-fame-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] animate-in slide-in-from-left-full duration-300" />
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`relative py-1 text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'settings' ? 'text-fame-gold text-shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'text-white/20 hover:text-white/40'}`}
                    >
                        Settings
                        {activeTab === 'settings' && (
                            <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-fame-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] animate-in slide-in-from-left-full duration-300" />
                        )}
                    </button>
                </div>
            </PageHeader>

            {activeTab === 'requests' ? <ConsultationRequestsViewer /> : <ConsultationSettings settings={{}} />}
        </div>
    );
}
