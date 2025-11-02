import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaCity } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { HiOfficeBuilding } from "react-icons/hi";

const AddressAndContactInformation = () => {

    return (  
        <div className="info-card">
            <div className="card-header">
                <h3>Address and Contact Information</h3>
                <MdOutlineEdit onClick={() => (window.location.href = '/addressform')} className="edit-icon" />
            </div>

            <div className="card-section">
                <h4><u>About</u></h4>
                <p><FaPhoneAlt className="icon" /> Phone Number: +91 xxxxxxxxxx</p>
                <p><FaEnvelope className="icon" /> Email ID: username@gmail.com</p>
            </div>

            <div className="card-section">
                <h4><u>Address</u></h4>
                <p><HiOfficeBuilding className="icon" /> Address: 390 Market Street, Suite 200</p>
                <p><FaCity className="icon" /> City: SAN Francisco, LA</p>
                <p><FaMapMarkerAlt className="icon" /> Pin Code: 396001</p>
            </div>
        </div>

    );
}
 
export default AddressAndContactInformation;