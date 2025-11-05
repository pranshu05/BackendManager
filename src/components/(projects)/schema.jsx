"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import plantumlEncoder from 'plantuml-encoder';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function SchemaPage() {

    const [umlcode, setUmlcode] = useState("");
    const [encoded, setEncoded] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const params = useParams();
    const projectid = params.slug;
     useEffect(()=>{
        if(umlcode){
            const encodedUML = plantumlEncoder.encode(umlcode);
            setEncoded(encodedUML);
        }
       },[umlcode])
    
       useEffect(() => {
           if (encoded) {
               const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
               console.log("Generated PlantUML Image URL:", url);
               setImageUrl(url);
               console.log("Image URL set:", url);
           }
       }, [encoded]);
    
        const getdiagram=async () => {
        try {
            const res = await fetch(`/api/projects/${projectid}/diagram`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data?.error || 'Failed to fetch diagram');
                return;
            }

            console.log("Diagram got: ", data.plantuml);
            setUmlcode(data.plantuml);
          
        } catch (err) {
            alert('Error fetching diagram', err);
        }
    };
    useEffect(()=>{
    getdiagram();
    },[])
return (
    <div className="w-full h-full p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Database Schema Diagram</h2>
            
                        <div className="border rounded-lg overflow-hidden w-full">
                                <TransformWrapper initialScale={1} minScale={0.5} maxScale={2} centerOnInit={true}
                    wrapperStyle={{
                        width: "100%",
                        height: "100%"
                    }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <div className="controls flex gap-2">
                                <button
                                    onClick={() => zoomIn()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" >
                                    Zoom In (+)
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Zoom Out (-)
                                </button>
                                <button
                                    onClick={() => resetTransform()}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    Reset
                                </button>
                            </div>
                            <TransformComponent 
                                wrapperStyle={{
                                    width: "100%",
                                    maxWidth: "100%",
                                    height: "100%"
                                }}
                            >
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <img 
                                        src={imageUrl !== "" ? imageUrl : "/placeholder.png"} 
                                        alt="Loading Schema Diagram..." 
                                        style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
                                    />
                                </div>
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>

            <div className="mt-4 text-sm text-gray-600">
                <p>Tips:</p>
                <ul className="list-disc pl-5">
                    <li>Use mouse wheel or pinch gesture to zoom</li>
                    <li>Click and drag to pan around the diagram</li>
                    <li>Use the controls above to zoom in/out or reset the view</li>
                </ul>
            </div>
        </div>
    </div>
)


}