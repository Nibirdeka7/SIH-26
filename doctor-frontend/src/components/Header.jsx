import React from 'react';
import { Activity, ShieldAlert, UserCheck, Stethoscope } from 'lucide-react';

export default function Header({ activeCount = 3, emergencyCount = 1, selectedPatient, onBackToQueue }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#18241c] text-white border-b border-[#2d3a31] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Hospital Badge */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onBackToQueue}>
            <div className="w-10 h-10 rounded-xl bg-[#c27b66] flex items-center justify-center text-white font-black text-xl shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-lg tracking-wide text-white">MediKiosk</span>
                <span className="text-xs bg-[#2d3a31] text-[#d8e7ce] px-2 py-0.5 rounded-full font-semibold">Physician OPD</span>
              </div>
              <p className="text-xs text-[#8c9a84]">All India Institute of Medical Sciences (AIIMS) • OPD Room 104</p>
            </div>
          </div>

          {/* OPD Live Counter & Quick Actions */}
          <div className="flex items-center space-x-4">
            {selectedPatient && (
              <button
                onClick={onBackToQueue}
                className="flex items-center space-x-1 text-xs bg-[#2d3a31] hover:bg-[#3e4f43] text-white px-3 py-1.5 rounded-lg border border-[#48594d] transition-colors"
              >
                <span>← Back to Queue</span>
              </button>
            )}

            <div className="hidden md:flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 bg-[#2d3a31] px-3 py-1.5 rounded-lg border border-[#3e4f43]">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-[#8c9a84]">Active Queue:</span>
                <span className="font-bold text-white">{activeCount} Patients</span>
              </div>

              {emergencyCount > 0 && (
                <div className="flex items-center space-x-1.5 bg-red-950/60 border border-red-700 px-3 py-1.5 rounded-lg text-red-200 animate-pulse">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="font-bold">{emergencyCount} Emergency Alert</span>
                </div>
              )}
            </div>

            {/* Physician Identity */}
            <div className="flex items-center space-x-2 pl-3 border-l border-[#2d3a31]">
              <div className="w-9 h-9 rounded-full bg-[#8c9a84] flex items-center justify-center text-[#18241c] font-bold">
                <Stethoscope className="w-5 h-5 text-[#18241c]" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white">Dr. Vikramaditya Roy</p>
                <p className="text-[10px] text-[#8c9a84]">MD Cardiology • Reg #84920</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
