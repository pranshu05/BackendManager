"use client";

import React, { useState } from 'react';
import './index.css'; 
import { Database } from "lucide-react";
import { FaHome , FaLaptopCode } from "react-icons/fa";

const ChooseRole = () => {
  const [selectedRole, setSelectedRole] = useState('Student');
  const [otherRole, setOtherRole] = useState('');

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
    if (event.target.value !== 'Other') {
      setOtherRole('');
    }
  };

  const handleOtherRoleChange = (event) => {
    setOtherRole(event.target.value);
  };

  const handleChangeRoleClick = () => {
    const finalRole = selectedRole === 'Other' ? otherRole : selectedRole;
    console.log('Selected Role:', finalRole);
    window.location.href = "/profile";
    alert(`Role changed to: ${finalRole}`);
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