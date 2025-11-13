"use client";

import React, { useState, useEffect} from 'react';
import './index.css'; 

import { FaHome , FaMobileAlt, FaEnvelope, FaMapMarkerAlt, FaRegAddressCard } from 'react-icons/fa';
import { Database } from "lucide-react";

const AddressForm = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailId, setEmailId] = useState('user123@gmail.com');
  const [address, setAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [postCode, setPostCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async()=>{
      try{
        const res = await fetch('/api/profile');
        if(res.ok){
          const data = await res.json();
          if(data.profile){
            setMobileNumber(data.profile.phone_number || '');
            setEmailId(data.profile.email || '');
            setAddress(data.profile.address || '');
            setCityState(data.profile.city || '');
            setPostCode(data.profile.pincode || '');
          }
        }
      }catch(error) {
        console.error('Error fetching profile:', error);
      }finally{
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers:{
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: mobileNumber,
          address: address,
          city: cityState,
          pincode: postCode
        })
      });

      if(res.ok){
        alert('Changes saved successfully!');
        window.location.href = '/personalinformationpage';
      }else{
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to save changes'}`);
      }
    }catch(error){
      console.error('Error saving profile:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleCancel=()=> {
    window.location.href = '/personalinformationpage';
  }

  const handleHome=()=> {
    window.location.href = '/dashboard';
  }
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
        
        <button 
            onClick={handleHome}
            className="home-btn"> 
            <FaHome className="home-icon" />
        </button>
      </div>

      <div className="title">
          <h2 className="form-title">Edit Address and Contact Information</h2> 
      </div>      

      <div className="address-form-container">
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