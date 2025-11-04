"use client";

import React, { useState, useEffect  } from 'react';
import './index.css'; 

import { FaHome , FaUser , FaUniversity , FaGlobe , FaCalendarAlt } from 'react-icons/fa';
import { Database } from "lucide-react";

const PersonalInformationForm =()=>{
  const [userName, setUserName] = useState('');
  const [DOB, setDOB] = useState('');
  const [institueName, setInstitueName] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const fetchProfile = async()=>{
      try {
        const res = await fetch('/api/user_profiles/get');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUserName(data.profile.username || '');
            setDOB(data.profile.birth_date || '');
            setInstitueName(data.profile.organization_name || '');
            setJoinDate(data.profile.joining_date || '');
            setNationality(data.profile.nationality || '');
          }
        }
      }catch(error) {
        console.error('Error fetching profile:', error);
      }finally{
        setLoading(false);
      }
    };
    fetchProfile();
  },[]);

  const handleSubmit = async(e)=>{
    e.preventDefault();
    setLoading(true);
    
    try{
      const res = await fetch('/api/user_profiles/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birth_date: DOB.trim() === '' ? null : DOB,
          organization_name: institueName.trim() === '' ? null : institueName,
          organization_type: 'Educational',
          joining_date: joinDate.trim() === '' ? null : joinDate,
          nationality: nationality.trim() === '' ? null : nationality
        })
      });

      if(res.ok){
        alert('Changes saved successfully!');
        window.location.href = '/personalinformationpage';
      }else{
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to save changes'}`);
      }
    }catch(error) {
      console.error('Error saving profile:', error);
      alert('Failed to save changes. Please try again.');
    }finally{
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/personalinformationpage';
  };

  const handleHome = () => {
    window.location.href = '/dashboard';
  };
  if(loading) {
    return <div>Loading...</div>;
  }
  return (
    <div className="address-form-page">
      <div className="header">
        <div className="dbuddy">
            <div className="dblogo">
                <Database className='db-icon'/>
            </div> 
            <div className="logo-text">
                <p
                className="dbbuddy-title">DBuddy</p>
                <p className="dbbuddy-slogan">Your Database Companion</p>
            </div>
        </div>
        
        <button className="home-btn" onClick={handleHome}> 
            <FaHome className="home-icon" />
        </button>
      </div>


      <div className="title">
          <h2 className="form-title">Edit Personal Information</h2> 
      </div>
      

      <div className="address-form-container">

        
        <form onSubmit={handleSubmit} className="address-form">
          <p className="section-title">Personal Infromation</p>
          <div className="form-group">
            <label htmlFor="UserName" className="form-label">
              <FaUser /> User Name (Read-only)
            </label>
            <input
              type="text"
              id="UserName"
              className="form-input"
              placeholder="Username"
              value={userName}
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="DOB" className="form-label">
              <FaCalendarAlt /> 
              Date of Birth
            </label>
            <input
              type="date"
              id="DOB"
              className="form-input"
              // placeholder="Enter New DOB"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="institueName" className="form-label">
              <FaUniversity /> 
              School/College/Office Name
            </label>
            <input
              type="text"
              id="institueName"
              className="form-input"
              placeholder="Enter Your College/School/Office Name"
              value={institueName}
              onChange={(e) => setInstitueName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="joinDate" className="form-label">
              <FaCalendarAlt /> 
              Joining Date
            </label>
            <input
              type="date"
              id="joindate"
              className="form-input"
              // placeholder="Enter new Joining Date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nationality" className="form-label">
              <FaGlobe /> 
              Nationality 
            </label>
            <input
              type="text"
              id="nationality"
              className="form-input"
              placeholder="Enter Your Nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={handleCancel} type="button" className="cancel-button" disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInformationForm;