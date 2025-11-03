"use client";

import React, { useState } from 'react';
import './index.css'; // Make sure this CSS file exists

// Import icons from react-icons
import { FaHome , FaUser , FaUniversity , FaGlobe , FaCalendarAlt } from 'react-icons/fa';
import { Database } from "lucide-react";

const PersonalInformationForm = () => {
  const [userName, setUserName] = useState('user123');
  const [DOB, setDOB] = useState('');
  const [institueName, setInstitueName] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [nationality, setNationality] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log({
      userName,
      DOB,
      institueName,
      joinDate,
      nationality,
    });
    alert('Changes saved!');
    window.location.href = '/personalinformationpage';
  };

  const handleCancel = () => {
    window.location.href = '/personalinformationpage';
  };

  const handleHome = () => {
    window.location.href = '/dashboard';
  };

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

      

      <div className="address-form-container">
        <div className="title">
          <h2 className="form-title">Edit Personal Information</h2> 
        </div>

        
        <form onSubmit={handleSubmit} className="address-form">
          <p className="section-title">Personal Infromation</p>
          <div className="form-group">
            <label htmlFor="UserName" className="form-label">
              <FaUser /> 
              User Name
            </label>
            <input
              type="text"
              id="userName"
              className="form-input-userName"
              placeholder={userName}
              value={userName}
              readOnly
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
              placeholder="Enter New DOB"
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
              id="cityState"
              className="form-input"
              placeholder="Enter new Joining Date"
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
            <button type="submit" className="save-button">
              Save Changes
            </button>
            <button onClick={handleCancel} type="button" className="cancel-button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInformationForm;