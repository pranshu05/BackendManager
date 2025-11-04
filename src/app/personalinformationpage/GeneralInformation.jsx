import { FaUser } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { BsCalendarDate } from "react-icons/bs";
import { HiOfficeBuilding } from "react-icons/hi";
import { TbWorld } from "react-icons/tb";
import { useState, useEffect } from "react";

//this will formate the date to dd/mm/yyyy
const formatDateToDDMMYYYY =(dateString)=>{
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const GeneralInformation = () => {
  const [userName , setUserName] = useState('user1234');
  const [birthDate , setBirthDate] = useState('dd-mm-yyyy');
  const [instituteName , setInstituteName] = useState('user1234');
  const [joinDate , setJoinDate] = useState('dd-mm-yyyy');
  const [nationality , setNationality] = useState('user1234');

    const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async()=>{
      try{
        const res = await fetch('/api/user_profiles/get');
        if(res.ok) {
          const data = await res.json();
          if(data.profile) {
            setUserName(data.profile.username || 'user1234');
            setBirthDate(data.profile.birth_date ? formatDateToDDMMYYYY(data.profile.birth_date) : 'dd-mm-yyyy');
            setInstituteName(data.profile.organization_name || 'Not specified');
            setJoinDate(data.profile.joining_date ? formatDateToDDMMYYYY(data.profile.joining_date) : 'dd-mm-yyyy');
            setNationality(data.profile.nationality || 'Not specified');
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

  const handleEdit = () => {
    window.location.href = '/informationform';
  }
  if(loading) {
    return <div className="info-card">Loading...</div>;
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