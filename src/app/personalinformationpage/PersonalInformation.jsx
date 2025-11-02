"use client";

import AddressAndContactInformation from "./AddressAndContactInformation";
import GeneralInformation from "./GeneralInformation";
import { FaHome } from "react-icons/fa"; 
import "./index.css";
import { useRouter } from "next/navigation";


const PersonalInformation = () => {
  const router = useRouter();

  return (
    <div className="personal-info-page">
      <h1 className="title">
        Personal Information {}
        <button onClick = {() => window.location.href='/dashboard'}className="home-btn"> 
            <FaHome className="home-icon" />
        </button>
      </h1>

      

      <div className="info-container">
        <AddressAndContactInformation />
        <GeneralInformation />
      </div>

      <button onClick={() => window.location.href='/profile'} className="back-btn-personal-info" >Back</button>
    </div>
  );
}

export default PersonalInformation;