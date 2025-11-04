import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaCity } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { HiOfficeBuilding } from "react-icons/hi";
import { useState, useEffect } from "react";

const AddressAndContactInformation = () => {

    const [phoneNumber, setPhoneNumber] = useState('+91 xxxxxxxxxx');
    const [emailId, setEmailId] = useState('username@gmail.com');
    const [homeAddress, setHomeAddress] = useState('390 Market Street, Suite 200');
    const [city, setCity] = useState('SAN Francisco, LA');
    const [pinCode, setPinCode] = useState('396001');

        const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async()=>{
            try {
                const res = await fetch('/api/user_profiles/get');
                if(res.ok){
                    const data = await res.json();
                    if(data.profile){
                        setPhoneNumber(data.profile.phone_number || '+91 xxxxxxxxxx');
                        setEmailId(data.profile.email || 'username@gmail.com');
                        setHomeAddress(data.profile.address || '390 Market Street, Suite 200');
                        setCity(data.profile.city || 'SAN Francisco, LA');
                        setPinCode(data.profile.pincode || '396001');
                    }
                }
            }catch(error){
                console.error('Error fetching profile:', error);
            }finally{
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);
    if(loading){
        return <div className="info-card">Loading...</div>;
    }

    return (  
        <div className="info-card">
            <div className="card-header">
                <h3>Address and Contact Information</h3>
                <MdOutlineEdit onClick={() => (window.location.href = '/addressform')} className="edit-icon" />
            </div>

            <div className="card-section">
                <h4> <u>About</u></h4>
                <p><FaPhoneAlt className="icon" /> Phone Number: {phoneNumber}</p>
                <p><FaEnvelope className="icon" /> Email ID: {emailId}</p>
            </div>

            <div className="card-section">
                <h4> <u>Address</u></h4>
                <p><HiOfficeBuilding className="icon" /> Address: {homeAddress}</p>
                <p><FaCity className="icon" /> City: {city}</p>
                <p><FaMapMarkerAlt className="icon" /> Pin Code: {pinCode}</p>
            </div>
        </div>

    );
}
 
export default AddressAndContactInformation;