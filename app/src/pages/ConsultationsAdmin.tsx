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
                <div className="flex bg-transparent border border-white/10 rounded-xl p-1">
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'requests' ? 'bg-fame-gold/10 text-fame-gold border border-fame-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'text-white/30 border border-transparent hover:text-white/60'}`}
                    >
                        Requests
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'settings' ? 'bg-fame-gold/10 text-fame-gold border border-fame-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'text-white/30 border border-transparent hover:text-white/60'}`}
                    >
                        Settings
                    </button>
                </div>
            </PageHeader>

            {activeTab === 'requests' ? <ConsultationRequestsViewer /> : <ConsultationSettings settings={{}} />}
        </div>
    );
}
