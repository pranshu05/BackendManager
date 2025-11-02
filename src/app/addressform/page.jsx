"use client";

import React, { useState } from 'react';
import './index.css'; 

import { FaHome , FaMobileAlt, FaEnvelope, FaMapMarkerAlt, FaRegAddressCard } from 'react-icons/fa';
import { Database } from "lucide-react";

const AddressForm = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailId, setEmailId] = useState('user123@gmail.com');
  const [address, setAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [postCode, setPostCode] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log({
      mobileNumber,
      emailId,
      address,
      cityState,
      postCode,
    });
    alert('Changes saved !')
    window.location.href = '/personalinformationpage';
  };

  const handleCancel = () => {
    window.location.href = '/personalinformationpage';
  }

  const handleHome = () => {
    window.location.href = '/dashboard';
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
        
        <button 
            onClick={handleHome}
            className="home-btn"> 
            <FaHome className="home-icon" />
        </button>
      </div>

      

      <div className="address-form-container">
        <div className="title">
          <h2 className="form-title">Edit Address and Contact Information</h2> 
        </div>
        <form onSubmit={handleSubmit} className="address-form">
          <p className="section-title">About</p>
          <div className="form-group">
            <label htmlFor="mobileNumber" className="form-label">
              <FaMobileAlt /> 
              Mobile Number
            </label>
            <input
              type="text"
              id="mobileNumber"
              className="form-input"
              placeholder="Enter New Number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="emailId" className="form-label">
              <FaEnvelope /> 
              Email ID
            </label>
            <input
              type="email"
              id="emailId"
              className="form-input-email"
              placeholder= {emailId}
              value={emailId}
              readOnly 
            />
          </div>

          <p className="section-title">Address</p>
          <div className="form-group">
            <label htmlFor="address" className="form-label">
              <FaRegAddressCard /> {/* React-icon for Address (general address card) */}
              Address
            </label>
            <input
              type="text"
              id="address"
              className="form-input"
              placeholder="Enter new Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cityState" className="form-label">
              <FaMapMarkerAlt /> 
              City State
            </label>
            <input
              type="text"
              id="cityState"
              className="form-input"
              placeholder="Enter new City State"
              value={cityState}
              onChange={(e) => setCityState(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="postCode" className="form-label">
              <FaMapMarkerAlt /> 
              Post Code
            </label>
            <input
              type="text"
              id="postCode"
              className="form-input"
              placeholder="Enter new Post Code"
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button">
              Save Changes
            </button>
            <button 
            onClick={handleCancel}
            type="button" className="cancel-button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressForm;