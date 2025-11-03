import { FaUser } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { BsCalendarDate } from "react-icons/bs";
import { HiOfficeBuilding } from "react-icons/hi";
import { TbWorld } from "react-icons/tb";
import { useState } from "react";

const GeneralInformation = () => {

  const [userName , setUserName] = useState('user1234');
  const [birthDate , setBirthDate] = useState('dd-mm-yyyy');
  const [instituteName , setInstituteName] = useState('user1234');
  const [joinDate , setJoinDate] = useState('dd-mm-yyyy');
  const [nationality , setNationality] = useState('user1234');

  const handleEdit = () => {
    window.location.href = '/informationform';
  }

  return ( 
      <div className="info-card">
        <div className="card-header">
          <h3>General Information</h3>
          <MdOutlineEdit className="edit-icon" onClick={handleEdit}/>
        </div>

        <div className="card-section">
          <p><FaUser className="icon" /> User Name: {userName}</p>
          <p><BsCalendarDate className="icon" /> Birth Date: {birthDate}</p>
          <p><HiOfficeBuilding className="icon" /> School/College/Company Name: {instituteName}</p>
          <p><BsCalendarDate className="icon" /> Joining Date: {joinDate}</p>
          <p><TbWorld className="icon" /> Nationality: {nationality}</p>
        </div>
      </div>
  );
}
 
export default GeneralInformation;