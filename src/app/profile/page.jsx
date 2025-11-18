"use client";

import { useState, useEffect } from "react";
import ProfileHeader from "@/components/(profile)/ProfileHeader";
import ProfileAvatar from "@/components/(profile)/ProfileAvatar";
import ContactInfoSection from "@/components/(profile)/ContactInfoSection";
import GeneralInfoSection from "@/components/(profile)/GeneralInfoSection";
import PasswordUpdateSection from "@/components/(profile)/PasswordUpdateSection";
import APITokenSection from "@/components/(profile)/APITokenSection";
import LogoutButton from "@/components/(profile)/LogoutButton";
import TokenModal from "@/components/(profile)/TokenModal";

export default function ProfilePage() {
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Form states
  const [contactForm, setContactForm] = useState({
    phone_number: "",
    address: "",
    city: "",
    pincode: ""
  });
  const [generalForm, setGeneralForm] = useState({
    nationality: "",
    birth_date: "",
    organization_name: "",
    organization_type: "",
    joining_date: "",
    role: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    email: "",
    otp: "",
    newpwd: "",
    confirmPassword: ""
  });

  // Track changes
  const [contactChanged, setContactChanged] = useState(false);
  const [generalChanged, setGeneralChanged] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Password update flow steps
  const [passwordStep, setPasswordStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Show password toggles
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  // Loading states for save buttons
  const [savingContact, setSavingContact] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);

        // Initialize forms with fetched data
        setContactForm({
          phone_number: data.profile?.phone_number || "",
          address: data.profile?.address || "",
          city: data.profile?.city || "",
          pincode: data.profile?.pincode || ""
        });

        setGeneralForm({
          nationality: data.profile?.nationality || "",
          birth_date: data.profile?.birth_date ? data.profile.birth_date.split('T')[0] : "",
          organization_name: data.profile?.organization_name || "",
          organization_type: data.profile?.organization_type || "",
          joining_date: data.profile?.joining_date ? data.profile.joining_date.split('T')[0] : "",
          role: data.profile?.role || ""
        });

        setPasswordForm({
          email: data.profile?.email || "",
          otp: "",
          newpwd: "",
          confirmPassword: ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    setContactChanged(true);
  };

  const handleGeneralChange = (field, value) => {
    setGeneralForm(prev => ({ ...prev, [field]: value }));
    setGeneralChanged(true);
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    if (field !== 'email') {
      setPasswordChanged(true);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (res.ok) {
        alert("Contact information updated successfully!");
        setContactChanged(false);
        await fetchProfile();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to update"}`);
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact information");
    } finally {
      setSavingContact(false);
    }
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalForm)
      });

      if (res.ok) {
        alert("General information updated successfully!");
        setGeneralChanged(false);
        await fetchProfile();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to update"}`);
      }
    } catch (error) {
      console.error("Error updating general info:", error);
      alert("Failed to update general information");
    } finally {
      setSavingGeneral(false);
    }
  };

  const requestOTP = async () => {
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/emailcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: passwordForm.email })
      });

      const data = await res.json();

      if (res.ok) {
        alert("OTP sent to your email!");
        setOtpSent(true);
        setPasswordStep(2);
      } else {
        alert(`Error: ${data.error || "Failed to send OTP"}`);
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      alert("Failed to send OTP. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const verifyOTP = async () => {
    if (!passwordForm.otp || passwordForm.otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/otpcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: passwordForm.email,
          otp: passwordForm.otp
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("OTP verified successfully!");
        setOtpVerified(true);
        setPasswordStep(3);
      } else {
        alert(`Error: ${data.error || "Invalid OTP"}`);
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      alert("Failed to verify OTP. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const savePassword = async () => {
    if (passwordForm.newpwd !== passwordForm.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (passwordForm.newpwd.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/updatepwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: passwordForm.email,
          newpwd: passwordForm.newpwd,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Password updated successfully!");
        setPasswordForm(prev => ({
          ...prev,
          otp: "",
          newpwd: "",
          confirmPassword: ""
        }));
        setPasswordChanged(false);
        setPasswordStep(1);
        setOtpSent(false);
        setOtpVerified(false);
      } else {
        alert(`Error: ${data.error || "Failed to update password"}`);
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Failed to update password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const resetPasswordFlow = () => {
    setPasswordStep(1);
    setOtpSent(false);
    setOtpVerified(false);
    setPasswordForm(prev => ({
      ...prev,
      otp: "",
      newpwd: "",
      confirmPassword: ""
    }));
    setPasswordChanged(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-blue-100 flex items-center justify-center">
        <div className="text-2xl text-[#1e4a8a]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-blue-100 p-6">
      <ProfileHeader />

      <ProfileAvatar username={profile?.username} email={profile?.email} />

      <div className="max-w-6xl mx-auto space-y-6">
        <ContactInfoSection
          contactForm={contactForm}
          contactChanged={contactChanged}
          savingContact={savingContact}
          onContactChange={handleContactChange}
          onSave={saveContact}
        />

        <GeneralInfoSection
          generalForm={generalForm}
          generalChanged={generalChanged}
          savingGeneral={savingGeneral}
          onGeneralChange={handleGeneralChange}
          onSave={saveGeneral}
        />

        <PasswordUpdateSection
          passwordForm={passwordForm}
          passwordStep={passwordStep}
          passwordChanged={passwordChanged}
          savingPassword={savingPassword}
          showPasswords={showPasswords}
          onPasswordChange={handlePasswordChange}
          onRequestOTP={requestOTP}
          onVerifyOTP={verifyOTP}
          onUpdatePassword={savePassword}
          onResetFlow={resetPasswordFlow}
          onTogglePasswordVisibility={togglePasswordVisibility}
        />

        <APITokenSection onGenerateToken={() => setShowTokenModal(true)} />

        <LogoutButton onLogout={handleLogout} />
      </div>

      {showTokenModal && <TokenModal onClose={() => setShowTokenModal(false)} />}
    </div>
  );
}
