"use client";

import { Key, Mail, Eye, EyeOff, Save } from "lucide-react";

export default function PasswordUpdateSection({
  passwordForm,
  passwordStep,
  passwordChanged,
  savingPassword,
  showPasswords,
  onPasswordChange,
  onRequestOTP,
  onVerifyOTP,
  onUpdatePassword,
  onResetFlow,
  onTogglePasswordVisibility
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-[#1e4a8a] flex items-center gap-2">
          <Key className="w-6 h-6" />
          Change Password
        </h3>
        {passwordStep === 1 && (
          <button
            onClick={onRequestOTP}
            disabled={savingPassword}
            className="flex items-center gap-2 bg-[#1e4a8a] hover:bg-[#1e3a6a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
            {savingPassword ? "Sending..." : "Send OTP"}
          </button>
        )}
        {passwordStep === 2 && (
          <button
            onClick={onVerifyOTP}
            disabled={savingPassword || !passwordForm.otp}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
            {savingPassword ? "Verifying..." : "Verify Your OTP"}
          </button>
        )}
        {passwordStep === 3 && passwordChanged && (
          <button
            onClick={onUpdatePassword}
            disabled={savingPassword}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
            <Save className="w-4 h-4" />
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${passwordStep >= 1 ? 'text-[#1e4a8a]' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${passwordStep >= 1 ? 'bg-[#1e4a8a] text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Request OTP</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-2 ${passwordStep >= 2 ? 'text-[#1e4a8a]' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${passwordStep >= 2 ? 'bg-[#1e4a8a] text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Verify OTP</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-2 ${passwordStep >= 3 ? 'text-[#1e4a8a]' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${passwordStep >= 3 ? 'bg-[#1e4a8a] text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm font-medium">New Password</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Email Field - Always visible */}
        <div>
          <label htmlFor="password-email" className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          <input
            id="password-email"
            type="email"
            value={passwordForm.email}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Click "Send OTP" to receive verification code</p>
        </div>

        {/* OTP Field - Visible after OTP is sent (Step 2) */}
        {passwordStep >= 2 && (
          <div>
            <label htmlFor="password-otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <input
              id="password-otp"
              type="text"
              value={passwordForm.otp}
              onChange={(e) => onPasswordChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              disabled={passwordStep > 2}
            />
            <p className="text-xs text-gray-500 mt-1">Check your email for the OTP code (valid for 5 minutes)</p>
            {passwordStep === 2 && (
              <button
                onClick={onResetFlow}
                className="text-xs text-blue-600 hover:underline mt-2 cursor-pointer">
                Didn't receive OTP? Restart process
              </button>
            )}
          </div>
        )}

        {/* Password Fields - Visible after OTP is verified (Step 3) */}
        {passwordStep >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password-new" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password-new"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newpwd}
                  onChange={(e) => onPasswordChange('newpwd', e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => onTogglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1e4a8a] cursor-pointer">
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            
            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="password-confirm"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => onPasswordChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4a8a] focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => onTogglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1e4a8a] cursor-pointer">
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.newpwd !== passwordForm.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        )}

        {/* Reset button if in middle of flow */}
        {passwordStep > 1 && (
          <div className="pt-4 border-t">
            <button
              onClick={onResetFlow}
              className="text-sm text-gray-600 hover:text-[#1e4a8a] hover:underline cursor-pointer">
              ← Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
