"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function Optimization() {
    const params = useParams();
    const projectid = params.slug;
    return (
    <div>Optimization Page</div>


);

}