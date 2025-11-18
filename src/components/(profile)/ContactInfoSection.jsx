"use client";

import { Phone, MapPin, Building, Save } from "lucide-react";

export default function ContactInfoSection({
  contactForm,
  contactChanged,
  savingContact,
  onContactChange,
  onSave
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-[#1e4a8a] flex items-center gap-2">
          <Phone className="w-6 h-6" />
          Contact Information
        </h3>
        {contactChanged && (
          <button
            onClick={onSave}
            disabled={savingContact}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingContact ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1" />
            Phone Number
          </label>
          <input
            type="tel"
            value={contactForm.phone_number}
            onChange={(e) => onContactChange('phone_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            City
          </label>
          <input
            type="text"
            value={contactForm.city}
            onChange={(e) => onContactChange('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter city"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="w-4 h-4 inline mr-1" />
            Address
          </label>
          <input
            type="text"
            value={contactForm.address}
            onChange={(e) => onContactChange('address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Pin Code
          </label>
          <input
            type="text"
            value={contactForm.pincode}
            onChange={(e) => onContactChange('pincode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
            placeholder="Enter pin code"
          />
        </div>
      </div>
    </div>
  );
}
