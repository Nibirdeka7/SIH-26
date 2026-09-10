import React from 'react';
import { Ticket, Clock, QrCode, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import { t } from '../utils/translations';

export default function QueueTicketStep({
  currentLanguage = 'hi',
  ticketData,
  patientData,
  onNewSession,
}) {
  const ticket = ticketData || {
    ticket_number: `OPD-${Math.floor(1000 + Math.random() * 9000)}`,
    specialty: 'General Medicine',
    room_number: 'Room 104 (Block B)',
    estimated_wait: '10 - 15 Mins',
    priority: 'P2_URGENT',
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col gap-6 items-center">
      {/* Confirmation Top Banner */}
      <div className="w-full bg-[#d8e7ce]/40 border border-[#8c9a84] rounded-3xl p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-[#2d3a31] text-[#ffffff] flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="font-display text-2xl text-[#18241c] font-semibold">
          {t(currentLanguage, 'ticketIssued')}
        </h1>
        <p className="font-body text-xs text-[#5b6854]">
          {t(currentLanguage, 'opdInstruction')}
        </p>
      </div>

      {/* Main Digital Queue Ticket Card */}
      <div className="w-full bg-[#ffffff] rounded-3xl p-8 border border-[#e6e2da] shadow-md relative overflow-hidden flex flex-col items-center gap-6">
        {/* Ticket Header */}
        <div className="w-full flex items-center justify-between border-b border-[#e6e2da] pb-4">
          <div className="flex items-center gap-2">
            <Ticket size={22} className="text-[#c27b66]" />
            <span className="font-display text-base font-semibold text-[#18241c]">MediKiosk Digital OPD Slip</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#efeeea] text-[#18241c] font-body text-xs font-bold uppercase">
            {ticket.priority || 'P2 URGENT'}
          </span>
        </div>

        {/* Token Number Hero Display */}
        <div className="text-center space-y-1">
          <span className="font-body text-xs text-[#737873] uppercase tracking-wider font-semibold">
            {t(currentLanguage, 'ticketNumber')}
          </span>
          <div className="font-display text-5xl md:text-6xl font-bold tracking-tight text-[#2d3a31]">
            {ticket.ticket_number}
          </div>
        </div>

        {/* Details Grid */}
        <div className="w-full grid grid-cols-2 gap-4 bg-[#faf9f5] p-4 rounded-2xl border border-[#e6e2da] text-xs font-body">
          <div className="space-y-1">
            <span className="text-[#737873] block">{t(currentLanguage, 'specialty')}</span>
            <span className="font-display text-sm text-[#18241c] font-bold block">{ticket.specialty}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#737873] block">{t(currentLanguage, 'roomNumber')}</span>
            <span className="font-display text-sm text-[#18241c] font-bold block">{ticket.room_number || 'Room 104 (Block B)'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#737873] block">{t(currentLanguage, 'estimatedWait')}</span>
            <span className="font-body text-xs text-[#5b6854] font-bold flex items-center gap-1">
              <Clock size={12} /> {ticket.estimated_wait}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[#737873] block">{t(currentLanguage, 'priority')}</span>
            <span className="font-body text-xs text-[#18241c] font-bold">{ticket.priority || 'P2 URGENT'}</span>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="p-3 bg-[#ffffff] rounded-2xl border border-[#e6e2da] shadow-sm">
            <QrCode size={100} className="text-[#18241c]" />
          </div>
          <span className="font-body text-xs text-[#737873]">Scan with hospital scanner or patient mobile</span>
        </div>

        {/* Footnote */}
        <div className="w-full pt-4 border-t border-[#e6e2da] text-center text-xs text-[#737873] font-medium flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-[#8c9a84]" />
          <span>Patient Name: {patientData.name || 'Registered Patient'}</span>
        </div>
      </div>

      {/* New Session Action */}
      <button
        type="button"
        onClick={onNewSession}
        className="h-12 px-8 rounded-full bg-[#f4f4f0] hover:bg-[#e9e8e4] text-[#18241c] font-body text-sm font-semibold border border-[#e6e2da] transition-colors flex items-center gap-2 shadow-sm"
      >
        <RotateCcw size={16} />
        <span>{t(currentLanguage, 'startNewSession')}</span>
      </button>
    </div>
  );
}
