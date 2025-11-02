"";

import { FaUser } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { BsCalendarDate } from "react-icons/bs";
import { HiOfficeBuilding } from "react-icons/hi";
import { TbWorld } from "react-icons/tb";

const GeneralInformation = () => {
    return ( 
        <div className="info-card">
          <div className="card-header">
            <h3>General Information</h3>
            <MdOutlineEdit className="edit-icon" />
          </div>

          <div className="card-section">
            <p><FaUser className="icon" /> User Name: user1234</p>
            <p><BsCalendarDate className="icon" /> Birth Date: DD/MM/YYYY</p>
            <p><HiOfficeBuilding className="icon" /> School/College/Company Name: DAIICT</p>
            <p><BsCalendarDate className="icon" /> Joining Date: DD/MM/YYYY</p>
            <p><TbWorld className="icon" /> Nationality: Indian</p>
          </div>
        </div>
    );
}
 
export default GeneralInformation;