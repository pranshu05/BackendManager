"use client";

import { User, Globe, Calendar, Building, Briefcase, Save } from "lucide-react";

export default function GeneralInfoSection({
  generalForm,
  generalChanged,
  savingGeneral,
  onGeneralChange,
  onSave
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-[#1e4a8a] flex items-center gap-2">
          <User className="w-6 h-6" />
          General Information
        </h3>
        {generalChanged && (
          <button
            onClick={onSave}
            disabled={savingGeneral}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
            <Save className="w-4 h-4" />
            {savingGeneral ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            Nationality
          </label>
          <input
            type="text"
            value={generalForm.nationality}
            onChange={(e) => onGeneralChange('nationality', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter nationality"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Birth Date
          </label>
          <input
            type="date"
            value={generalForm.birth_date}
            onChange={(e) => onGeneralChange('birth_date', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="w-4 h-4 inline mr-1" />
            Organization Name
          </label>
          <input
            type="text"
            value={generalForm.organization_name}
            onChange={(e) => onGeneralChange('organization_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter organization name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="w-4 h-4 inline mr-1" />
            Organization Type
          </label>
          <select
            value={generalForm.organization_type}
            onChange={(e) => onGeneralChange('organization_type', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent">
            <option value="">Select type</option>
            <option value="Corporate">Corporate</option>
            <option value="Startup">Startup</option>
            <option value="Educational">Educational</option>
            <option value="Government">Government</option>
            <option value="Non-Profit">Non-Profit</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Joining Date
          </label>
          <input
            type="date"
            value={generalForm.joining_date}
            onChange={(e) => onGeneralChange('joining_date', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="w-4 h-4 inline mr-1" />
            Role
          </label>
          <select
            value={generalForm.role}
            onChange={(e) => onGeneralChange('role', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent">
            <option value="">Select role</option>
            <option value="Student">Student</option>
            <option value="Teacher">Teacher</option>
            <option value="Developer">Developer</option>
            <option value="Manager">Manager</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}
