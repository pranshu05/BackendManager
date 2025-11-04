"use client";

import React, { useState,useEffect } from 'react';
import './index.css'; 
import { Database } from "lucide-react";
import { FaHome , FaLaptopCode } from "react-icons/fa";

const ChooseRole = () => {
  const [selectedRole, setSelectedRole] = useState('Student');
  const [otherRole, setOtherRole] = useState('');
    useEffect(()=>{
    const fetchRole =async()=>{
      try {
        const res = await fetch('/api/user_profiles/get');
        if(res.ok){
          const data = await res.json();
          if(data.profile && data.profile.role) {
            const currentRole = data.profile.role;
            const predefinedRoles = ['Student', 'Employee', 'Project Manager', 'Marketer'];
            if(predefinedRoles.includes(currentRole)){
              setSelectedRole(currentRole);
            }else{
              setSelectedRole('Other');
              setOtherRole(currentRole);
            }
          }
        }
      }catch(error){
        console.error('Error fetching role:', error);
      }
    };
    fetchRole();
  }, [])

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
    if (event.target.value !== 'Other') {
      setOtherRole('');
    }
  };

  const handleOtherRoleChange = (event) => {
    setOtherRole(event.target.value);
  };

const handleChangeRoleClick =async()=>{
  const finalRole = selectedRole ==='Other'?otherRole:selectedRole;
  
  try{
    const res = await fetch('/api/user_profiles/update', {
      method: 'PUT',
      headers:{
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: finalRole
      })
    });

    if(res.ok){
      alert(`Role changed to: ${finalRole}`);
      window.location.href = "/profile";
    }else{
      const error = await res.json();
      alert(`Error: ${error.error || 'Failed to update role'}`);
    }
  }catch(error) {
    console.error('Error updating role:', error);
    alert('Failed to update role. Please try again.');
  }
};

  const handleCancelClick = () => {
    console.log('Cancelled');
    window.location.href = "/profile";
    // alert('Action cancelled.');
  };

  return (
    <div className="choose-role-container">
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
        
        <button onClick={() => (window.location.href = "/")}className="home-btn"> 
            <FaHome className="home-icon" />
        </button>
      </div>

      <div className="role-selection-card">
        <div className="role-sym">
            <FaLaptopCode className="role-icon" />
        </div>
        <h2>Choose Your Role</h2>

        <div className="role-options">
          <label className="radio-label">
            <input
              type="radio"
              name="role"
              value="Student"
              checked={selectedRole === 'Student'}
              onChange={handleRoleChange} />
            Student
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="role"
              value="Employee"
              checked={selectedRole === 'Employee'}
              onChange={handleRoleChange}
            />
            Employee
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="role"
              value="Project Manager"
              checked={selectedRole === 'Project Manager'}
              onChange={handleRoleChange}
            />
            Project Manager
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="role"
              value="Marketer"
              checked={selectedRole === 'Marketer'}
              onChange={handleRoleChange}
            />
            Marketer
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="role"
              value="Other"
              checked={selectedRole === 'Other'}
              onChange={handleRoleChange}
            />
            Other
          </label>

            {selectedRole === 'Other' && <input
              type="text"
              className="other-role-input"
              placeholder="Mention Role"
              value={otherRole}
              onChange={handleOtherRoleChange}
            />}
          
        </div>

        <div className="button-group">
          <button className="change-role-button" onClick={handleChangeRoleClick}>
            Change Role
          </button>
          <button className="cancel-button" onClick={handleCancelClick}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;